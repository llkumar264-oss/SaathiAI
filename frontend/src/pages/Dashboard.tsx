import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { LogOut, Globe, Eye } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, setLanguage, highContrast, setHighContrast } = useAccessibility();

  return (
    <div className="min-h-screen bg-cream-100 p-4 md:p-6 pb-24">
      {/* Navigation Header */}
      <header className="max-w-4xl mx-auto flex justify-between items-center bg-white p-4 rounded-2xl shadow-senior border border-teal-deep/10 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-teal-deep text-white flex items-center justify-center font-bold text-lg">
            सा
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-teal-deep">
              {user?.displayName || 'Sharma Ji'}
            </h1>
            {user?.isGuest && (
              <span className="text-xs bg-saffron/10 text-saffron font-bold px-2 py-0.5 rounded-md">
                {t('common.guest_badge')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Contrast */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100"
            aria-label="Toggle contrast"
          >
            <Eye className="w-5 h-5 text-gray-700" />
          </button>

          {/* Language */}
          <button
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            className="px-3 py-2 rounded-xl bg-teal-deep text-white font-bold text-sm flex items-center space-x-1"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
            <span>{language === 'hi' ? 'EN' : 'हिन्दी'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-senior border border-teal-deep/10 text-center">
          <h2 className="text-3xl font-extrabold text-teal-deep mb-2">
            {t('dashboard.greeting')}
          </h2>
          <p className="text-lg text-gray-600">
            साथी AI आपकी सेवा में उपस्थित है। (SaathiAI is active and ready)
          </p>
        </div>
      </main>
    </div>
  );
};
