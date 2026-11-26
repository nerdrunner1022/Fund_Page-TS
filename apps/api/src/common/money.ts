import { BadRequestException } from '@nestjs/common';

export const MIN_DONATION_MINOR = 100n;
export const MAX_DONATION_MINOR = 1_000_000_000n;

const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;
const AMOUNT_MESSAGE =
  'Enter an amount from Rs. 1 to Rs. 10,000,000 with at most two decimals.';
const SOURCE_AMOUNT_MESSAGE =
  'Enter an amount from 1 to 10,000,000 with at most two decimals.';

function parseDecimalToMinor(
  input: string,
  min: bigint,
  max: bigint,
  message: string,
): bigint {
  if (typeof input !== 'string' || !AMOUNT_PATTERN.test(input)) {
    throw new BadRequestException(message);
  }

  const [major, fraction = ''] = input.split('.');
  const minor = fraction ? BigInt(fraction.padEnd(2, '0')) : 0n;
  const total = BigInt(major) * 100n + minor;

  if (total < min || total > max) {
    throw new BadRequestException(message);
  }

  return total;
}

/** Parses a decimal major-unit string into exact integer minor units (rupee cents). */
export function parseAmountToMinor(input: string): bigint {
  return parseDecimalToMinor(
    input,
    MIN_DONATION_MINOR,
    MAX_DONATION_MINOR,
    AMOUNT_MESSAGE,
  );
}

/**
 * Parses an amount in any supported donation currency before conversion.
 * The rupee bounds are checked again after the live rate is applied.
 */
export function parseCurrencyAmountToMinor(input: string): bigint {
  return parseDecimalToMinor(
    input,
    MIN_DONATION_MINOR,
    MAX_DONATION_MINOR,
    SOURCE_AMOUNT_MESSAGE,
  );
}

/** Renders exact minor units as a plain decimal major-unit string. */
export function minorToMajorString(minor: string): string {
  const value = BigInt(minor);
  const cents = value % 100n;
  const major = value / 100n;
  return cents === 0n
    ? major.toString()
    : `${major}.${cents.toString().padStart(2, '0')}`;
}
