import type { SupportedCurrency } from '../types';

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  LKR: 'LKR (Rs.)',
  USD: 'USD ($)',
  GBP: 'GBP (£)',
  EUR: 'EUR (€)',
  AED: 'AED (د.إ)',
  SAR: 'SAR (﷼)',
  QAR: 'QAR (﷼)',
  CAD: 'CAD (C$)',
  AUD: 'AUD (A$)',
  INR: 'INR (₹)',
  MYR: 'MYR (RM)',
  SGD: 'SGD (S$)',
};

function format(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats the raw number the donor typed, in their chosen currency. */
export function formatEnteredAmount(value: string, currency: SupportedCurrency): string {
  return `${currency} ${format(Number(value))}`;
}

/** Formats exact minor units returned by the API. */
export function formatMinorAmount(
  minor: string,
  currency: SupportedCurrency,
): string {
  return `${currency} ${format(Number(BigInt(minor)) / 100)}`;
}
