import type { PaymentMethod } from '@/db/schema';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Μετρητά',
  card: 'Κάρτα',
  transfer: 'Τραπεζική μεταφορά',
  other: 'Άλλο',
};

/**
 * Splits an amount across lessons in proportion to their weights (largest-remainder rounding),
 * so the shares always add up to exactly `amountCents`.
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

/** Value of lesson number `slot` (0-based) in a package of `count` lessons costing `amountCents`. */
export function packageShare(amountCents: number, count: number, slot: number): number {
  return allocatePayment(amountCents, Array.from({ length: count }, () => 1))[slot] ?? 0;
}

/** A payment as a source of credit: what it was, and how much of it lessons have used so far. */
export type CreditSource = {
  id: number;
  amountCents: number;
  /** Package size in lessons; null for plain money credit. */
  lessonCount: number | null;
  allocatedCents: number;
  allocatedLessons: number;
};

/** A charged, unpaid lesson and what is still due on it (price minus any partial allocations). */
export type DueLesson = { id: number; dueCents: number };

export type Allocation = { paymentId: number; lessonId: number; amountCents: number };

/** What a payment still has to give: money left, and for packages, lessons left. */
export function remainingCredit(p: CreditSource): { cents: number; lessons: number | null } {
  if (p.lessonCount !== null) {
    const lessons = Math.max(0, p.lessonCount - p.allocatedLessons);
    return { cents: lessons === 0 ? 0 : Math.max(0, p.amountCents - p.allocatedCents), lessons };
  }
  return { cents: Math.max(0, p.amountCents - p.allocatedCents), lessons: null };
}

/**
 * Spends available credit on due lessons, oldest lesson first and oldest payment first.
 *  - A package slot settles a whole lesson at the package's per-lesson value.
 *  - Money credit pays up to what is due; a lesson it can't fully cover gets a partial
 *    allocation and stays unpaid (the next payment only needs the rest).
 * Returns the allocations to record and the ids of lessons that are now fully paid.
 */
export function planCredit(sources: CreditSource[], lessons: DueLesson[]): { allocations: Allocation[]; settled: number[] } {
  const state = sources.map((s) => ({ ...s }));
  const allocations: Allocation[] = [];
  const settled: number[] = [];

  for (const lesson of lessons) {
    let due = lesson.dueCents;
    for (const p of state) {
      if (due <= 0) break;
      const left = remainingCredit(p);
      if (p.lessonCount !== null) {
        if (!left.lessons) continue;
        const share = packageShare(p.amountCents, p.lessonCount, p.allocatedLessons);
        allocations.push({ paymentId: p.id, lessonId: lesson.id, amountCents: share });
        p.allocatedCents += share;
        p.allocatedLessons += 1;
        due = 0;
        break;
      }
      if (left.cents <= 0) continue;
      const take = Math.min(left.cents, due);
      allocations.push({ paymentId: p.id, lessonId: lesson.id, amountCents: take });
      p.allocatedCents += take;
      p.allocatedLessons += 1;
      due -= take;
    }
    if (due <= 0) settled.push(lesson.id);
  }
  return { allocations, settled };
}

/**
 * A payment for specific lessons (oldest first). With enough money every lesson is paid in
 * full and the rest is left over as credit. With less: 'discount' settles them all with
 * proportionally smaller shares; 'oldest' pays the oldest in full and the next one partly.
 */
export function planTargeted(
  amountCents: number,
  lessons: DueLesson[],
  shortfall: 'discount' | 'oldest',
): { shares: number[]; settled: boolean[]; leftoverCents: number } {
  const total = lessons.reduce((s, l) => s + l.dueCents, 0);
  if (amountCents >= total) {
    return { shares: lessons.map((l) => l.dueCents), settled: lessons.map(() => true), leftoverCents: amountCents - total };
  }
  if (shortfall === 'discount') {
    return { shares: allocatePayment(amountCents, lessons.map((l) => l.dueCents)), settled: lessons.map(() => true), leftoverCents: 0 };
  }
  let left = amountCents;
  const shares = lessons.map((l) => {
    const take = Math.min(left, l.dueCents);
    left -= take;
    return take;
  });
  return { shares, settled: lessons.map((l, i) => shares[i] >= l.dueCents), leftoverCents: 0 };
}
