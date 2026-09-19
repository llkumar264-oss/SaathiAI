import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility, FontSize } from '../context/AccessibilityContext';
import { LogOut, Globe, Eye } from 'lucide-react';

import { MorningBriefCard } from '../features/morning-brief/MorningBriefCard';
import { MedicineManager } from '../features/medicines/MedicineManager';
import { ScamShield } from '../features/scam-shield/ScamShield';
import { HealthTracker } from '../features/health/HealthTracker';
import { DocumentSimplifier } from '../features/documents/DocumentSimplifier';
import { TechTutor } from '../features/tutor/TechTutor';
import { FamilyCircle } from '../features/family/FamilyCircle';
import { SOSButton } from '../features/family/SOSButton';
import { SaathiChatModal } from '../features/chat/SaathiChatModal';
import { BhajanHub } from '../features/bhajan/BhajanHub';

export type ActiveDashboardView =
  | 'home'
  | 'medicines'
  | 'scam'
  | 'vitals'
  | 'documents'
  | 'tutor'
  | 'family'
  | 'bhajan';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    language,
    setLanguage,
    highContrast,
    setHighContrast,
    fontSize,
    setFontSize,
  } = useAccessibility();

  const cycleFontSize = () => {
    const next: Record<FontSize, FontSize> = {
      normal: 'large',
      large: 'extra_large',
      extra_large: 'normal',
    };
    setFontSize(next[fontSize]);
  };

  const [activeView, setActiveView] = useState<ActiveDashboardView>('home');
  const [chatOpen, setChatOpen] = useState<boolean>(false);

  // Sub-views
  if (activeView === 'medicines') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <MedicineManager onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  if (activeView === 'scam') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <ScamShield onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  if (activeView === 'vitals') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <HealthTracker onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  if (activeView === 'documents') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <DocumentSimplifier onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  if (activeView === 'tutor') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <TechTutor onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  if (activeView === 'family') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <FamilyCircle onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  if (activeView === 'bhajan') {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-slate-950 p-4 sm:p-6 pb-28">
        <BhajanHub onBack={() => setActiveView('home')} />
        <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  // -------------------------------------------------------------
  // HOME DASHBOARD
  // -------------------------------------------------------------
  return (
    <div
      className={`min-h-screen p-4 sm:p-6 pb-32 transition-colors ${
        highContrast
          ? 'bg-black text-white'
          : 'bg-gradient-to-b from-cream-100 via-amber-50/30 to-teal-50/20 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Top Header Bar */}
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-sm border border-teal-100 dark:border-slate-800 gap-4 mb-6">
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-sm">
              सा
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {user?.displayName || 'Sharma Ji'}
                </h1>
                {user?.isGuest && (
                  <span className="text-xs bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                    गेस्ट डेमो (Guest Demo)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">साथी AI आपका दैनिक डिजिटल सहायक</p>
            </div>
          </div>

          {/* SOS Quick Access in mobile */}
          <div className="md:hidden">
            <SOSButton />
          </div>
        </div>

        {/* Accessibility & Settings Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Font Size Cycle (Normal / Large / Extra Large) */}
          <button
            onClick={cycleFontSize}
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
            aria-label="Change text size"
            title={`वर्तमान आकार: ${fontSize}`}
          >
            <span className="font-extrabold text-base">A</span>
            <span className="text-xs uppercase font-bold text-teal-700 dark:text-teal-400">
              {fontSize === 'extra_large' ? 'XL' : fontSize === 'large' ? 'L' : 'M'}
            </span>
          </button>

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
            aria-label="Toggle contrast"
          >
            <Eye className="w-5 h-5" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center gap-1.5 shadow-sm"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
            <span>{language === 'hi' ? 'EN' : 'हिन्दी'}</span>
          </button>

          {/* Persistent Desktop SOS Button */}
          <div className="hidden md:block ml-2">
            <SOSButton />
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-1 flex items-center justify-center"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto space-y-6">
        {/* Morning Brief Card */}
        <MorningBriefCard onNavigateToMeds={() => setActiveView('medicines')} />

        {/* PWA & Reminders Notification Note (Requirement 6) */}
        <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-slate-900 border border-teal-200/80 dark:border-teal-900 text-xs sm:text-sm text-teal-950 dark:text-teal-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span>
              <strong>रिमाइंडर सूचना (Reminders Notice):</strong> समय पर दवा और बिल के नोटिफिकेशन पाने के लिए ब्राउज़र खुला रखें या होम स्क्रीन पर ऐप इंस्टॉल करें।
            </span>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-teal-200/60 dark:bg-teal-950 font-bold shrink-0">
            PWA Ready
          </span>
        </div>

        {/* The 6 Big Action Tiles */}
        <section aria-label="Main Features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Tile 1: Medicines */}
          <button
            onClick={() => setActiveView('medicines')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">💊</span>
                <span className="text-xs font-black uppercase text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full">
                  दैनिक दवा
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition">
                दवाइयां एवं पर्चा (Medicines)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                आज की दवाएं 1-टैप में दर्ज करें, कैमरे से डॉक्टर का पर्चा स्कैन करें और 7 दिनों का रिकॉर्ड देखें।
              </p>
            </div>
            <div className="mt-6 flex items-center text-teal-700 dark:text-teal-400 font-bold text-sm">
              <span>शेड्यूल खोलें</span>
              <span className="ml-1 transition transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tile 2: Scam Shield */}
          <button
            onClick={() => setActiveView('scam')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">🛡️</span>
                <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full">
                  धोखाधड़ी जांच
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                फ्रॉड रक्षक (Scam Shield)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                बिजली बिल, बैंक KYC या लॉटरी वाले संदिग्ध SMS की AI जांच करें और 1-टैप में परिवार को सतर्क करें।
              </p>
            </div>
            <div className="mt-6 flex items-center text-amber-700 dark:text-amber-400 font-bold text-sm">
              <span>संदेश जांचें</span>
              <span className="ml-1 transition transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tile 3: Health & Vitals */}
          <button
            onClick={() => setActiveView('vitals')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-rose-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">💓</span>
                <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-3 py-1 rounded-full">
                  JNC-8 मानक
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-400 transition">
                स्वास्थ्य ट्रैकर (Health & Vitals)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                ब्लड प्रेशर और शुगर बोलकर दर्ज करें, 4-टियर स्थिति जांचें और चार्ट्स पर रुझान देखें।
              </p>
            </div>
            <div className="mt-6 flex items-center text-rose-700 dark:text-rose-400 font-bold text-sm">
              <span>वाइटल्स दर्ज करें</span>
              <span className="ml-1 transition transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tile 4: Document Simplifier */}
          <button
            onClick={() => setActiveView('documents')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">📄</span>
                <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full">
                  4 सरल भाग
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition">
                कागज़ात समझें (Documents)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                बिजली का बिल, अस्पताल की रिपोर्ट या सरकारी नोटिस अपलोड करें और 1-टैप में अंतिम तारीख का रिमाइंडर लगाएं।
              </p>
            </div>
            <div className="mt-6 flex items-center text-indigo-700 dark:text-indigo-400 font-bold text-sm">
              <span>दस्तावेज़ देखें</span>
              <span className="ml-1 transition transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tile 5: Tech Tutor */}
          <button
            onClick={() => setActiveView('tutor')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">📱</span>
                <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full">
                  डिजिटल गुरु
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                टेक गुरु (Tech Tutor)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                UPI से पैसे भेजना, वॉट्सऐप वीडियो कॉल, DigiLocker और ट्रेन टिकट एक-एक कदम आसानी से सीखें।
              </p>
            </div>
            <div className="mt-6 flex items-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <span>पाठ शुरू करें</span>
              <span className="ml-1 transition transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tile 6: Family Circle & SOS */}
          <button
            onClick={() => setActiveView('family')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-teal-400 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">👨‍👩‍👦</span>
                <span className="text-xs font-black uppercase text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-full">
                  सुरक्षा घेरा
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition">
                परिवार एवं SOS (Family Circle)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                विश्वस्त परिजनों के नंबर जोड़ें, केयरगिवर रिपोर्ट देखें और आपातकाल में 3-सेकंड SOS से अलर्ट भेजें।
              </p>
            </div>
            <div className="mt-6 flex items-center text-teal-700 dark:text-teal-400 font-bold text-sm">
              <span>परिवार घेरा खोलें</span>
              <span className="ml-1 transition transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tile 7: Bhajan & Spiritual Hub */}
          <button
            onClick={() => setActiveView('bhajan')}
            className="text-left p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500 transition flex flex-col justify-between group md:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 dark:from-slate-900 dark:to-slate-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">🪔</span>
                  <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-950 px-3 py-1 rounded-full">
                    दैनिक सुकून व भक्ति धारा 🌸
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                  भजन एवं सत्संग (Bhajans & Devotion)
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
                  श्री हनुमान चालीसा, गायत्री मंत्र, कृष्ण भजन व लता जी के सदाबहार पुराने गीत एक टैप में सुनें। बोलकर भी कोई भी भजन या गाना खोज सकते हैं।
                </p>
              </div>
              <div className="flex items-center text-amber-800 dark:text-amber-400 font-extrabold text-base bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-amber-300 dark:border-slate-700 shadow-sm flex-shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
                <span>भजन सुनें (Listen Now)</span>
                <span className="ml-2 transition transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </button>
        </section>
      </main>

      {/* Hero Bottom Floating Saathi Mic Button */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 px-4 pointer-events-none">
        <button
          onClick={() => setChatOpen(true)}
          className="pointer-events-auto min-h-[60px] px-8 py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-black text-xl rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/60 dark:border-teal-900 transition transform hover:scale-105 active:scale-95"
          aria-label="Open Saathi Voice Companion"
        >
          <span className="text-2xl animate-pulse" aria-hidden="true">
            🎙️
          </span>
          <span>साथी से बात करें (Talk with Saathi)</span>
        </button>
      </div>

      {/* Saathi Companion Chat Modal */}
      <SaathiChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};
