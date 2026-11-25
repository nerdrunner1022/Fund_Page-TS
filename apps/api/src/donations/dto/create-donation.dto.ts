import { z } from 'zod';

export const createDonationSchema = z
  .object({
    amount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, {
      message: 'Enter an amount from Rs. 1 to Rs. 10,000,000.',
    }),
    donorName: z.string().trim().min(1).max(120).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .strict();

export type CreateDonationDto = z.infer<typeof createDonationSchema>;

export interface PendingDonationResponse {
  id: string;
  referenceCode: string;
  amountMinor: string;
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
  bankRef: string | null;
  slipUrl: string | null;
  donatedOn: string | null;
  message: string | null;
  status: 'pending' | 'confirmed' | 'declined';
  verifiedBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
}
