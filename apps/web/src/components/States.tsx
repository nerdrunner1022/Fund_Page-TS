import { useI18n } from '../providers/I18nProvider';

export function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="state" role="status" aria-live="polite">
      <p className="note">{t.loading}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="state" role="alert">
      <p>{t.loadError}</p>
      <button type="button" className="lang" onClick={onRetry}>
        {t.retry}
      </button>
    </div>
  );
}
