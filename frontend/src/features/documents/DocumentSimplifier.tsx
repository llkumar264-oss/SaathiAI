import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Upload,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Send,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ImportantNumber {
  label: string;
  value: string;
}

interface Deadline {
  title: string;
  due_date: string;
  converted_to_reminder: boolean;
}

interface DocumentSections {
  summary: string;
  important_numbers: ImportantNumber[];
  deadlines: Deadline[];
  next_steps: string[];
}

export interface DocumentItem {
  id: string;
  title: string;
  doc_type: string;
  uploaded_at: string;
  sections: DocumentSections;
}

export const DocumentSimplifier: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Follow-up Q&A state
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0 && !selectedDoc) {
          setSelectedDoc(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Document upload failed');
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      setSelectedDoc(newDoc);
      setQaHistory([]);
    } catch (err) {
      alert('दस्तावेज़ पढ़ने में समस्या आई। कृपया साफ़ फोटो या PDF अपलोड करें।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConvertReminder = async (docId: string, deadline: Deadline) => {
    try {
      const res = await fetch(`/api/documents/${docId}/remind-deadline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deadline_title: deadline.title,
          due_date: deadline.due_date,
        }),
      });

      if (res.ok) {
        // Update local state
        if (selectedDoc) {
          const updatedDeadlines = selectedDoc.sections.deadlines.map((dl) =>
            dl.due_date === deadline.due_date ? { ...dl, converted_to_reminder: true } : dl
          );
          setSelectedDoc({
            ...selectedDoc,
            sections: { ...selectedDoc.sections, deadlines: updatedDeadlines },
          });
        }
        alert(`रिमाइंडर सेट हो गया! अंतिम तारीख (${deadline.due_date}) से पहले आपको सूचित किया जाएगा।`);
      }
    } catch (err) {
      console.error('Failed to convert reminder:', err);
    }
  };

  const handleAskQuestion = async (presetQ?: string) => {
    const queryText = (presetQ || question).trim();
    if (!queryText || !selectedDoc || isAsking) return;

    setIsAsking(true);
    setQuestion('');

    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: queryText }),
      });

      if (res.ok) {
        const data = await res.json();
        setQaHistory((prev) => [...prev, { q: queryText, a: data.answer }]);
      }
    } catch (err) {
      console.error('Q&A error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="touch-target flex items-center space-x-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-teal-deep font-bold hover:bg-gray-50 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <h2 className="text-2xl font-bold text-teal-deep flex items-center space-x-2">
          <FileText className="w-7 h-7 text-saffron" />
          <span>दस्तावेज़ सरल करें (Document Simplifier)</span>
        </h2>
        <div className="w-10" />
      </div>

      {/* Upload Hero Card */}
      <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-xl font-extrabold text-teal-deep">
            बिजली बिल, बैंक पत्र या सरकारी नोटिस अपलोड करें
          </h3>
          <p className="text-sm text-gray-600">
            कठिन दस्तावेज़ का 3-लाइन सार, ज़रूरी तारीखें और आगे क्या करना है तुरंत समझें।
          </p>
        </div>

        <label className="touch-target bg-saffron hover:bg-saffron-hover text-white font-extrabold text-lg px-6 py-3.5 rounded-2xl shadow-md cursor-pointer flex items-center space-x-2 flex-shrink-0 transition-transform active:scale-95">
          <Upload className="w-6 h-6" />
          <span>{isUploading ? 'पढ़ा जा रहा है...' : 'फोटो / PDF चुनें'}</span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {isUploading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-center text-yellow-900 font-bold animate-pulse">
          📄 AI दस्तावेज़ का विश्लेषण कर रहा है... कृपया कुछ सेकंड रुकें।
        </div>
      )}

      {/* Documents Selector Tabs */}
      {documents.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setSelectedDoc(doc);
                setQaHistory([]);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
                selectedDoc?.id === doc.id
                  ? 'bg-teal-deep text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {doc.title}
            </button>
          ))}
        </div>
      )}

      {/* 4 Fixed Sections Display */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500 font-medium">दस्तावेज़ लोड हो रहे हैं...</div>
      ) : selectedDoc ? (
        <div className="space-y-5">
          {/* Section 1: Summary */}
          <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 space-y-2">
            <div className="flex items-center space-x-2 text-teal-deep font-extrabold text-xl">
              <Sparkles className="w-6 h-6 text-saffron" />
              <span>1. मुख्य सार (Summary)</span>
            </div>
            <p className="text-base sm:text-lg text-gray-800 leading-relaxed font-medium bg-cream-50 p-4 rounded-2xl border border-cream-200">
              {selectedDoc.sections.summary}
            </p>
          </div>

          {/* Section 2: Important Numbers */}
          <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 space-y-3">
            <div className="flex items-center space-x-2 text-teal-deep font-extrabold text-xl">
              <Hash className="w-6 h-6 text-saffron" />
              <span>2. ज़रूरी नंबर व राशियां (Important Numbers)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedDoc.sections.important_numbers.map((num, i) => (
                <div key={i} className="p-4 bg-teal-light/40 border border-teal-border/30 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 block">{num.label}</span>
                  <span className="text-xl font-black text-teal-deep mt-1 block">{num.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Deadlines with 1-Tap Reminder */}
          <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 space-y-3">
            <div className="flex items-center space-x-2 text-teal-deep font-extrabold text-xl">
              <Calendar className="w-6 h-6 text-saffron" />
              <span>3. अंतिम तारीखें (Deadlines)</span>
            </div>
            <div className="space-y-2">
              {selectedDoc.sections.deadlines.map((dl, i) => (
                <div
                  key={i}
                  className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-base font-extrabold text-red-950 block">{dl.title}</span>
                    <span className="text-sm font-black text-red-700 flex items-center space-x-1.5 mt-1">
                      <Clock className="w-4 h-4" />
                      <span>तारीख: {dl.due_date}</span>
                    </span>
                  </div>

                  {dl.converted_to_reminder ? (
                    <div className="flex items-center space-x-1.5 text-green-700 font-extrabold text-sm bg-white px-3 py-2 rounded-xl border border-green-300">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>रिमाइंडर सेट है (Reminder Active)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConvertReminder(selectedDoc.id, dl)}
                      className="touch-target bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-sm flex items-center space-x-1.5 flex-shrink-0"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>रिमाइंडर लगाएं (1-Tap Reminder)</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Next Steps */}
          <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 space-y-3">
            <div className="flex items-center space-x-2 text-teal-deep font-extrabold text-xl">
              <CheckCircle className="w-6 h-6 text-saffron" />
              <span>4. आगे क्या करें (Next Steps)</span>
            </div>
            <div className="space-y-2">
              {selectedDoc.sections.next_steps.map((step, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="w-6 h-6 rounded-full bg-teal-deep text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-base font-semibold text-gray-800 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Q&A grounded on this document */}
          <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 space-y-4">
            <div className="flex items-center space-x-2 text-teal-deep font-extrabold text-xl">
              <HelpCircle className="w-6 h-6 text-saffron" />
              <span>दस्तावेज़ से जुड़े प्रश्न पूछें (Follow-up Q&A)</span>
            </div>
            <p className="text-sm text-gray-600">
              इस बिल या दस्तावेज़ के बारे में कुछ भी पूछें, जैसे लेट फीस, भुगतान का तरीका आदि।
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAskQuestion('अगर मैं देर से भरूँ तो क्या लेट फीस लगेगी?')}
                className="text-xs font-bold px-3 py-1.5 bg-cream-200 hover:bg-cream-300 text-teal-deep rounded-lg"
              >
                ❓ लेट फीस (Late Fee) कितनी लगेगी?
              </button>
              <button
                onClick={() => handleAskQuestion('मैं इस बिल का भुगतान घर बैठे कैसे करूँ?')}
                className="text-xs font-bold px-3 py-1.5 bg-cream-200 hover:bg-cream-300 text-teal-deep rounded-lg"
              >
                ❓ घर बैठे भुगतान कैसे करें?
              </button>
            </div>

            {/* QA Thread */}
            {qaHistory.length > 0 && (
              <div className="space-y-3 pt-2">
                {qaHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 bg-cream-50 p-4 rounded-2xl border border-cream-200">
                    <p className="font-bold text-sm text-teal-deep">प्रश्न: {item.q}</p>
                    <p className="text-base font-semibold text-gray-800 leading-relaxed">
                      साथी: {item.a}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Ask Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex items-center space-x-2 pt-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="दस्तावेज़ के बारे में सवाल लिखें..."
                className="flex-1 p-3.5 border-2 border-gray-200 rounded-2xl focus:border-teal-deep outline-none text-base font-medium"
              />
              <button
                type="submit"
                disabled={!question.trim() || isAsking}
                className="touch-target px-5 py-3.5 bg-teal-deep hover:bg-teal-dark disabled:bg-gray-300 text-white font-bold rounded-2xl shadow-md flex items-center justify-center transition-colors"
                aria-label="Ask question"
              >
                {isAsking ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl text-center border border-dashed border-gray-300 space-y-2">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="text-lg font-bold text-gray-700">अभी कोई दस्तावेज़ नहीं है</p>
          <p className="text-sm text-gray-500">ऊपर दिए गए बटन से बिल या पत्र की फोटो अपलोड करें।</p>
        </div>
      )}
    </div>
  );
};
