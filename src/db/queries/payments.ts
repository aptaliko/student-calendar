import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import { lessons, payments, type Payment, type PaymentMethod } from '../schema';
import { allocatePayment } from '@/lib/payments';

/** A payment plus the span of lesson dates it covers (it has no date of its own). */
export type PaymentWithCount = Payment & { lessonCount: number; firstDate: string | null; lastDate: string | null };

const CHARGED = ['attended', 'no_show'] as const;

/**
 * Payments, newest first. With `from`/`to`, only payments covering at least one lesson in that
 * range — i.e. payments *for* that month, whenever they were received.
 */
export async function listPayments(
  ownerId: number,
  opts: { from?: string; to?: string; studentId?: number } = {},
): Promise<PaymentWithCount[]> {
  const where: SQL[] = [eq(payments.ownerId, ownerId)];
  if (opts.studentId) where.push(eq(payments.studentId, opts.studentId));
  if (opts.from || opts.to) {
    const inRange: SQL[] = [eq(lessons.paymentId, payments.id)];
    if (opts.from) inRange.push(gte(lessons.date, opts.from));
    if (opts.to) inRange.push(lte(lessons.date, opts.to));
    where.push(sql`exists (select 1 from ${lessons} where ${and(...inRange)})`);
  }
  const rows = await db
    .select({
      payment: payments,
      lessonCount: sql<number>`count(${lessons.id})::int`,
      firstDate: sql<string | null>`min(${lessons.date})`,
      lastDate: sql<string | null>`max(${lessons.date})`,
    })
    .from(payments)
    .leftJoin(lessons, eq(lessons.paymentId, payments.id))
    .where(and(...where))
    .groupBy(payments.id)
    .orderBy(desc(payments.createdAt), desc(payments.id));
  return rows.map((r) => ({ ...r.payment, lessonCount: Number(r.lessonCount), firstDate: r.firstDate, lastDate: r.lastDate }));
}

/**
 * Records a payment for the given lessons and splits its amount across them (`paidCents`).
 * Only charged, still-unpaid lessons of that student are taken; returns null when none qualify.
 */
export async function createPayment(
  ownerId: number,
  data: { studentId: number; amountCents: number; method: PaymentMethod; notes: string | null; lessonIds: number[] },
): Promise<PaymentWithCount | null> {
  const { lessonIds, ...fields } = data;
  const eligible = await db
    .select({ id: lessons.id, priceCents: lessons.priceCents, date: lessons.date })
    .from(lessons)
    .where(
      and(
        eq(lessons.ownerId, ownerId),
        eq(lessons.studentId, data.studentId),
        inArray(lessons.id, lessonIds),
        inArray(lessons.status, [...CHARGED]),
        eq(lessons.paid, false),
      ),
    );
  if (eligible.length === 0) return null;

  const [payment] = await db
    .insert(payments)
    .values({ ...fields, ownerId })
    .returning();
  const shares = allocatePayment(
    data.amountCents,
    eligible.map((l) => l.priceCents),
  );
  // neon-http has no interactive transactions; a batch runs atomically.
  const [first, ...rest] = eligible.map((l, i) =>
    db
      .update(lessons)
      .set({ paid: true, paymentId: payment.id, paidCents: shares[i] })
      .where(and(eq(lessons.ownerId, ownerId), eq(lessons.id, l.id))),
  );
  await db.batch([first, ...rest]);

  const dates = eligible.map((l) => l.date).sort();
  return { ...payment, lessonCount: eligible.length, firstDate: dates[0], lastDate: dates[dates.length - 1] };
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
      .set({ paid: false, paymentId: null, paidCents: null })
      .where(and(eq(lessons.ownerId, ownerId), eq(lessons.paymentId, id))),
    db.delete(payments).where(and(eq(payments.ownerId, ownerId), eq(payments.id, id))),
  ]);
  return true;
}

/** Pays off everything a student owes in one payment of the exact amount. Returns lessons paid. */
export async function settleStudent(ownerId: number, studentId: number): Promise<number> {
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
    amountCents: unpaid.reduce((s, l) => s + l.priceCents, 0),
    method: 'cash',
    notes: null,
    lessonIds: unpaid.map((l) => l.id),
  });
  return payment?.lessonCount ?? 0;
}
