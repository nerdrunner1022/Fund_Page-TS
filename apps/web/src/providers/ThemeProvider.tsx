import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'system' | 'light' | 'dark';

interface ThemeValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  nextTheme: Theme;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const ORDER: Theme[] = ['system', 'light', 'dark'];

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('ztheme');
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    try {
      localStorage.setItem('ztheme', theme);
    } catch {
      // Ignore unavailable storage.
    }
  }, [theme]);

  const value = useMemo<ThemeValue>(() => {
    const index = ORDER.indexOf(theme);
    return {
      theme,
      setTheme,
      nextTheme: ORDER[(index + 1) % ORDER.length],
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
