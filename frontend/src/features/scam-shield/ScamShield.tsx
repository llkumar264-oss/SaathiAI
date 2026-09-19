import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ScamRecord {
  id: string;
  timestamp: string;
  message_text: string;
  risk_score: number;
  tier: string;
  signals: string[];
  explanation: string;
  family_alerted: boolean;
}

export const ScamShield: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScamRecord | null>(null);
  const [history, setHistory] = useState<ScamRecord[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/scam/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch scam history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleAnalyze = async (textToScan?: string) => {
    const text = (textToScan || inputText).trim();
    if (!text || isAnalyzing) return;

    setIsAnalyzing(true);
    setCurrentResult(null);
    setAlertSuccess(false);

    try {
      const res = await fetch('/api/scam/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message_text: text }),
      });

      if (!res.ok) throw new Error('Scam check failed');
      const data = await res.json();
      setCurrentResult(data);
      fetchHistory();
    } catch (err) {
      alert('संदेश की जांच करने में समस्या आई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAlertFamily = async (logId: string) => {
    setIsAlerting(true);
    try {
      const res = await fetch('/api/scam/alert-family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ log_id: logId }),
      });

      if (res.ok) {
        setAlertSuccess(true);
        if (currentResult && currentResult.id === logId) {
          setCurrentResult({ ...currentResult, family_alerted: true });
        }
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to alert family:', err);
    } finally {
      setIsAlerting(false);
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
          <ShieldAlert className="w-7 h-7 text-saffron" />
          <span>धोखाधड़ी कवच (Scam Shield)</span>
        </h2>
        <div className="w-10" />
      </div>

      {/* Main Scanner Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-senior border border-teal-deep/10 space-y-4">
        <div>
          <label htmlFor="scam-text-input" className="block text-lg font-extrabold text-teal-deep mb-2">
            संदेहास्पद मैसेज या WhatsApp संदेश यहाँ चिपकाएं (Paste):
          </label>
          <textarea
            id="scam-text-input"
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="जैसे: बिजली बिल कटने की धमकी, लॉटरी का संदेश, बैंक KYC अपडेट का लिंक आदि..."
            className="w-full p-4 border-2 border-gray-200 rounded-2xl text-base sm:text-lg focus:border-teal-deep focus:ring-0 outline-none leading-relaxed"
          />
        </div>

        {/* Preset Quick Examples for Senior Ease */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            उदाहरण जांचने के लिए दबाएं (Try Sample):
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const sample =
                  'Dear consumer, your electricity power will be disconnected TONIGHT at 9:30 PM due to pending bill. Call officer immediately at 9876543210.';
                setInputText(sample);
                handleAnalyze(sample);
              }}
              className="text-xs font-bold px-3 py-1.5 bg-cream-200 hover:bg-cream-300 text-teal-deep rounded-lg"
            >
              ⚡ बिजली बिल धमकी (Scam)
            </button>
            <button
              onClick={() => {
                const sample =
                  'State Bank of India: Your YONO account is suspended today due to pending PAN KYC. Click http://bit.ly/sbi-kyc to unblock.';
                setInputText(sample);
                handleAnalyze(sample);
              }}
              className="text-xs font-bold px-3 py-1.5 bg-cream-200 hover:bg-cream-300 text-teal-deep rounded-lg"
            >
              🏦 बैंक KYC फ़िशिंग (Scam)
            </button>
            <button
              onClick={() => {
                const sample =
                  'Hi Dad, I have transferred Rs 5,000 to your SBI account for monthly medicines. Love you!';
                setInputText(sample);
                handleAnalyze(sample);
              }}
              className="text-xs font-bold px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg"
            >
              🟢 सुरक्षित पारिवारिक संदेश (Safe)
            </button>
          </div>
        </div>

        <button
          onClick={() => handleAnalyze()}
          disabled={!inputText.trim() || isAnalyzing}
          className="w-full touch-target bg-teal-deep hover:bg-teal-dark disabled:bg-gray-300 text-white font-extrabold text-xl py-4 rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-[0.99]"
        >
          {isAnalyzing ? (
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 animate-spin" />
              <span>AI मॉडल जांच कर रहा है...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-6 h-6" />
              <span>संदेश की जांच करें (Check Safety)</span>
            </div>
          )}
        </button>
      </div>

      {/* Result Card */}
      {currentResult && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border-2 shadow-xl space-y-5 transition-all ${
            currentResult.risk_score >= 70
              ? 'bg-red-50 border-red-400 text-red-950'
              : currentResult.risk_score >= 35
              ? 'bg-yellow-50 border-yellow-400 text-yellow-950'
              : 'bg-green-50 border-green-400 text-green-950'
          }`}
        >
          {/* Header Gauge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
            <div className="flex items-center space-x-3">
              {currentResult.risk_score >= 70 ? (
                <ShieldAlert className="w-12 h-12 text-red-600 flex-shrink-0" />
              ) : currentResult.risk_score >= 35 ? (
                <AlertTriangle className="w-12 h-12 text-yellow-600 flex-shrink-0" />
              ) : (
                <ShieldCheck className="w-12 h-12 text-green-600 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-2xl font-black">{currentResult.tier}</h3>
                <p className="text-sm font-semibold opacity-80">
                  {currentResult.risk_score >= 70
                    ? 'अत्यधिक सावधान रहें! यह धोखाधड़ी का प्रयास है।'
                    : currentResult.risk_score >= 35
                    ? 'सतर्क रहें। इस संदेश की पुष्टि बिना किसी लिंक पर क्लिक न करें।'
                    : 'यह संदेश सुरक्षित प्रतीत होता है।'}
                </p>
              </div>
            </div>

            {/* Risk Gauge Metric */}
            <div className="flex items-center space-x-3 bg-white/70 px-4 py-3 rounded-2xl border border-black/5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider">जोखिम स्कोर</span>
              <span className="text-3xl font-black">
                {currentResult.risk_score}
                <span className="text-sm font-bold opacity-60">/100</span>
              </span>
            </div>
          </div>

          {/* Explanation in <= 3 Simple Sentences */}
          <div className="bg-white/80 p-5 rounded-2xl border border-black/5 space-y-2">
            <h4 className="font-extrabold text-base flex items-center space-x-1.5">
              <Sparkles className="w-5 h-5 text-saffron" />
              <span>साथी की सरल सलाह (Explanation):</span>
            </h4>
            <p className="text-base sm:text-lg leading-relaxed font-medium">
              {currentResult.explanation}
            </p>
          </div>

          {/* Key Signals */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">
              पहचाने गए मुख्य संकेत (Fraud Signals):
            </span>
            <div className="flex flex-wrap gap-2">
              {currentResult.signals.map((sig, idx) => (
                <span
                  key={idx}
                  className="bg-white/90 font-bold text-xs px-3 py-1.5 rounded-xl border border-black/10 shadow-sm"
                >
                  ⚠️ {sig}
                </span>
              ))}
            </div>
          </div>

          {/* 1-Tap "Tell My Family" Button */}
          {currentResult.risk_score >= 35 && (
            <div className="pt-2">
              {alertSuccess || currentResult.family_alerted ? (
                <div className="p-4 bg-green-100 border border-green-300 rounded-2xl flex items-center space-x-2 text-green-900 font-extrabold">
                  <CheckCircle2 className="w-6 h-6 text-green-700" />
                  <span>परिवार को तुरंत सूचित कर दिया गया है! वे आपकी सुरक्षा के लिए सतर्क हैं।</span>
                </div>
              ) : (
                <button
                  onClick={() => handleAlertFamily(currentResult.id)}
                  disabled={isAlerting}
                  className="w-full touch-target bg-red-600 hover:bg-red-700 text-white font-extrabold text-lg py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-[0.99]"
                >
                  <Users className="w-6 h-6" />
                  <span>
                    {isAlerting
                      ? 'परिवार को संदेश भेजा जा रहा है...'
                      : 'परिवार को सूचित करें (Tell My Family in 1-Tap)'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Safety History */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-teal-deep flex items-center space-x-2">
          <Clock className="w-6 h-6 text-saffron" />
          <span>सुरक्षा जांच इतिहास (Safety History)</span>
        </h3>

        {history.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl text-center text-gray-500 font-medium border border-dashed border-gray-300">
            अभी तक कोई संदेश जांचा नहीं गया है।
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl shadow-senior border border-teal-deep/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                        item.risk_score >= 70
                          ? 'bg-red-100 text-red-800'
                          : item.risk_score >= 35
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.tier}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    {item.family_alerted && (
                      <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                        परिवार सूचित
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">
                    {item.message_text}
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xl font-black text-gray-700">
                    {item.risk_score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
