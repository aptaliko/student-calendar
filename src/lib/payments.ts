import type { PaymentMethod } from '@/db/schema';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Μετρητά',
  card: 'Κάρτα',
  transfer: 'Τραπεζική μεταφορά',
  other: 'Άλλο',
};

/**
 * Splits a payment across lessons in proportion to their prices (largest-remainder rounding),
 * so the shares always add up to exactly `amountCents`. With a discount every lesson gets
 * proportionally less; this is what lets "collected" be reported per month of the lessons.
 */
export function allocatePayment(amountCents: number, prices: number[]): number[] {
  if (prices.length === 0) return [];
  const total = prices.reduce((s, p) => s + p, 0);
  const weights = total > 0 ? prices : prices.map(() => 1);
  const weightSum = total > 0 ? total : prices.length;
  const exact = weights.map((w) => (amountCents * w) / weightSum);
  const shares = exact.map(Math.floor);
  let remainder = amountCents - shares.reduce((s, v) => s + v, 0);
  const order = exact.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; remainder > 0; k = (k + 1) % order.length, remainder--) shares[order[k][1]]++;
  return shares;
}
