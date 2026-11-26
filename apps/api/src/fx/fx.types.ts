export const SUPPORTED_CURRENCIES = [
  'LKR',
  'USD',
  'GBP',
  'EUR',
  'AED',
  'SAR',
  'QAR',
  'CAD',
  'AUD',
  'INR',
  'MYR',
  'SGD',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** LKR minor units are the only values that count towards the campaign. */
export interface FxQuote {
  currency: SupportedCurrency;
  sourceAmountMinor: string;
  amountMinor: string;
  rate: string;
}
