import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import { lessons, payments, type Payment, type PaymentMethod } from '../schema';

export type PaymentWithCount = Payment & { lessonCount: number };

const CHARGED = ['attended', 'no_show'] as const;

export async function listPayments(
  ownerId: number,
  opts: { from?: string; to?: string; studentId?: number } = {},
): Promise<PaymentWithCount[]> {
  const where: SQL[] = [eq(payments.ownerId, ownerId)];
  if (opts.from) where.push(gte(payments.date, opts.from));
  if (opts.to) where.push(lte(payments.date, opts.to));
  if (opts.studentId) where.push(eq(payments.studentId, opts.studentId));
  const rows = await db
    .select({ payment: payments, lessonCount: sql<number>`count(${lessons.id})::int` })
    .from(payments)
    .leftJoin(lessons, eq(lessons.paymentId, payments.id))
    .where(and(...where))
    .groupBy(payments.id)
    .orderBy(desc(payments.date), desc(payments.id));
  return rows.map((r) => ({ ...r.payment, lessonCount: Number(r.lessonCount) }));
}

/**
 * Records a payment and marks the given lessons paid. Only charged, still-unpaid lessons of
 * that student are taken; if none qualify the payment is rolled back and null is returned.
 * (neon-http has no interactive transactions, hence the compensating delete.)
 */
export async function createPayment(
  ownerId: number,
  data: { studentId: number; date: string; amountCents: number; method: PaymentMethod; notes: string | null; lessonIds: number[] },
): Promise<PaymentWithCount | null> {
  const { lessonIds, ...fields } = data;
  const [payment] = await db
    .insert(payments)
    .values({ ...fields, ownerId })
    .returning();
  const updated = await db
    .update(lessons)
    .set({ paid: true, paymentId: payment.id })
    .where(
      and(
        eq(lessons.ownerId, ownerId),
        eq(lessons.studentId, data.studentId),
        inArray(lessons.id, lessonIds),
        inArray(lessons.status, [...CHARGED]),
        eq(lessons.paid, false),
      ),
    )
    .returning({ id: lessons.id });
  if (updated.length === 0) {
    await db.delete(payments).where(eq(payments.id, payment.id));
    return null;
  }
  return { ...payment, lessonCount: updated.length };
}

/** Deletes a payment and marks its lessons unpaid again (atomically, as one batch). */
export async function deletePayment(ownerId: number, id: number): Promise<boolean> {
  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.ownerId, ownerId), eq(payments.id, id)));
  if (!payment) return false;
  await db.batch([
    db
      .update(lessons)
      .set({ paid: false, paymentId: null })
      .where(and(eq(lessons.ownerId, ownerId), eq(lessons.paymentId, id))),
    db.delete(payments).where(and(eq(payments.ownerId, ownerId), eq(payments.id, id))),
  ]);
  return true;
}

/** Pays off everything a student owes in one payment of the exact amount. Returns lessons paid. */
export async function settleStudent(ownerId: number, studentId: number, date: string): Promise<number> {
  const unpaid = await db
    .select({ id: lessons.id, priceCents: lessons.priceCents })
    .from(lessons)
    .where(
      and(
        eq(lessons.ownerId, ownerId),
        eq(lessons.studentId, studentId),
        eq(lessons.paid, false),
        inArray(lessons.status, [...CHARGED]),
      ),
    );
  if (unpaid.length === 0) return 0;
  const payment = await createPayment(ownerId, {
    studentId,
    date,
    amountCents: unpaid.reduce((s, l) => s + l.priceCents, 0),
    method: 'cash',
    notes: null,
    lessonIds: unpaid.map((l) => l.id),
  });
  return payment?.lessonCount ?? 0;
}
