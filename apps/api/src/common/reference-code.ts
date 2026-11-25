import { randomBytes } from 'node:crypto';

// Omits look-alike characters (I, L, O, 0, 1) for slips read by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferenceCode(prefix = 'ZCLF'): string {
  const bytes = randomBytes(5);
  let suffix = '';
  for (const byte of bytes) {
    suffix += ALPHABET[byte % ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}
