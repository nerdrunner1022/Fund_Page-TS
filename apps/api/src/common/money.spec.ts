import { parseAmountToMinor } from './money';

describe('parseAmountToMinor', () => {
  it('converts whole rupees to exact minor units', () => {
    expect(parseAmountToMinor('5000').toString()).toBe('500000');
  });

  it('converts two decimals without floating point drift', () => {
    expect(parseAmountToMinor('1234.56').toString()).toBe('123456');
  });

  it('accepts the upper bound', () => {
    expect(parseAmountToMinor('10000000').toString()).toBe('1000000000');
  });

  it.each(['0', '0.50', '10000000.01', '12.345', '-5', 'abc', '', '1e3', ' 100 '])(
    'rejects invalid amount %p',
    (input) => {
      expect(() => parseAmountToMinor(input)).toThrow();
    },
  );
});
