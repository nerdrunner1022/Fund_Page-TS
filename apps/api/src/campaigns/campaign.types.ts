export interface CampaignCopy {
  school: string;
  title: string;
  lead: string;
  daysLeft: string;
  hours: string;
  minutes: string;
  seconds: string;
  raised: string;
  goal: string;
  stillNeeded: string;
  perchNote: string;
  funded: string;
  howHeading: string;
  howBody: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch: string;
  chooseAmount: string;
  name: string;
  amountPlaceholder: string;
  sendSlip: string;
  whatsappNote: string;
  message: string;
  supporters: string;
  supportersSecondary: string;
}

export interface CampaignTranslations {
  en: CampaignCopy;
  ta: CampaignCopy;
}

export type CampaignStatus = 'active' | 'closed';
