import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'saathi';
  text: string;
  sources?: Array<{ title: string; url: string }>;
  confirmationCard?: {
    requires_confirmation: boolean;
    action_type: string;
    action_payload: any;
    message: string;
  };
  confirmed?: boolean;
}

interface SaathiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const SaathiChatModal: React.FC<SaathiChatModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
}) => {
  const { token } = useAuth();
  const { language } = useAccessibility();

  const speechLang = language === 'hi' ? 'hi-IN' : 'en-IN';
  const { isListening, transcript, setTranscript, startListening, stopListening, isSupported: micSupported } =
    useSpeechRecognition(speechLang);
  const { speak, stop: stopSpeech, isSpeaking } = useSpeechSynthesis();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'saathi',
      text:
        language === 'hi'
          ? 'नमस्ते शर्मा जी! मैं आपका साथी हूँ। आप आज कैसा महसूस कर रहे हैं? आप बोलकर या लिखकर कुछ भी पूछ सकते हैं।'
          : 'Namaste! I am Saathi. How are you feeling today? You can speak or type to ask me anything.',
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Sync speech recognition transcript into input
  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  // Handle initial prompt if provided
  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || isStreaming) return;

    // Stop microphone if currently listening
    if (isListening) {
      stopListening();
    }
    setTranscript('');
    setInputMessage('');

    // Append user message
    const userMsgId = `msg_user_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, sender: 'user', text },
    ];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: 'default',
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Chat streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let saathiMsgId = `msg_saathi_${Date.now()}`;
      let accumulatedText = '';
      let incomingCard: any = null;
      let incomingSources: any = null;

      // Placeholder for streaming reply
      setMessages((prev) => [
        ...prev,
        { id: saathiMsgId, sender: 'saathi', text: '' },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'text') {
                accumulatedText += data.text;
                if (data.sources) {
                  incomingSources = data.sources;
                }
              } else if (data.type === 'confirmation_card') {
                incomingCard = data.card;
              }

              // Update the streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === saathiMsgId
                    ? {
                        ...m,
                        text: accumulatedText,
                        sources: incomingSources,
                        confirmationCard: incomingCard,
                      }
                    : m
                )
              );
            } catch {
              // ignore partial chunk json parse errors
            }
          }
        }
      }

      // Read aloud Saathi's reply automatically if text is present
      if (accumulatedText) {
        speak(accumulatedText, speechLang);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'saathi',
          text: 'क्षमा करें, संपर्क में समस्या आई। कृपया पुनः प्रयास करें।',
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleConfirmAction = async (msgId: string, card: any) => {
    try {
      const res = await fetch('/api/chat/confirm-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action_type: card.action_type,
          action_payload: card.action_payload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Mark message as confirmed and append success feedback
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, confirmed: true } : m))
        );
        speak(data.message, speechLang);
      }
    } catch (err) {
      console.error('Failed to confirm action:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
    >
      <div className="bg-cream-50 w-full max-w-2xl h-[90vh] max-h-[850px] rounded-3xl shadow-2xl flex flex-col border border-teal-deep/20 overflow-hidden">
        {/* Modal Header */}
        <header className="bg-teal-deep text-white px-5 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-saffron">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 id="chat-modal-title" className="text-xl sm:text-2xl font-bold">
                साथी AI (Saathi Companion)
              </h2>
              <p className="text-xs text-teal-light font-medium">
                {language === 'hi' ? 'बोलकर या लिखकर पूछें' : 'Voice & Text Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isSpeaking && (
              <button
                onClick={stopSpeech}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white"
                aria-label="Stop audio"
                title="Stop Audio"
              >
                <VolumeX className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={() => {
                stopSpeech();
                stopListening();
                onClose();
              }}
              className="touch-target p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close conversation"
            >
              <X className="w-7 h-7" />
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-3xl px-5 py-4 text-base sm:text-lg leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-teal-deep text-white rounded-br-none font-medium'
                      : 'bg-white text-gray-900 border border-teal-deep/10 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Read Aloud Button for Saathi */}
                  {!isUser && msg.text && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => speak(msg.text, speechLang)}
                        className="text-xs text-teal-deep flex items-center space-x-1 font-bold p-1 rounded hover:bg-teal-light/50"
                        aria-label="Read this message aloud"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>सुनें</span>
                      </button>
                    </div>
                  )}

                  {/* Grounding Source Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                      <p className="font-bold text-gray-600 mb-1 flex items-center space-x-1">
                        <span>विश्वसनीय स्रोत (Sources):</span>
                      </p>
                      <div className="space-y-1">
                        {msg.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-teal-deep hover:underline font-medium truncate"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{src.title || src.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmation Card for State Mutations */}
                  {msg.confirmationCard && (
                    <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-gray-900 space-y-3">
                      <div className="flex items-center space-x-2 text-amber-900 font-bold">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <span>पुष्टि कार्ड (Confirmation Required)</span>
                      </div>
                      <p className="text-sm font-semibold">{msg.confirmationCard.message}</p>

                      {msg.confirmed ? (
                        <div className="flex items-center space-x-2 text-green-700 font-bold text-sm bg-green-50 p-2 rounded-xl border border-green-200">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>स्वीकृत और सुरक्षित कर दिया गया! (Confirmed)</span>
                        </div>
                      ) : (
                        <div className="flex space-x-2 pt-1">
                          <button
                            onClick={() => handleConfirmAction(msg.id, msg.confirmationCard)}
                            className="flex-1 touch-target bg-teal-deep hover:bg-teal-dark text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>हाँ, सुरक्षित करें</span>
                          </button>
                          <button
                            onClick={() => {
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id ? { ...m, confirmationCard: undefined } : m
                                )
                              );
                            }}
                            className="touch-target bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>रद्द करें</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isStreaming && (
            <div className="flex items-center space-x-2 text-teal-deep font-semibold text-sm animate-pulse p-2">
              <Sparkles className="w-5 h-5" />
              <span>साथी सोच रहा है... (Saathi is answering...)</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Voice Controls */}
        <footer className="bg-white p-4 border-t border-teal-deep/10 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            {/* Big Mic Hero Button */}
            {micSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`touch-target p-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center ${
                  isListening
                    ? 'bg-red-600 text-white ring-4 ring-red-300 animate-pulse'
                    : 'bg-teal-light text-teal-deep hover:bg-teal-light/80'
                }`}
                aria-label={isListening ? 'बोलना बंद करें' : 'बोलकर पूछें'}
                title={isListening ? 'Stop Listening' : 'Speak'}
              >
                {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
            )}

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isListening
                  ? 'सुन रहा हूँ... बोलिए (Listening...)'
                  : language === 'hi'
                  ? 'यहाँ लिखें या माइक दबाएं...'
                  : 'Type here or press mic...'
              }
              className="flex-1 p-3.5 text-base sm:text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-deep focus:ring-0 outline-none transition-colors"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isStreaming}
              className="touch-target px-5 py-3.5 bg-saffron hover:bg-saffron-hover disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-md flex items-center justify-center transition-colors"
              aria-label="Send message"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>

          {isListening && (
            <p className="text-center text-xs font-bold text-red-600 animate-bounce">
              🎙️ आपकी आवाज़ सुनी जा रही है... बोलने के बाद माइक बटन दोबारा दबाएं या भेजें।
            </p>
          )}
        </footer>
      </div>
    </div>
  );
};
