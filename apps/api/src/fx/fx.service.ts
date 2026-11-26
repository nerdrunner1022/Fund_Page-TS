import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { metric } from '@vercel/functions';
import {
  MAX_DONATION_MINOR,
  MIN_DONATION_MINOR,
  parseCurrencyAmountToMinor,
} from '../common/money';
import {
  FxQuote,
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
} from './fx.types';

const RATE_URL = 'https://open.er-api.com/v6/latest/LKR';
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_EXPONENT = 12;

interface ExchangeRateResponse {
  result?: unknown;
  base_code?: unknown;
  rates?: Record<string, unknown>;
}

interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

@Injectable()
export class FxService {
  private cache: {
    at: number;
    rates: Record<SupportedCurrency, string>;
  } | null = null;

  /**
   * Converts an amount in a supported currency to the rupee minor units that
   * are stored and counted. LKR needs no network call.
   */
  async quote(amount: string, currency: string): Promise<FxQuote> {
    const code = parseSupportedCurrency(currency);
    const sourceAmountMinor = parseCurrencyAmountToMinor(amount);

    if (code === 'LKR') {
      return {
        currency: 'LKR',
        sourceAmountMinor: sourceAmountMinor.toString(),
        amountMinor: sourceAmountMinor.toString(),
        rate: '1',
      };
    }

    const rates = await this.getRates();
    const rate = rates[code];
    const amountMinor = convertToLkrMinor(sourceAmountMinor, rate);

    if (amountMinor < MIN_DONATION_MINOR || amountMinor > MAX_DONATION_MINOR) {
      throw new BadRequestException(
        'This amount must be between Rs. 1 and Rs. 10,000,000 after conversion.',
      );
    }

    return {
      currency: code,
      sourceAmountMinor: sourceAmountMinor.toString(),
      amountMinor: amountMinor.toString(),
      rate,
    };
  }

  private async getRates(): Promise<Record<SupportedCurrency, string>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.rates;
    }

    const startedAt = performance.now();
    try {
      const rates = await this.fetchRates();
      metric('fx.rate_lookup', 1, { outcome: 'success' });
      return rates;
    } catch (error) {
      metric('fx.rate_lookup', 1, { outcome: 'error' });
      throw error;
    } finally {
      metric('fx.rate_lookup.duration_ms', performance.now() - startedAt);
    }
  }

  /** Fetches rates from a fixed URL, never from user-supplied input. */
  private async fetchRates(): Promise<Record<SupportedCurrency, string>> {
    let response: Response;
    try {
      response = await fetch(RATE_URL, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Currency rates are temporarily unavailable. Please try again.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Currency rates are temporarily unavailable. Please try again.',
      );
    }

    let body: ExchangeRateResponse;
    try {
      body = (await response.json()) as ExchangeRateResponse;
    } catch {
      throw new ServiceUnavailableException(
        'Currency rates could not be read. Please try again.',
      );
    }

    if (
      body?.result !== 'success' ||
      body.base_code !== 'LKR' ||
      !body.rates ||
      typeof body.rates !== 'object'
    ) {
      throw new ServiceUnavailableException(
        'Currency rates could not be read. Please try again.',
      );
    }

    const rates = { LKR: '1' } as Record<SupportedCurrency, string>;
    for (const code of SUPPORTED_CURRENCIES) {
      if (code === 'LKR') continue;
      const raw = body.rates[code];
      if (typeof raw !== 'number' && typeof raw !== 'string') {
        throw new ServiceUnavailableException(
          'Currency rates could not be read. Please try again.',
        );
      }
      const fraction = decimalToFraction(raw);
      if (fraction.numerator <= 0n) {
        throw new ServiceUnavailableException(
          'Currency rates could not be read. Please try again.',
        );
      }
      rates[code] = String(raw);
    }

    this.cache = { at: Date.now(), rates };
    return rates;
  }
}

export function parseSupportedCurrency(value: string): SupportedCurrency {
  if (
    typeof value !== 'string' ||
    !SUPPORTED_CURRENCIES.includes(value as SupportedCurrency)
  ) {
    throw new BadRequestException('Unsupported currency.');
  }
  return value as SupportedCurrency;
}

/** Accepts decimal and exponent notation without converting through Number. */
export function decimalToFraction(value: number | string): Fraction {
  const text = String(value).trim();
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!match) {
    throw new ServiceUnavailableException(
      'Currency rates could not be read. Please try again.',
    );
  }

  const exponent = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_EXPONENT) {
    throw new ServiceUnavailableException(
      'Currency rates could not be read. Please try again.',
    );
  }

  const fraction = match[2] ?? '';
  let numerator = BigInt(`${match[1]}${fraction}`);
  let denominator = 10n ** BigInt(fraction.length);

  if (exponent > 0) numerator *= 10n ** BigInt(exponent);
  if (exponent < 0) denominator *= 10n ** BigInt(-exponent);

  return { numerator, denominator };
}

/**
 * The API quotes LKR per one LKR unit, so one source-currency unit is worth
 * 1 / rate rupees. Both minor units are hundredths, so they cancel out.
 */
export function convertToLkrMinor(sourceMinor: bigint, rate: string): bigint {
  const { numerator, denominator } = decimalToFraction(rate);
  return (2n * sourceMinor * denominator + numerator) / (2n * numerator);
}
