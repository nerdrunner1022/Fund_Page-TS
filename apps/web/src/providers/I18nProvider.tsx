import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { UI, type UiStrings } from '../i18n/strings';
import type { Lang } from '../types';

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: UiStrings;
}

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLanguage(): Lang {
  try {
    return localStorage.getItem('zlang') === 'ta' ? 'ta' : 'en';
  } catch {
    return 'en';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('zlang', lang);
    } catch {
      // Storage may be unavailable in private browsing; language still works.
    }
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: UI[lang] }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
