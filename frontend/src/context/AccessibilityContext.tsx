import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';

export type FontSize = 'normal' | 'large' | 'extra_large';

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  language: 'hi' | 'en';
  setLanguage: (lang: 'hi' | 'en') => void;
  simplifiedMode: boolean;
  setSimplifiedMode: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('saathi_font_size') as FontSize) || 'large';
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return localStorage.getItem('saathi_high_contrast') === 'true';
  });

  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    return localStorage.getItem('saathi_dark_mode') === 'true';
  });

  const [speechRate, setSpeechRateState] = useState<number>(() => {
    const saved = localStorage.getItem('saathi_speech_rate');
    return saved ? parseFloat(saved) : 0.9;
  });

  const [language, setLanguageState] = useState<'hi' | 'en'>(() => {
    return (localStorage.getItem('saathi_lang') as 'hi' | 'en') || 'hi';
  });

  const [simplifiedMode, setSimplifiedModeState] = useState<boolean>(() => {
    return localStorage.getItem('saathi_simplified_mode') === 'true';
  });

  // Apply font scale dynamically to document root
  useEffect(() => {
    const root = document.documentElement;
    let sizeRem = '1.125rem'; // 18px base
    if (fontSize === 'large') sizeRem = '1.375rem'; // 22px
    if (fontSize === 'extra_large') sizeRem = '1.75rem'; // 28px
    root.style.setProperty('--font-scale', sizeRem);
    localStorage.setItem('saathi_font_size', fontSize);
  }, [fontSize]);

  // Apply high-contrast class
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('saathi_high_contrast', String(highContrast));
  }, [highContrast]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode && !highContrast) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('saathi_dark_mode', String(darkMode));
  }, [darkMode, highContrast]);

  const setFontSize = (size: FontSize) => setFontSizeState(size);
  const setHighContrast = (enabled: boolean) => setHighContrastState(enabled);
  const setDarkMode = (enabled: boolean) => setDarkModeState(enabled);
  const setSpeechRate = (rate: number) => {
    setSpeechRateState(rate);
    localStorage.setItem('saathi_speech_rate', String(rate));
  };
  const setLanguage = (lang: 'hi' | 'en') => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('saathi_lang', lang);
  };
  const setSimplifiedMode = (enabled: boolean) => {
    setSimplifiedModeState(enabled);
    localStorage.setItem('saathi_simplified_mode', String(enabled));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        darkMode,
        setDarkMode,
        speechRate,
        setSpeechRate,
        language,
        setLanguage,
        simplifiedMode,
        setSimplifiedMode,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};
