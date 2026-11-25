export function minorToMajor(minor: string): number {
  return Number(BigInt(minor)) / 100;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatRupees(minor: string): string {
  return `Rs. ${formatNumber(minorToMajor(minor))}`;
}

export function formatMajor(amount: number): string {
  return `Rs. ${formatNumber(amount)}`;
}

const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;

export function formatPercent(value: number): string {
  return value < 100 ? value.toFixed(1) : String(Math.round(value));
}

/** Exact-major-unit percentage from integer minor units, safe for big values. */
export function calculatePercent(raisedMinor: string, goalMinor: string): number {
  const goal = BigInt(goalMinor);
  if (goal <= 0n) return 0;
  const ratio = Number((BigInt(raisedMinor) * 10000n) / goal) / 100;
  return Math.min(Math.max(ratio, 0), 100);
}

export function isValidAmount(input: string): boolean {
  if (!AMOUNT_PATTERN.test(input)) return false;
  const value = Number(input);
  return value >= 1 && value <= 10_000_000;
}
