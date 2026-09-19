import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Shield, Heart, HelpCircle, Phone, Mail, Globe, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { loginAsGuest, loginWithGoogle, loginWithEmailLink } = useAuth();
  const { language, setLanguage, highContrast, setHighContrast } = useAccessibility();

  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);

  const handleGuestClick = async () => {
    setIsLoadingGuest(true);
    try {
      await loginAsGuest();
    } finally {
      setIsLoadingGuest(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await loginWithEmailLink(email);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Bar: Language & Accessibility controls */}
      <header className="flex justify-between items-center max-w-xl mx-auto w-full mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-teal-deep flex items-center justify-center text-white font-bold text-xl shadow-md">
            सा
          </div>
          <span className="text-2xl font-bold text-teal-deep tracking-tight">
            {t('app_title')}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="touch-target flex items-center space-x-1 px-3 py-2 rounded-xl bg-white border border-gray-300 text-sm font-semibold shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-saffron"
            aria-label="Toggle high contrast mode"
          >
            <Eye className="w-5 h-5 text-gray-700" />
            <span className="hidden sm:inline">कंट्रास्ट</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            className="touch-target flex items-center space-x-1 px-4 py-2 rounded-xl bg-teal-deep text-white font-bold shadow-md hover:bg-teal-dark focus:ring-2 focus:ring-saffron"
            aria-label="Switch language"
          >
            <Globe className="w-5 h-5" />
            <span>{language === 'hi' ? 'English' : 'हिंदी'}</span>
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-xl mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 shadow-senior border border-teal-deep/10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-teal-deep leading-tight">
            {t('auth.welcome')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 font-medium">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Feature Highlights for Senior Comfort */}
        <div className="grid grid-cols-3 gap-2 py-2 text-center border-y border-gray-100">
          <div className="flex flex-col items-center p-2">
            <Heart className="w-7 h-7 text-saffron mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700">दवा व सेहत</span>
          </div>
          <div className="flex flex-col items-center p-2">
            <Shield className="w-7 h-7 text-teal-deep mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700">धोखाधड़ी सुरक्षा</span>
          </div>
          <div className="flex flex-col items-center p-2">
            <HelpCircle className="w-7 h-7 text-saffron mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700">आसान बोलचाल</span>
          </div>
        </div>

        {/* 1. Try as Guest - Hero Action */}
        <div className="bg-saffron-light/60 border-2 border-saffron rounded-2xl p-5 text-center space-y-3 shadow-sm">
          <div className="flex items-center justify-center space-x-2 text-saffron font-bold text-lg">
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span>{t('auth.guest_mode')}</span>
          </div>
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
            {t('auth.guest_mode_desc')}
          </p>
          <button
            onClick={handleGuestClick}
            disabled={isLoadingGuest}
            className="w-full touch-target bg-saffron hover:bg-saffron-hover text-white font-extrabold text-xl py-4 px-6 rounded-xl shadow-md transition-transform active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <span>{isLoadingGuest ? t('common.loading') : 'तुरंत शुरू करें (बिना पासवर्ड)'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 w-full"></div>
          <span className="bg-white px-3 text-sm font-medium text-gray-500">या अपना खाता जोड़ें</span>
        </div>

        {/* 2. Google Sign-In (Primary Auth) */}
        <button
          onClick={() => loginWithGoogle()}
          className="w-full touch-target bg-white border-2 border-gray-300 hover:border-teal-deep text-gray-800 font-bold text-lg py-3.5 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-3"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{t('auth.google_signin')}</span>
        </button>

        {/* 3. Email Link Sign-in (Backup) */}
        {!showEmailInput ? (
          <button
            onClick={() => setShowEmailInput(true)}
            className="w-full touch-target bg-teal-light text-teal-deep hover:bg-teal-light/80 font-bold text-base py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-colors"
          >
            <Mail className="w-5 h-5" />
            <span>{t('auth.email_link')}</span>
          </button>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <label htmlFor="email-input" className="block text-sm font-bold text-gray-700">
              अपना ईमेल पता लिखें:
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              className="w-full p-3 rounded-xl border border-gray-300 text-lg focus:ring-2 focus:ring-teal-deep outline-none"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 touch-target bg-teal-deep text-white font-bold py-2.5 rounded-xl shadow-sm"
              >
                लॉग इन लिंक भेजें
              </button>
              <button
                type="button"
                onClick={() => setShowEmailInput(false)}
                className="touch-target px-4 bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
              >
                रद्द करें
              </button>
            </div>
          </form>
        )}

        {/* 4. Phone OTP info */}
        <div className="text-center pt-2">
          <button
            onClick={() => setShowPhoneModal(!showPhoneModal)}
            className="text-sm font-semibold text-teal-deep hover:underline flex items-center justify-center mx-auto space-x-1"
          >
            <Phone className="w-4 h-4" />
            <span>मोबाइल नंबर OTP से जुड़ना चाहते हैं?</span>
          </button>

          {showPhoneModal && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-left text-xs text-yellow-900 leading-relaxed">
              <p className="font-bold mb-1">फ़ोन OTP जानकारी:</p>
              <p>{t('auth.test_numbers_note')}</p>
              <p className="mt-1">
                सुरक्षा के लिए डेमो में सीधे &quot;अतिथि की तरह देखें&quot; या &quot;गूगल&quot; का उपयोग सबसे सरल है।
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Medical Disclaimer */}
      <footer className="text-center text-xs sm:text-sm text-gray-500 max-w-xl mx-auto mt-6 space-y-1">
        <p>🔒 आपकी जानकारी पूरी तरह सुरक्षित और केवल आपके नियंत्रण में है।</p>
        <p>⚠️ साथी AI चिकित्सीय निदान (Diagnosis) नहीं देता; गंभीर स्थिति में तुरंत डॉक्टर से संपर्क करें या 112 मिलाएं।</p>
      </footer>
    </div>
  );
};
