import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

const getInitialLang = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem('saathi_lang') || 'hi';
    }
  } catch {
    // ignore
  }
  return 'hi';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getInitialLang(),
  fallbackLng: 'hi',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
