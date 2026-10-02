import type { PaymentMethod } from '@/db/schema';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Μετρητά',
  card: 'Κάρτα',
  transfer: 'Τραπεζική μεταφορά',
  other: 'Άλλο',
};

/** Money actually received in a period: recorded payments dated in it, plus lessons in it that
 *  were ticked "paid" by hand (no payment record, so the lesson price is the amount). */
export function collectedCents(
  periodPayments: { amountCents: number }[],
  periodLessons: { paid: boolean; paymentId: number | null; priceCents: number; status: string }[],
): number {
  const fromPayments = periodPayments.reduce((s, p) => s + p.amountCents, 0);
  const manual = periodLessons
    .filter((l) => l.paid && l.paymentId === null && (l.status === 'attended' || l.status === 'no_show'))
    .reduce((s, l) => s + l.priceCents, 0);
  return fromPayments + manual;
}
