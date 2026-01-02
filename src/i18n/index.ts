import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
import en from './locales/en.json';
import fr from './locales/fr.json';

interface Resources {
  [key: string]: {
    translation: Record<string, any>;
  };
}

const resources: Resources = {
  en: { translation: en },
  fr: { translation: fr }
};

/**
 * Détecte la langue du navigateur intelligemment
 */
const detectBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'fr';
  
  const navLang = (navigator.language || (navigator as any).userLanguage || 'fr').toLowerCase();
  
  // Détecte le français
  if (navLang.includes('fr')) return 'fr';
  
  // Détecte l'anglais
  if (navLang.includes('en')) return 'en';
  
  // Défaut : français
  return 'fr';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: detectBrowserLanguage(),
    fallbackLng: 'fr',

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'farm-wallet-language',
      caches: ['localStorage'],
      checkWhitelist: true
    },

    whitelist: ['en', 'fr'],

    interpolation: {
      escapeValue: false
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;
