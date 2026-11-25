import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl, formatPhone } from './wa';

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me link with an encoded message', () => {
    expect(buildWhatsAppUrl('9477 297 6911', 'Hello world')).toBe(
      'https://wa.me/94772976911?text=Hello%20world',
    );
  });
});

describe('formatPhone', () => {
  it('formats Sri Lankan mobile numbers locally', () => {
    expect(formatPhone('94772976911')).toBe('077 2976 911');
  });

  it('leaves other numbers untouched', () => {
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });
});
