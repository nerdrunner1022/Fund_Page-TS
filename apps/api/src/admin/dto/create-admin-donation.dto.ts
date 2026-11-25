import { z } from 'zod';

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https?:\/\/\S+$/, 'Enter a valid http(s) slip link.');

export const amountSchema = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, {
  message: 'Enter an amount from Rs. 1 to Rs. 10,000,000.',
});

export const adminCreateDonationSchema = z
  .object({
    amount: amountSchema,
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
