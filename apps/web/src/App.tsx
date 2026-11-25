import { AdminApp } from './admin/AdminApp';
import { CampaignHero } from './components/CampaignHero';
import { ErrorState, LoadingState } from './components/States';
import { FundraisingSummary } from './components/FundraisingSummary';
import { HowToDonate } from './components/HowToDonate';
import { useCampaign } from './hooks/useCampaign';
import { useCampaignCopy } from './hooks/useCampaignCopy';
import { useTotals } from './hooks/useTotals';
import { I18nProvider, useI18n } from './providers/I18nProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { calculatePercent } from './lib/money';
import type { Campaign } from './types';

function LoadedCampaign({ campaign }: { campaign: Campaign }) {
  const copy = useCampaignCopy(campaign);
  const totals = useTotals();
  const raisedMinor = totals?.raised ?? campaign.raisedMinor;
  const percent = calculatePercent(raisedMinor, campaign.goalMinor);

  return (
    <>
      <CampaignHero campaign={campaign} />
      <FundraisingSummary
        campaign={campaign}
        raisedMinor={raisedMinor}
        percent={percent}
        donors={totals?.donors}
      />
      <HowToDonate campaign={campaign} />
      <p className="sup">{copy.supporters}</p>
    </>
  );
}

function CampaignPage() {
  const { campaign, error, isLoading, refresh } = useCampaign();
  const { t } = useI18n();

  return (
    <>
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <main id="main" className="page">
        {isLoading && !campaign ? (
          <LoadingState />
        ) : error || !campaign ? (
          <ErrorState onRetry={() => void refresh()} />
        ) : (
          <LoadedCampaign campaign={campaign} />
        )}
      </main>
    </>
  );
}

function Routes() {
  const isAdmin =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '') === '/admin';
  return isAdmin ? <AdminApp /> : <CampaignPage />;
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <Routes />
      </ThemeProvider>
    </I18nProvider>
  );
}
