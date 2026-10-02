import { describe, expect, it } from 'vitest';
import { allocatePayment } from './payments';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

describe('allocatePayment', () => {
  it('gives each lesson its price when the amount matches', () => {
    expect(allocatePayment(5300, [2500, 2800])).toEqual([2500, 2800]);
  });

  it('spreads a discount proportionally and always adds up exactly', () => {
    const shares = allocatePayment(10000, [2800, 2800, 2800, 2800, 2800]); // 140 € paid as 100 €
    expect(sum(shares)).toBe(10000);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
    const odd = allocatePayment(1000, [3, 3, 3]);
    expect(sum(odd)).toBe(1000);
  });

  it('handles overpayment and free lessons', () => {
    expect(sum(allocatePayment(6000, [2500, 2500]))).toBe(6000);
    expect(allocatePayment(900, [0, 0, 0])).toEqual([300, 300, 300]);
    expect(allocatePayment(100, [])).toEqual([]);
  });
});
