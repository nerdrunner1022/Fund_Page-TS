import { z } from 'zod';
import { donationCurrencySchema } from '../../common/donation-input';
import { amountSchema, httpUrl } from './create-admin-donation.dto';

const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const adminUpdateDonationSchema = z
  .object({
    amount: amountSchema.optional(),
    currency: donationCurrencySchema.optional(),
    donorName: nullableText(120).optional(),
    bankRef: z.string().trim().min(1).max(120).nullable().optional(),
    slipUrl: httpUrl.nullable().optional(),
    donatedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD for the donation date.')
      .nullable()
      .optional(),
    message: nullableText(500).optional(),
    status: z.enum(['pending', 'confirmed', 'declined']).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export type AdminUpdateDonationDto = z.infer<typeof adminUpdateDonationSchema>;
