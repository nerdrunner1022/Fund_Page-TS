import { z } from 'zod';
import {
  currencyAmountSchema,
  donationCurrencySchema,
} from '../../common/donation-input';

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https?:\/\/\S+$/, 'Enter a valid http(s) slip link.');

export const amountSchema = currencyAmountSchema;

export const adminCreateDonationSchema = z
  .object({
    amount: amountSchema,
    currency: donationCurrencySchema.default('LKR'),
    donorName: z.string().trim().min(1).max(120).optional(),
    bankRef: z.string().trim().min(1).max(120).optional(),
    slipUrl: httpUrl.optional(),
    donatedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD for the donation date.')
      .optional(),
  })
  .strict();

export type AdminCreateDonationDto = z.infer<typeof adminCreateDonationSchema>;
