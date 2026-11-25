import { useI18n } from '../providers/I18nProvider';
import type { Campaign, CampaignCopy } from '../types';

export function useCampaignCopy(campaign: Campaign): CampaignCopy {
  const { lang } = useI18n();
  return campaign.translations[lang];
}
