export type Lang = 'en' | 'ta';

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
}

export interface Campaign {
  id: string;
  slug: string;
  translations: Record<Lang, CampaignCopy>;
  goalMinor: string;
  raisedMinor: string;
  percent: number;
  perchCount: number;
  deadline: string;
  whatsappNumber: string;
  status: 'active' | 'closed';
}

export interface PendingDonation {
  id: string;
  referenceCode: string;
  amountMinor: string;
  donorName: string | null;
  status: 'pending';
  createdAt: string;
}

/** The only donation data exposed publicly: no names, slips or bank refs. */
export interface CampaignTotals {
  raised: string;
  donors: number;
}

export type DonationStatus = 'pending' | 'confirmed' | 'declined';

export interface AdminDonation {
  id: string;
  referenceCode: string;
  donorName: string | null;
  amountMinor: string;
  bankRef: string | null;
  slipUrl: string | null;
  donatedOn: string | null;
  message: string | null;
  status: DonationStatus;
  verifiedBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface AdminDonationPage {
  items: AdminDonation[];
  nextCursor: string | null;
}
