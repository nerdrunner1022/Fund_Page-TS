import { z } from 'zod';
import {
  currencyAmountSchema,
  donationCurrencySchema,
} from '../../common/donation-input';
import type { SupportedCurrency } from '../../fx/fx.types';

export const createDonationSchema = z
  .object({
    amount: currencyAmountSchema,
    currency: donationCurrencySchema.default('LKR'),
    donorName: z.string().trim().min(1).max(120).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .strict();

export type CreateDonationDto = z.infer<typeof createDonationSchema>;

export interface PendingDonationResponse {
  id: string;
  referenceCode: string;
  amountMinor: string;
  currency: SupportedCurrency;
  sourceAmountMinor: string;
  fxRate: string;
  donorName: string | null;
  status: 'pending';
  createdAt: string;
}

// Public responses never include donor names, messages, slips or bank references.
export interface ConfirmedDonationResponse {
  id: string;
  amountMinor: string;
  confirmedAt: string;
}

export interface DonationCursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CampaignTotalsResponse {
  raised: string;
  donors: number;
}

export interface AdminDonationResponse {
  id: string;
  referenceCode: string;
  donorName: string | null;
  amountMinor: string;
  currency: SupportedCurrency;
  sourceAmountMinor: string;
  fxRate: string;
  bankRef: string | null;
  slipUrl: string | null;
  donatedOn: string | null;
  message: string | null;
  status: 'pending' | 'confirmed' | 'declined';
  verifiedBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
}
