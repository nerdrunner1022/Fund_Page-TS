import {
  CampaignStatus,
  CampaignTranslations,
} from '../campaign.types';

export interface CampaignResponse {
  id: string;
  slug: string;
  translations: CampaignTranslations;
  goalMinor: string;
  raisedMinor: string;
  percent: number;
  perchCount: number;
  deadline: string;
  whatsappNumber: string;
  status: CampaignStatus;
}
