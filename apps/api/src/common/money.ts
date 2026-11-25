import { BadRequestException } from '@nestjs/common';

export const MIN_DONATION_MINOR = 100n;
export const MAX_DONATION_MINOR = 1_000_000_000n;

const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;
const AMOUNT_MESSAGE =
  'Enter an amount from Rs. 1 to Rs. 10,000,000 with at most two decimals.';

/** Parses a decimal major-unit string into exact integer minor units (rupee cents). */
export function parseAmountToMinor(input: string): bigint {
  if (typeof input !== 'string' || !AMOUNT_PATTERN.test(input)) {
    throw new BadRequestException(AMOUNT_MESSAGE);
  }

  const [major, fraction = ''] = input.split('.');
  const minor = fraction ? BigInt(fraction.padEnd(2, '0')) : 0n;
  const total = BigInt(major) * 100n + minor;

  if (total < MIN_DONATION_MINOR || total > MAX_DONATION_MINOR) {
    throw new BadRequestException(AMOUNT_MESSAGE);
  }

  return total;
}
