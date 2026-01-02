export interface UseTranslationReturn {
  t: (key: string, defaultValue?: string) => string;
  i18n: any;
}

export function useTranslation(): UseTranslationReturn;
