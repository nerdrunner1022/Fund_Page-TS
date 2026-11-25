import { useI18n } from '../providers/I18nProvider';
import { useCampaignCopy } from '../hooks/useCampaignCopy';
import { formatPercent, formatRupees } from '../lib/money';
import type { Campaign } from '../types';
import { LandProgress } from './LandProgress';

export function FundraisingSummary({
  campaign,
  raisedMinor,
  percent,
  donors,
}: {
  campaign: Campaign;
  raisedMinor: string;
  percent: number;
  donors?: number;
}) {
  const copy = useCampaignCopy(campaign);
  const { t } = useI18n();
  const remainingMinor = (
    BigInt(campaign.goalMinor) > BigInt(raisedMinor)
      ? BigInt(campaign.goalMinor) - BigInt(raisedMinor)
      : 0n
  ).toString();

  return (
    <section aria-label={copy.raised}>
      <div className="raised">
        <div>
          <div className="note">{copy.raised}</div>
          <div className="amt" id="amt">
            {formatRupees(raisedMinor)}
          </div>
        </div>
        <div className="goal">
          <div>{copy.goal}</div>
          <div id="goal">{formatRupees(campaign.goalMinor)}</div>
          <div className="pct">
            <span>{copy.stillNeeded}</span> <span>{formatRupees(remainingMinor)}</span>
          </div>
        </div>
      </div>

      <LandProgress
        campaign={campaign}
        copy={copy}
        raisedMinor={raisedMinor}
        percent={percent}
      />
      <p className="note">
        <span className="pct">
          {formatPercent(percent)}% {copy.funded}
        </span>
        <span aria-hidden="true"> · </span>
        <span>{copy.perchNote}</span>
        {donors !== undefined && (
          <>
            <span aria-hidden="true"> · </span>
            <span>{t.verifiedDonors.replace('{n}', String(donors))}</span>
          </>
        )}
      </p>
    </section>
  );
}
