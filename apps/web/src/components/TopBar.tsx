import { useI18n } from '../providers/I18nProvider';
import { useTheme, type Theme } from '../providers/ThemeProvider';
import type { CampaignCopy } from '../types';

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path
          d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12a0 0 0 0 1 0 0" fill="currentColor" />
    </svg>
  );
}

export function TopBar({ copy }: { copy: CampaignCopy }) {
  const { lang, setLang, t } = useI18n();
  const { theme, nextTheme, setTheme } = useTheme();

  const themeName =
    theme === 'system' ? t.themeSystem : theme === 'light' ? t.themeLight : t.themeDark;

  return (
    <div className="top">
      <small>{copy.school}</small>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="lang icon-button"
          onClick={() => setTheme(nextTheme)}
          aria-label={`${t.themeToggleLabel}: ${themeName}`}
          title={themeName}
        >
          <ThemeIcon theme={theme} />
        </button>
        <button
          type="button"
          className="lang"
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          aria-label={t.languageToggleLabel}
        >
          {lang === 'en' ? 'தமிழ்' : 'English'}
        </button>
      </div>
    </div>
  );
}
