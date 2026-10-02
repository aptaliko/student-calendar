import { describe, expect, it } from 'vitest';
import { collectedCents } from './payments';

describe('collectedCents', () => {
  it('adds payment amounts and hand-ticked paid lessons, without double counting', () => {
    const total = collectedCents(
      [{ amountCents: 20000 }], // e.g. 10 lessons worth 250 € paid with a discount
      [
        { paid: true, paymentId: 1, priceCents: 2500, status: 'attended' }, // covered by the payment
        { paid: true, paymentId: null, priceCents: 3000, status: 'attended' }, // ticked by hand
        { paid: false, paymentId: null, priceCents: 3000, status: 'no_show' },
      ],
    );
    expect(total).toBe(23000);
  });
});
