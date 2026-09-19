import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export type VitalTier = 'Normal' | 'Elevated' | 'High' | 'Urgent';
export type SugarContext = 'fasting' | 'post_meal' | 'random';

export interface VitalEntry {
  id: string;
  timestamp: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  blood_sugar?: number;
  sugar_context: SugarContext;
  weight_kg?: number;
  tier: VitalTier;
  bp_tier?: VitalTier;
  sugar_tier?: VitalTier;
  jnc8_target_met: boolean;
  is_anomaly: boolean;
  anomaly_reason?: string;
  advisory: string;
  urgent: boolean;
  notes?: string;
}

export interface VitalsSummary {
  total_readings: number;
  latest_reading?: VitalEntry;
  avg_systolic?: number;
  avg_diastolic?: number;
  avg_pulse?: number;
  avg_sugar?: number;
  urgent_count: number;
  anomalies_count: number;
  readings: VitalEntry[];
}

interface HealthTrackerProps {
  onBack?: () => void;
  initialVitals?: VitalEntry[];
}

export const HealthTracker: React.FC<HealthTrackerProps> = ({
  onBack,
  initialVitals,
}) => {
  const { token } = useAuth();
  const { highContrast } = useAccessibility();
  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition();

  const [vitals, setVitals] = useState<VitalEntry[]>(initialVitals || []);
  const [loading, setLoading] = useState<boolean>(!initialVitals);
  const [daysFilter, setDaysFilter] = useState<number>(14);

  // Form State
  const [systolic, setSystolic] = useState<string>('');
  const [diastolic, setDiastolic] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
  const [sugar, setSugar] = useState<string>('');
  const [sugarContext, setSugarContext] = useState<SugarContext>('fasting');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVitals = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/vitals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load vitals history.');
      const data: VitalEntry[] = await res.json();
      setVitals(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialVitals && token) {
      fetchVitals();
    }
  }, [initialVitals, token, fetchVitals]);

  // When speech transcript updates, parse voice vitals
  useEffect(() => {
    if (!transcript) return;

    const parseSpokenText = async () => {
      try {
        const res = await fetch('/api/vitals/parse-voice', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voice_text: transcript }),
        });
        if (res.ok) {
          const parsed = await res.json();
          if (parsed.systolic) setSystolic(String(parsed.systolic));
          if (parsed.diastolic) setDiastolic(String(parsed.diastolic));
          if (parsed.pulse) setPulse(String(parsed.pulse));
          if (parsed.blood_sugar) setSugar(String(parsed.blood_sugar));
          if (parsed.sugar_context) setSugarContext(parsed.sugar_context);
          setFormMsg({
            type: 'success',
            text: 'आवाज़ से दर्ज हुआ! कृपया जांचकर पुष्टि करें (Filled via voice, please review).',
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    parseSpokenText();
  }, [transcript, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systolic && !diastolic && !sugar && !pulse) {
      setFormMsg({
        type: 'error',
        text: 'कृपया कम से कम एक मान (BP, शुगर या नब्ज) भरें (Please provide at least one vital sign).',
      });
      return;
    }

    try {
      setSubmitting(true);
      setFormMsg(null);
      const payload = {
        systolic: systolic ? parseInt(systolic, 10) : undefined,
        diastolic: diastolic ? parseInt(diastolic, 10) : undefined,
        pulse: pulse ? parseInt(pulse, 10) : undefined,
        blood_sugar: sugar ? parseFloat(sugar) : undefined,
        sugar_context: sugarContext,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/vitals', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to record vitals.');
      const newEntry: VitalEntry = await res.json();

      setVitals((prev) => [newEntry, ...prev]);
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setSugar('');
      setNotes('');
      setTranscript('');
      setFormMsg({
        type: 'success',
        text: newEntry.urgent
          ? '⚠️ तत्काल ध्यान दें: मान अत्यधिक है। डॉक्टर से संपर्क करें।'
          : 'रीडिंग सफलतापूर्वक दर्ज हो गई (Reading saved successfully)!',
      });
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Error saving reading' });
    } finally {
      setSubmitting(false);
    }
  };

  // Latest reading
  const latest = vitals[0];

  // Chart data sorted chronologically
  const chartData = [...vitals]
    .slice(0, daysFilter * 2)
    .reverse()
    .map((v) => {
      const d = new Date(v.timestamp);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return {
        timestamp: label,
        systolic: v.systolic || null,
        diastolic: v.diastolic || null,
        pulse: v.pulse || null,
        sugar: v.blood_sugar || null,
        tier: v.tier,
      };
    });

  const getTierColor = (tier: VitalTier) => {
    switch (tier) {
      case 'Urgent':
        return 'bg-red-600 text-white';
      case 'High':
        return 'bg-amber-600 text-white';
      case 'Elevated':
        return 'bg-yellow-500 text-slate-900';
      case 'Normal':
      default:
        return 'bg-emerald-600 text-white';
    }
  };

  return (
    <div
      className={`w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6 ${
        highContrast ? 'text-white' : 'text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-100 dark:border-slate-800 pb-4">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-base text-teal-700 dark:text-teal-400 font-bold mb-1 flex items-center gap-1 hover:underline"
            >
              ← वापस डैशबोर्ड (Back)
            </button>
          )}
          <h1 className="text-3xl sm:text-4xl font-black">
            स्वास्थ्य एवं वाइटल्स ट्रैकर (Health & Vitals)
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            ब्लड प्रेशर (BP), ब्लड शुगर और नब्ज़ का सुरक्षित रिकॉर्ड • JNC-8 वरिष्ठ दिशानिर्देश
          </p>
        </div>

        {/* Emergency Call Quick Access */}
        <a
          href="tel:112"
          className="min-h-[48px] px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-md transition transform active:scale-95"
        >
          <span>🚨</span> 112 आपातकालीन कॉल (Call 112)
        </a>
      </div>

      {/* Urgent Warning Banner (If latest reading is Urgent) */}
      {latest && latest.urgent && (
        <div
          role="alert"
          className="p-5 rounded-3xl bg-red-600/15 border-3 border-red-600 text-red-950 dark:text-red-200 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <span className="text-4xl" aria-hidden="true">
              ⚠️
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-400">
                चेतावनी: तत्काल चिकित्सकीय ध्यान आवश्यक (Urgent Advisory)
              </h2>
              <p className="text-base sm:text-lg font-bold mt-1">
                {latest.advisory}
              </p>
              <p className="text-sm opacity-90 mt-0.5">
                Systolic &ge; 180 mmHg, Diastolic &ge; 120 mmHg, या शुगर &lt; 70 या &gt; 300 mg/dL।
              </p>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-lg rounded-2xl shadow-lg shrink-0"
          >
            तुरंत 112 कॉल करें
          </a>
        </div>
      )}

      {/* Overview Cards: Latest BP, Glucose, Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Blood Pressure Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                रक्तचाप (Blood Pressure)
              </span>
              {latest?.bp_tier && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-black ${getTierColor(
                    latest.bp_tier
                  )}`}
                >
                  {latest.bp_tier}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {latest?.systolic ? `${latest.systolic}/${latest.diastolic}` : '--/--'}
              </span>
              <span className="text-sm text-slate-500 font-bold">mmHg</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                latest?.jnc8_target_met
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {latest?.jnc8_target_met
                ? '✓ JNC-8 60+ लक्ष्य (<150/90) में'
                : '⚠️ JNC-8 60+ लक्ष्य से ऊपर'}
            </span>
          </div>
        </div>

        {/* Blood Glucose Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                ब्लड शुगर (Blood Glucose)
              </span>
              {latest?.sugar_tier && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-black ${getTierColor(
                    latest.sugar_tier
                  )}`}
                >
                  {latest.sugar_tier}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {latest?.blood_sugar ? latest.blood_sugar : '--'}
              </span>
              <span className="text-sm text-slate-500 font-bold">mg/dL</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 capitalize font-medium">
              स्थिति: {latest?.sugar_context === 'fasting' ? 'खाली पेट (Fasting)' : 'खाने के बाद'}
            </span>
          </div>
        </div>

        {/* Pulse Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                नब्ज़ / धड़कन (Pulse)
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-black bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                सामान्य (60-100)
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {latest?.pulse ? latest.pulse : '--'}
              </span>
              <span className="text-sm text-slate-500 font-bold">bpm</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 font-medium">
              कुल रिकॉर्ड्स: {vitals.length}
            </span>
          </div>
        </div>
      </div>

      {/* Add New Reading Form (Voice + 1-Tap Numeric) */}
      <section
        className="p-6 rounded-3xl bg-teal-50/60 dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-900 shadow-sm"
        aria-label="Record New Health Reading"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              नया स्वास्थ्य रिकॉर्ड दर्ज करें (Record Vitals)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              बोलकर या लिखकर आसानी से दर्ज करें।
            </p>
          </div>

          {/* Voice Input Button */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`min-h-[48px] px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm transition ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {isListening ? '🛑' : '🎙️'}
              </span>
              <span>{isListening ? 'सुन रहे हैं... (Listening)' : 'बोलकर दर्ज करें (Speak Vitals)'}</span>
            </button>
          )}
        </div>

        {formMsg && (
          <div
            className={`p-3.5 mb-4 rounded-xl text-base font-bold ${
              formMsg.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            {formMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Systolic */}
          <div>
            <label htmlFor="sys-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              ऊपर का BP (Systolic)
            </label>
            <input
              id="sys-input"
              type="number"
              placeholder="उदा. 130"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              className="w-full min-h-[48px] p-3 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Diastolic */}
          <div>
            <label htmlFor="dia-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              नीचे का BP (Diastolic)
            </label>
            <input
              id="dia-input"
              type="number"
              placeholder="उदा. 85"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              className="w-full min-h-[48px] p-3 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Blood Sugar */}
          <div>
            <label htmlFor="sugar-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              ब्लड शुगर (mg/dL)
            </label>
            <input
              id="sugar-input"
              type="number"
              placeholder="उदा. 110"
              value={sugar}
              onChange={(e) => setSugar(e.target.value)}
              className="w-full min-h-[48px] p-3 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Sugar Context */}
          <div>
            <label htmlFor="sugar-context" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              शुगर का समय
            </label>
            <select
              id="sugar-context"
              value={sugarContext}
              onChange={(e) => setSugarContext(e.target.value as SugarContext)}
              className="w-full min-h-[48px] p-3 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="fasting">खाली पेट (Fasting)</option>
              <option value="post_meal">खाने के बाद (Post Meal)</option>
              <option value="random">कभी भी (Random)</option>
            </select>
          </div>

          {/* Pulse */}
          <div>
            <label htmlFor="pulse-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              नब्ज़ / धड़कन (Pulse)
            </label>
            <input
              id="pulse-input"
              type="number"
              placeholder="उदा. 75"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              className="w-full min-h-[48px] p-3 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label htmlFor="notes-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              कोई लक्षण या नोट (Notes / Symptoms)
            </label>
            <input
              id="notes-input"
              type="text"
              placeholder="उदा. सुबह की सैर के बाद"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[48px] p-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] py-3 bg-teal-700 hover:bg-teal-800 text-white text-lg font-bold rounded-xl shadow transition transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'सहेज रहे हैं...' : 'दर्ज करें (Save)'}
            </button>
          </div>
        </form>
      </section>

      {/* Visual Charts: 14 / 30 Day Trends */}
      <section
        className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm"
        aria-label="Health Charts"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              रक्तचाप का रुझान (Blood Pressure Trend)
            </h2>
            <p className="text-sm text-slate-500">
              हरी रेखा = 120 (सामान्य), लाल बिंदीदार = 150 (JNC-8 वरिष्ठ सीमा)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDaysFilter(7)}
              className={`px-3 py-1.5 rounded-xl font-bold text-sm ${
                daysFilter === 7
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              7 दिन
            </button>
            <button
              onClick={() => setDaysFilter(14)}
              className={`px-3 py-1.5 rounded-xl font-bold text-sm ${
                daysFilter === 14
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              14 दिन
            </button>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="timestamp" stroke="#94a3b8" />
              <YAxis domain={[60, 200]} stroke="#94a3b8" />
              <Tooltip />
              <ReferenceLine y={120} stroke="#10b981" strokeDasharray="3 3" label="Normal 120" />
              <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 4" label="JNC-8 Target 150" />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#0d9488"
                strokeWidth={3}
                name="Systolic (ऊपर)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke="#6366f1"
                strokeWidth={2}
                name="Diastolic (नीचे)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* History Log with ML Anomaly Alerts */}
      <section
        className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm"
        aria-label="Vitals History"
      >
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
          हाल के रिकॉर्ड्स (Recent History)
        </h2>

        {loading ? (
          <p className="text-base text-slate-500">लोड हो रहा है...</p>
        ) : vitals.length === 0 ? (
          <p className="text-base text-slate-500">कोई रिकॉर्ड उपलब्ध नहीं है। ऊपर से जोड़ें।</p>
        ) : (
          <div className="flex flex-col gap-3">
            {vitals.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.urgent
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400'
                    : item.is_anomaly
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">
                      {new Date(item.timestamp).toLocaleString('hi-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-black ${getTierColor(item.tier)}`}>
                      {item.tier}
                    </span>
                    {item.is_anomaly && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-black bg-amber-500 text-white">
                        🔍 असामान्य पैटर्न (Anomaly)
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-4 mt-2">
                    {item.systolic && item.diastolic && (
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        BP: {item.systolic}/{item.diastolic} mmHg
                      </span>
                    )}
                    {item.blood_sugar && (
                      <span className="text-lg font-black text-teal-800 dark:text-teal-300">
                        शुगर: {item.blood_sugar} mg/dL ({item.sugar_context})
                      </span>
                    )}
                    {item.pulse && (
                      <span className="text-base font-bold text-slate-600 dark:text-slate-300">
                        नब्ज़: {item.pulse} bpm
                      </span>
                    )}
                  </div>

                  {item.anomaly_reason && (
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mt-1">
                      {item.anomaly_reason}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      नोट: {item.notes}
                    </p>
                  )}
                </div>

                {item.urgent && (
                  <a
                    href="tel:112"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl shadow self-start sm:self-center"
                  >
                    112 कॉल करें
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Medical Disclaimer */}
      <footer className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
        ⚠️ <strong>अस्वीकरण (Medical Disclaimer):</strong> साथी (SaathiAI) केवल एक दैनिक सहायक और रिकॉर्ड-कीपर है, यह डॉक्टर या चिकित्सा संस्थान का विकल्प नहीं है। किसी भी आपातकाल में तुरंत 112 पर कॉल करें अथवा अपने पंजीकृत चिकित्सक (Doctor) से परामर्श लें।
      </footer>
    </div>
  );
};
