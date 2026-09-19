import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';

export interface WeatherInfo {
  temperature_celsius: number;
  apparent_temperature_celsius: number;
  relative_humidity_percent: number;
  condition: string;
  is_day: boolean;
  senior_advice: string;
}

export interface MedicineSummary {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  purpose?: string;
}

export interface MorningBrief {
  greeting: string;
  date: string;
  weather: WeatherInfo;
  today_meds: MedicineSummary[];
  missed_doses: string[];
  appointments: string[];
  wellness_tip: string;
  safety_tip: string;
  generated_at: string;
}

interface MorningBriefCardProps {
  onNavigateToMeds?: () => void;
  initialBrief?: MorningBrief;
}

export const MorningBriefCard: React.FC<MorningBriefCardProps> = ({
  onNavigateToMeds,
  initialBrief,
}) => {
  const { token } = useAuth();
  const { highContrast } = useAccessibility();
  const { speak, stop, isSpeaking } = useSpeechSynthesis();

  const [brief, setBrief] = useState<MorningBrief | null>(initialBrief || null);
  const [loading, setLoading] = useState<boolean>(!initialBrief);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async (isRefresh: boolean = false) => {
    if (!token) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const endpoint = isRefresh ? '/api/morning-brief/refresh' : '/api/morning-brief';
      const method = isRefresh ? 'POST' : 'GET';
      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Could not fetch daily brief.');
      }
      const data: MorningBrief = await res.json();
      setBrief(data);
    } catch (err: any) {
      setError(err.message || 'Error loading morning brief');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialBrief && token) {
      fetchBrief(false);
    }
  }, [initialBrief, token, fetchBrief]);

  const handleReadAloud = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    if (!brief) return;

    const readText = `
      ${brief.greeting}.
      आज का मौसम: ${brief.weather.temperature_celsius} डिग्री सेल्सियस, ${brief.weather.condition}. ${brief.weather.senior_advice}.
      ${
        brief.missed_doses.length > 0
          ? `ध्यान दें: आपने कल कुछ दवाइयां छोड़ी थीं: ${brief.missed_doses.join(', ')}.`
          : ''
      }
      आज की दवाइयां: ${brief.today_meds.map((m) => `${m.name} ${m.dosage}`).join(', ')}.
      आज की सुरक्षा सलाह: ${brief.safety_tip}.
      स्वास्थ्य टिप: ${brief.wellness_tip}.
    `.trim();

    speak(readText, 'hi-IN');
  };

  if (loading) {
    return (
      <div
        className="w-full bg-cream-50 dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-800 rounded-3xl p-6 shadow-sm animate-pulse flex flex-col gap-4"
        aria-label="Loading Morning Brief"
      >
        <div className="h-8 bg-teal-100 dark:bg-slate-800 rounded-xl w-3/4"></div>
        <div className="h-20 bg-teal-50 dark:bg-slate-800/60 rounded-2xl"></div>
        <div className="h-12 bg-teal-100/50 dark:bg-slate-800/40 rounded-xl"></div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="w-full bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 rounded-3xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200">
            सुप्रभात! (Good Morning)
          </h3>
          <p className="text-base text-amber-800 dark:text-amber-300 mt-1">
            {error || 'Daily brief will appear shortly.'}
          </p>
        </div>
        <button
          onClick={() => fetchBrief(true)}
          className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl transition"
        >
          पुनः प्रयास करें (Retry)
        </button>
      </div>
    );
  }

  return (
    <section
      className={`w-full rounded-3xl p-6 sm:p-8 transition-all border-2 shadow-md ${
        highContrast
          ? 'bg-black text-white border-yellow-400'
          : 'bg-gradient-to-br from-amber-50/70 via-white to-teal-50/60 dark:from-slate-900 dark:to-slate-800 border-teal-200/80 dark:border-teal-900'
      }`}
      aria-label="Daily Morning Brief"
    >
      {/* Top Bar: Greeting + Audio Button + Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-100 dark:border-slate-800 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-100/60 dark:bg-teal-950/60 px-3 py-1 rounded-full">
            दैनिक साथी बुलेटिन (Daily Brief) • {brief.date}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {brief.greeting}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Read Aloud Button */}
          <button
            onClick={handleReadAloud}
            aria-label={isSpeaking ? 'Stop audio' : 'Listen to morning brief in Hindi'}
            className={`min-h-[48px] px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm transition transform active:scale-95 ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500'
            }`}
          >
            <span className="text-xl" aria-hidden="true">
              {isSpeaking ? '⏹️' : '🔊'}
            </span>
            <span className="text-base sm:text-lg">
              {isSpeaking ? 'रोकें (Stop)' : 'सुनें (Listen)'}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchBrief(true)}
            disabled={refreshing}
            aria-label="Refresh morning brief"
            className="min-h-[48px] min-w-[48px] p-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center disabled:opacity-50"
          >
            <span className={`text-xl ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true">
              🔄
            </span>
          </button>
        </div>
      </div>

      {/* Missed Doses Alert Banner (Workflow 1 connection) */}
      {brief.missed_doses.length > 0 && (
        <div
          role="alert"
          className="mt-5 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              ⚠️
            </span>
            <div>
              <p className="font-bold text-base sm:text-lg">
                दवाई छूटने की सूचना (Missed Dose Follow-up)
              </p>
              <p className="text-sm sm:text-base opacity-95">
                {brief.missed_doses.join(' • ')}
              </p>
            </div>
          </div>
          {onNavigateToMeds && (
            <button
              onClick={onNavigateToMeds}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm sm:text-base font-bold rounded-xl shadow-sm self-end sm:self-auto transition"
            >
              दवाएं देखें (View Meds)
            </button>
          )}
        </div>
      )}

      {/* Grid: Weather & Advice + Today's Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Weather & Health Advisory Card */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                आज का मौसम (Weather)
              </span>
              <span className="text-2xl" aria-hidden="true">
                {brief.weather.is_day ? '☀️' : '🌙'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {Math.round(brief.weather.temperature_celsius)}°C
              </span>
              <span className="text-base font-semibold text-teal-800 dark:text-teal-300">
                {brief.weather.condition}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              महसूस होता है (Feels like) {Math.round(brief.weather.apparent_temperature_celsius)}°C • नमी {brief.weather.relative_humidity_percent}%
            </p>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900">
            <p className="text-xs font-bold uppercase text-teal-800 dark:text-teal-300 mb-1">
              बुजुर्गों के लिए सलाह (Health Advisory)
            </p>
            <p className="text-sm sm:text-base text-teal-950 dark:text-teal-100">
              {brief.weather.senior_advice}
            </p>
          </div>
        </div>

        {/* Today's Medicines Overview */}
        <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                आज की दवाएं (Medicines Scheduled)
              </span>
              <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
                {brief.today_meds.length} दवाएं
              </span>
            </div>

            <div className="flex flex-col gap-2.5 mt-3">
              {brief.today_meds.map((med) => (
                <div
                  key={med.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {med.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {med.timing}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-teal-100/70 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-bold">
                    {med.dosage}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onNavigateToMeds && (
            <button
              onClick={onNavigateToMeds}
              className="mt-4 w-full py-2.5 rounded-xl border border-teal-600 text-teal-700 dark:text-teal-400 font-bold text-sm hover:bg-teal-50 dark:hover:bg-slate-700 transition"
            >
              दवा का शेड्यूल और ट्रैकर खोलें (Open Tracker) →
            </button>
          )}
        </div>
      </div>

      {/* Safety & Wellness Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <div className="p-4 rounded-2xl bg-saffron-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
          <p className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1">
            <span>🛡️</span> आज का फ्रॉड अलर्ट (Scam Alert)
          </p>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-snug">
            {brief.safety_tip}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60">
          <p className="text-xs font-bold uppercase text-teal-800 dark:text-teal-400 flex items-center gap-1.5 mb-1">
            <span>🌿</span> दैनिक स्वास्थ्य टिप (Wellness Tip)
          </p>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-snug">
            {brief.wellness_tip}
          </p>
        </div>
      </div>
    </section>
  );
};
