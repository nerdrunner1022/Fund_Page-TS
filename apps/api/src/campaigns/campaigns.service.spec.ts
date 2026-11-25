import { calculatePercent } from './campaigns.service';

describe('calculatePercent', () => {
  it('caps progress at 100', () => {
    expect(calculatePercent('6000000000', '4800000000')).toBe(100);
  });

  it('rounds to two decimals', () => {
    expect(calculatePercent('123456700', '4800000000')).toBe(2.57);
  });

  it('returns zero for a zero goal', () => {
    expect(calculatePercent('100', '0')).toBe(0);
  });
});
