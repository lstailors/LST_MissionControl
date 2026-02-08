import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

// ═══════════════════════════════════════════════════════════
// i18n — Internationalization (Arabic + English)
// ═══════════════════════════════════════════════════════════

// Detect language: localStorage > installer file > default 'ar'
const getInitialLang = (): string => {
  const stored = localStorage.getItem('aegis-language');
  if (stored) return stored;

  // Try reading installer language choice (written during NSIS install)
  try {
    if (window.aegis?.app?.getPath) {
      // Will be checked async in App — for now default to 'ar'
    }
  } catch { /* ignore */ }
  return 'ar';
};

const savedLang = getInitialLang();

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

// Helper: get direction for current language
export const getDirection = (lang?: string): 'rtl' | 'ltr' => {
  return (lang || i18n.language) === 'ar' ? 'rtl' : 'ltr';
};

// Helper: change language and persist
export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('aegis-language', lang);
  document.documentElement.dir = getDirection(lang);
  document.documentElement.lang = lang;
};

// Set initial direction
document.documentElement.dir = getDirection(savedLang);
document.documentElement.lang = savedLang;

export default i18n;
