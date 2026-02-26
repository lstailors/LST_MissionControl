import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// ═══════════════════════════════════════════════════════════
// i18n — English only (L&S Mission Control)
// ═══════════════════════════════════════════════════════════

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Helper: get direction — always LTR
export const getDirection = (_lang?: string): 'rtl' | 'ltr' => 'ltr';

// Helper: change language (no-op, kept for compatibility)
export const changeLanguage = (_lang: string) => {};

// Set direction
document.documentElement.dir = 'ltr';
document.documentElement.lang = 'en';

export default i18n;
