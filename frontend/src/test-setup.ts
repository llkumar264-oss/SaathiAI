import '@testing-library/jest-dom';

// Polyfill localStorage for Node / jsdom environment
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
  key: (i: number) => Object.keys(storage)[i] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  window.Element.prototype.scrollIntoView = () => {};
}

// Polyfill ResizeObserver for Recharts
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver;
if (typeof window !== 'undefined') {
  window.ResizeObserver = MockResizeObserver;
}

// Mock SpeechSynthesisUtterance for testing
class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = 'hi-IN';
  rate: number = 1.0;
  voice: any = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string = '') {
    this.text = text;
  }
}

Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: MockSpeechSynthesisUtterance,
    writable: true,
  });
}

import i18n from './i18n';

// Set language to English for deterministic testing
i18n.changeLanguage('en');
