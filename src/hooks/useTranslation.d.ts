export interface UseTranslationReturn {
  t: (key: string, defaultValue?: string) => string;
  locale: string;
  changeLanguage: (lang: string) => void;
  languages: string[];
  languageNames: Record<string, string>;
}

export function useTranslation(): UseTranslationReturn;
