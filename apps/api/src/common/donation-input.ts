import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../fx/fx.types';

export const donationCurrencySchema = z.enum(SUPPORTED_CURRENCIES);

export const currencyAmountSchema = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, {
    message: 'Enter an amount from 1 to 10,000,000 with at most two decimals.',
  });
