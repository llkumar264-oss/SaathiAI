import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';

export interface TutorialStep {
  step_number: number;
  title: string;
  description: string;
  tip?: string;
  icon?: string;
  warning?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  category: string;
  target_app: string;
  difficulty: string;
  total_steps: number;
  steps: TutorialStep[];
  language: string;
}

export interface TutorialSummary {
  id: string;
  title: string;
  category: string;
  target_app: string;
  difficulty: string;
  total_steps: number;
  language: string;
}

interface TechTutorProps {
  onBack?: () => void;
  initialTutorialId?: string;
}

export const TechTutor: React.FC<TechTutorProps> = ({
  onBack,
  initialTutorialId,
}) => {
  const { token } = useAuth();
  const { highContrast } = useAccessibility();
  const { speak, stop, isSpeaking } = useSpeechSynthesis();

  const [catalog, setCatalog] = useState<TutorialSummary[]>([]);
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Custom Topic Generation State
  const [customTopic, setCustomTopic] = useState<string>('');
  const [generatingCustom, setGeneratingCustom] = useState<boolean>(false);

  // 'I am stuck' Drawer State
  const [stuckOpen, setStuckOpen] = useState<boolean>(false);
  const [stuckQuestion, setStuckQuestion] = useState<string>('');
  const [stuckLoading, setStuckLoading] = useState<boolean>(false);
  const [stuckResponse, setStuckResponse] = useState<{
    answer: string;
    reassuring_note: string;
  } | null>(null);

  // Load catalog
  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/tutor/tutorials', { headers });
      if (!res.ok) throw new Error('Failed to load tutorials');
      const data: TutorialSummary[] = await res.json();
      setCatalog(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load specific tutorial
  const loadTutorial = async (tutorialId: string) => {
    try {
      setLoading(true);
      stop();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/tutor/tutorials/${tutorialId}`, { headers });
      if (!res.ok) throw new Error('Tutorial not found');
      const data: Tutorial = await res.json();
      setActiveTutorial(data);
      setCurrentStepIndex(0);
      setStuckOpen(false);
      setStuckResponse(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    if (initialTutorialId) {
      loadTutorial(initialTutorialId);
    }
  }, [initialTutorialId]);

  // Read current step aloud
  const handleReadStep = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    if (!activeTutorial) return;
    const step = activeTutorial.steps[currentStepIndex];
    const textToSpeak = `कदम ${step.step_number}: ${step.title}. ${step.description}. ${
      step.warning ? `सावधानी: ${step.warning}` : ''
    } ${step.tip ? `सुझाव: ${step.tip}` : ''}`;
    speak(textToSpeak, 'hi-IN');
  };

  // Ask stuck help
  const handleAskStuck = async (customQ?: string) => {
    if (!activeTutorial) return;
    const q = customQ || stuckQuestion || 'मुझे इस स्क्रीन पर समझ नहीं आ रहा कि आगे क्या दबाना है।';
    try {
      setStuckLoading(true);
      setStuckResponse(null);
      const res = await fetch('/api/tutor/ask-help', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorial_id: activeTutorial.id,
          step_number: currentStepIndex + 1,
          question: q,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStuckResponse(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStuckLoading(false);
    }
  };

  // Generate dynamic tutorial
  const handleGenerateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || !token) return;
    try {
      setGeneratingCustom(true);
      const res = await fetch('/api/tutor/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: customTopic.trim(), language: 'hi' }),
      });
      if (res.ok) {
        const newTut: Tutorial = await res.json();
        setActiveTutorial(newTut);
        setCurrentStepIndex(0);
        setCustomTopic('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCustom(false);
    }
  };

  // Filtered Catalog
  const filteredCatalog =
    activeCategory === 'all'
      ? catalog
      : catalog.filter((t) => t.category === activeCategory);

  // -------------------------------------------------------------
  // VIEW: Active Single-Step Reader
  // -------------------------------------------------------------
  if (activeTutorial) {
    const currentStep = activeTutorial.steps[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === activeTutorial.steps.length - 1;
    const progressPercent = Math.round(
      ((currentStepIndex + 1) / activeTutorial.steps.length) * 100
    );

    return (
      <div
        className={`w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6 ${
          highContrast ? 'text-white' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {/* Top Bar: Back to catalog + App Name */}
        <div className="flex items-center justify-between gap-4 border-b border-teal-100 dark:border-slate-800 pb-4">
          <button
            onClick={() => {
              stop();
              setActiveTutorial(null);
            }}
            className="text-base text-teal-700 dark:text-teal-400 font-bold flex items-center gap-1 hover:underline min-h-[44px]"
          >
            ← सभी मार्गदर्शक (All Guides)
          </button>
          <span className="text-xs sm:text-sm font-bold px-3 py-1 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 rounded-full">
            {activeTutorial.target_app}
          </span>
        </div>

        {/* Title and Progress Bar */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">{activeTutorial.title}</h1>
          <div className="mt-4 flex items-center justify-between text-sm font-bold text-slate-500 mb-1">
            <span>
              कदम {currentStepIndex + 1} / {activeTutorial.steps.length} (Step {currentStepIndex + 1} of {activeTutorial.steps.length})
            </span>
            <span>{progressPercent}% पूर्ण</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* The Big Single-Step Card */}
        <article
          className={`p-6 sm:p-8 rounded-3xl border-2 shadow-lg flex flex-col gap-5 ${
            highContrast
              ? 'bg-black border-yellow-400'
              : 'bg-white dark:bg-slate-900 border-teal-200 dark:border-teal-900'
          }`}
          aria-label={`Step ${currentStep.step_number}: ${currentStep.title}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl" aria-hidden="true">
                {currentStep.icon || '📱'}
              </span>
              <div>
                <span className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400 tracking-wider">
                  चरण {currentStep.step_number}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {currentStep.title}
                </h2>
              </div>
            </div>

            {/* Read Step Audio Button */}
            <button
              onClick={handleReadStep}
              aria-label={isSpeaking ? 'Stop reading' : 'Read step aloud'}
              className={`min-h-[48px] px-4 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition ${
                isSpeaking
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
              }`}
            >
              <span className="text-xl">{isSpeaking ? '⏹️' : '🔊'}</span>
              <span className="text-sm sm:text-base">{isSpeaking ? 'रोकें' : 'सुनें'}</span>
            </button>
          </div>

          {/* Step Description */}
          <p className="text-lg sm:text-2xl font-medium leading-relaxed text-slate-800 dark:text-slate-100 mt-2">
            {currentStep.description}
          </p>

          {/* Sensitive Step Warning Box */}
          {currentStep.warning && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-950 dark:text-amber-200 font-bold text-base sm:text-lg flex items-start gap-3"
            >
              <span className="text-2xl shrink-0" aria-hidden="true">
                ⚠️
              </span>
              <p>{currentStep.warning}</p>
            </div>
          )}

          {/* Helpful Tip Box */}
          {currentStep.tip && (
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-teal-950 dark:text-teal-100 text-base flex items-start gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">
                💡
              </span>
              <p>
                <strong>सुझाव (Tip):</strong> {currentStep.tip}
              </p>
            </div>
          )}

          {/* Navigation Controls: Back, Next, Stuck */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 mt-4">
            {/* Stuck Button */}
            <button
              onClick={() => {
                setStuckOpen(!stuckOpen);
                if (!stuckResponse && !stuckOpen) {
                  handleAskStuck();
                }
              }}
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-2xl font-bold border-2 border-amber-500 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-center gap-2 transition"
            >
              <span>🤝</span>
              <span>मैं यहाँ अटक गया/गई हूँ (I'm Stuck)</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isFirstStep && (
                <button
                  onClick={() => {
                    stop();
                    setCurrentStepIndex(currentStepIndex - 1);
                    setStuckOpen(false);
                  }}
                  className="flex-1 sm:flex-none min-h-[52px] px-6 py-3 rounded-2xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg transition"
                >
                  ← पिछला (Back)
                </button>
              )}

              {!isLastStep ? (
                <button
                  onClick={() => {
                    stop();
                    setCurrentStepIndex(currentStepIndex + 1);
                    setStuckOpen(false);
                  }}
                  className="flex-1 sm:flex-none min-h-[52px] px-8 py-3 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded-2xl text-lg shadow-md transition transform active:scale-95"
                >
                  अगला कदम (Next) →
                </button>
              ) : (
                <button
                  onClick={() => {
                    stop();
                    setActiveTutorial(null);
                  }}
                  className="flex-1 sm:flex-none min-h-[52px] px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-lg shadow-lg transition transform active:scale-95"
                >
                  🎉 शाबाश! पूरा हुआ (Finish)
                </button>
              )}
            </div>
          </div>
        </article>

        {/* 'I am stuck' Drawer */}
        {stuckOpen && (
          <div
            className="p-6 rounded-3xl bg-amber-50 dark:bg-slate-900 border-2 border-amber-400 shadow-md flex flex-col gap-4 animate-in fade-in"
            aria-label="Stuck Assistant"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧘</span>
                <h3 className="text-xl font-bold text-amber-950 dark:text-amber-200">
                  घबराएं नहीं, साथी आपके साथ है!
                </h3>
              </div>
              <button
                onClick={() => setStuckOpen(false)}
                className="text-slate-500 font-bold p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
              >
                ✕ बंद करें
              </button>
            </div>

            {stuckLoading ? (
              <p className="text-base text-amber-900 dark:text-amber-200 animate-pulse">
                साथी समझ रहा है... कृपया एक पल रुकें।
              </p>
            ) : stuckResponse ? (
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-900 flex flex-col gap-2">
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {stuckResponse.answer}
                </p>
                <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                  {stuckResponse.reassuring_note}
                </p>
              </div>
            ) : null}

            {/* Quick Question Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleAskStuck('स्क्रीन पर बटन नहीं दिख रहा')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 rounded-xl text-sm font-medium hover:bg-amber-100"
              >
                बटन नहीं दिख रहा?
              </button>
              <button
                onClick={() => handleAskStuck('गलत स्क्रीन खुल गई है, वापस कैसे जाऊं')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 rounded-xl text-sm font-medium hover:bg-amber-100"
              >
                गलत स्क्रीन आ गई?
              </button>
              <button
                onClick={() => handleAskStuck('फोन कोई अनुमति (Permission) मांग रहा है')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 rounded-xl text-sm font-medium hover:bg-amber-100"
              >
                अनुमति मांग रहा है?
              </button>
            </div>

            {/* Custom Stuck Question Input */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="या अपना सवाल यहाँ लिखें (Or type your question)..."
                value={stuckQuestion}
                onChange={(e) => setStuckQuestion(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (stuckQuestion.trim()) {
                    handleAskStuck(stuckQuestion);
                    setStuckQuestion('');
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow transition"
              >
                पूछें (Ask)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: Catalog of Tutorials + Dynamic Generator
  // -------------------------------------------------------------
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
            टेक गुरु • डिजिटल मार्गदर्शक (Tech Tutor)
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            धैर्यपूर्वक, एक-एक कदम सिखाने वाला आपका अपना डिजिटल शिक्षक।
          </p>
        </div>
      </div>

      {/* Dynamic Tutorial Search / Generator Form */}
      <section
        className="p-6 rounded-3xl bg-gradient-to-r from-teal-50 to-amber-50/60 dark:from-slate-900 dark:to-slate-800 border-2 border-teal-200 dark:border-teal-900 shadow-sm"
        aria-label="Ask for Any Guide"
      >
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          आप आज क्या सीखना चाहते हैं? (What do you want to learn?)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-4">
          किसी भी ऐप या काम का नाम लिखें या बोलें, साथी तुरंत आपके लिए सरल पाठ बना देगा।
        </p>

        <form onSubmit={handleGenerateCustom} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="उदा. YouTube पर भजन खोजना, Zomato से खाना, ट्रेन टिकट..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="flex-1 min-h-[50px] px-4 text-base sm:text-lg rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={generatingCustom || !customTopic.trim()}
            className="min-h-[50px] px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>✨</span>
            <span>{generatingCustom ? 'पाठ तैयार हो रहा है...' : 'मार्गदर्शक बनाएं (Teach Me)'}</span>
          </button>
        </form>
      </section>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'सभी (All)' },
          { id: 'finance', label: '💳 पैसे और UPI (Payments)' },
          { id: 'communication', label: '📞 परिवार से बात (Calls)' },
          { id: 'bills', label: '💡 बिल भुगतान (Bills)' },
          { id: 'government', label: '🏛️ सरकारी सेवाएं (DigiLocker)' },
          { id: 'travel', label: '🗺️ यात्रा और नक्शा (Maps)' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-4 py-2 rounded-xl text-sm sm:text-base font-bold transition min-h-[44px] ${
              activeCategory === c.id
                ? 'bg-teal-700 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Catalog Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Tutorials List">
        {loading ? (
          <p className="text-base text-slate-500">पाठ सूची लोड हो रही है...</p>
        ) : (
          filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-400 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-100/70 dark:bg-teal-950 px-3 py-1 rounded-full">
                    {item.target_app}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {item.total_steps} कदम
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  कठिनाई: {item.difficulty}
                </span>
                <button
                  onClick={() => loadTutorial(item.id)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm sm:text-base font-bold rounded-xl shadow-sm transition transform active:scale-95"
                >
                  शुरू करें (Start) →
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
