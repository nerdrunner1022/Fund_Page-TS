import { generateReferenceCode } from './reference-code';

describe('generateReferenceCode', () => {
  it('uses the prefix and avoids ambiguous characters', () => {
    const code = generateReferenceCode();
    expect(code).toMatch(/^ZCLF-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
  });

  it('generates distinct codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferenceCode()));
    expect(codes.size).toBeGreaterThan(95);
  });
});
