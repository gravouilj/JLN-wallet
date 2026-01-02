import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import { localeAtom } from '../atoms';

interface UseTranslationReturn {
  t: (key: string, options?: any) => string;
  locale: string;
  changeLanguage: (lang: string) => void;
  languages: string[];
  languageNames: Record<string, string>;
}

export const useTranslation = (): UseTranslationReturn => {
  const { t, i18n } = useI18nTranslation();
  const [locale, setLocale] = useAtom(localeAtom);

  const changeLanguage = (lang: string): void => {
    setLocale(lang);
    i18n.changeLanguage(lang);
  };

  return {
    t,
    locale,
    changeLanguage,
    languages: ['en', 'fr'],
    languageNames: {
      en: 'English',
      fr: 'Français',
      de: 'Deutsch',
      es: 'Español',
      it: 'Italiano',
      pt: 'Português',
    }
  };
};
