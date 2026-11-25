import { describe, expect, it } from 'vitest';
import {
  calculatePercent,
  formatMajor,
  formatPercent,
  formatRupees,
  isValidAmount,
  minorToMajor,
} from './money';

describe('money formatting', () => {
  it('converts minor units without floating point drift', () => {
    expect(minorToMajor('4800000000')).toBe(48_000_000);
    expect(minorToMajor('123456')).toBe(1234.56);
  });

  it('formats whole and fractional rupees for the Sri Lankan locale', () => {
    expect(formatRupees('4800000000')).toBe('Rs. 48,000,000');
    expect(formatRupees('123456')).toBe('Rs. 1,234.56');
    expect(formatMajor(5000)).toBe('Rs. 5,000');
  });

  it('formats progress percentages', () => {
    expect(formatPercent(0.01)).toBe('0.0');
    expect(formatPercent(12.345)).toBe('12.3');
    expect(formatPercent(100)).toBe('100');
  });

  it('calculates exact percentages from minor-unit strings', () => {
    expect(calculatePercent('250000', '4800000000')).toBe(0);
    expect(calculatePercent('500000', '4800000000')).toBe(0.01);
    expect(calculatePercent('4800000000', '4800000000')).toBe(100);
    expect(calculatePercent('5000000000', '4800000000')).toBe(100);
    expect(calculatePercent('100', '0')).toBe(0);
  });
});

describe('isValidAmount', () => {
  it.each(['1', '1000', '2500.50', '10000000'])(
    'accepts %p',
    (input) => {
      expect(isValidAmount(input)).toBe(true);
    },
  );

  it.each(['', '0', '0.50', '10000000.01', '12.345', '1e3', '-5', 'abc'])(
    'rejects %p',
    (input) => {
      expect(isValidAmount(input)).toBe(false);
    },
  );
});
