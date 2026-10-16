import { describe, expect, it } from 'vitest';
import { allocatePayment, packageShare, planCredit, planTargeted, remainingCredit, type CreditSource } from './payments';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const money = (id: number, amountCents: number, allocatedCents = 0): CreditSource => ({ id, amountCents, lessonCount: null, allocatedCents, allocatedLessons: 0 });
const pack = (id: number, amountCents: number, lessonCount: number, allocatedLessons = 0, allocatedCents = 0): CreditSource => ({ id, amountCents, lessonCount, allocatedCents, allocatedLessons });

describe('allocatePayment', () => {
  it('gives each lesson its price when the amount matches', () => {
    expect(allocatePayment(5300, [2500, 2800])).toEqual([2500, 2800]);
  });

  it('spreads a discount proportionally and always adds up exactly', () => {
    const shares = allocatePayment(10000, [2800, 2800, 2800, 2800, 2800]);
    expect(sum(shares)).toBe(10000);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
    expect(sum(allocatePayment(1000, [3, 3, 3]))).toBe(1000);
  });

  it('handles free lessons and empty lists', () => {
    expect(allocatePayment(900, [0, 0, 0])).toEqual([300, 300, 300]);
    expect(allocatePayment(100, [])).toEqual([]);
  });
});

describe('packages', () => {
  it('values each package lesson equally and adds up to the price', () => {
    expect(packageShare(23000, 10, 0)).toBe(2300);
    const shares = [0, 1, 2].map((i) => packageShare(10000, 3, i));
    expect(sum(shares)).toBe(10000);
  });

  it('reports lessons and money left', () => {
    expect(remainingCredit(pack(1, 23000, 10, 3, 6900))).toEqual({ cents: 16100, lessons: 7 });
    expect(remainingCredit(pack(1, 23000, 10, 10, 23000))).toEqual({ cents: 0, lessons: 0 });
    expect(remainingCredit(money(1, 5000, 2000))).toEqual({ cents: 3000, lessons: null });
  });
});

describe('planCredit', () => {
  it('pays the oldest lessons first and keeps the rest as credit', () => {
    const { allocations, settled } = planCredit([money(1, 10000)], [
      { id: 11, dueCents: 2500 },
      { id: 12, dueCents: 2500 },
    ]);
    expect(settled).toEqual([11, 12]);
    expect(allocations).toEqual([
      { paymentId: 1, lessonId: 11, amountCents: 2500 },
      { paymentId: 1, lessonId: 12, amountCents: 2500 },
    ]);
  });

  it('covers a lesson partly when the credit runs short, and finishes it with the next payment', () => {
    const first = planCredit([money(1, 1000)], [{ id: 11, dueCents: 2500 }]);
    expect(first.settled).toEqual([]);
    expect(first.allocations).toEqual([{ paymentId: 1, lessonId: 11, amountCents: 1000 }]);
    // next payment: the old one is used up, the new one pays the remaining 15 €
    const second = planCredit([money(1, 1000, 1000), money(2, 5000)], [{ id: 11, dueCents: 1500 }]);
    expect(second.settled).toEqual([11]);
    expect(second.allocations).toEqual([{ paymentId: 2, lessonId: 11, amountCents: 1500 }]);
  });

  it('settles whole lessons from a package at the package price, oldest payment first', () => {
    const { allocations, settled } = planCredit([pack(1, 23000, 10, 9, 20700), money(2, 5000)], [
      { id: 11, dueCents: 2500 },
      { id: 12, dueCents: 2500 },
    ]);
    expect(settled).toEqual([11, 12]);
    expect(allocations).toEqual([
      { paymentId: 1, lessonId: 11, amountCents: 2300 }, // last package lesson
      { paymentId: 2, lessonId: 12, amountCents: 2500 }, // then money credit
    ]);
  });

  it('does nothing without credit', () => {
    expect(planCredit([money(1, 2000, 2000)], [{ id: 11, dueCents: 2500 }])).toEqual({ allocations: [], settled: [] });
  });
});

describe('planTargeted', () => {
  const lessons = [
    { id: 1, dueCents: 2500 },
    { id: 2, dueCents: 2500 },
  ];

  it('pays in full and leaves the extra as prepayment', () => {
    expect(planTargeted(10000, lessons, 'discount')).toEqual({ shares: [2500, 2500], settled: [true, true], leftoverCents: 5000 });
  });

  it('treats a smaller amount as a discount on all of them', () => {
    const r = planTargeted(4000, lessons, 'discount');
    expect(sum(r.shares)).toBe(4000);
    expect(r.settled).toEqual([true, true]);
  });

  it('or as a partial payment, oldest first', () => {
    expect(planTargeted(4000, lessons, 'oldest')).toEqual({ shares: [2500, 1500], settled: [true, false], leftoverCents: 0 });
  });
});
