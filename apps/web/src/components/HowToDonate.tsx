import { useCampaignCopy } from '../hooks/useCampaignCopy';
import { useI18n } from '../providers/I18nProvider';
import type { Campaign } from '../types';
import { DonationForm } from './DonationForm';

export function HowToDonate({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const copy = useCampaignCopy(campaign);

  return (
    <section className="how">
      <div className="how-copy">
        <h2>{copy.howHeading}</h2>
        <p>{copy.howBody}</p>

        <dl className="bank-details">
          <div>
            <dt>{t.bankAccountLabel}</dt>
            <dd>{copy.bankAccountName}</dd>
          </div>
          <div>
            <dt>{t.accountNumberLabel}</dt>
            <dd className="account-number">{copy.bankAccountNumber}</dd>
          </div>
          <div>
            <dt>{t.bankLabel}</dt>
            <dd>{copy.bankName}</dd>
          </div>
          <div>
            <dt>{t.branchLabel}</dt>
            <dd>{copy.bankBranch}</dd>
          </div>
        </dl>
      </div>

      <DonationForm
        copy={copy}
        slug={campaign.slug}
        whatsappNumber={campaign.whatsappNumber}
      />
    </section>
  );
}
