import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from '../client';
import { allocatedCentsSql } from './lessons';
import { lessons, paymentAllocations, payments, type Payment, type PaymentMethod } from '../schema';
import { planCredit, planTargeted, remainingCredit, type Allocation, type CreditSource, type DueLesson } from '@/lib/payments';

/** A payment with what it has paid for so far (it has no date of its own). */
export type PaymentWithUsage = Payment & {
  allocatedCents: number;
  /** Lessons it has paid towards (fully or partly). */
  allocatedLessons: number;
  firstDate: string | null;
  lastDate: string | null;
};

const CHARGED = ['attended', 'no_show'] as const;

const usage = {
  allocatedCents: sql<number>`coalesce(sum(${paymentAllocations.amountCents}), 0)::int`,
  allocatedLessons: sql<number>`count(${paymentAllocations.id})::int`,
  firstDate: sql<string | null>`min(${lessons.date})`,
  lastDate: sql<string | null>`max(${lessons.date})`,
};

/**
 * Payments with their usage, newest first. With `from`/`to`, only payments that paid for at
 * least one lesson in that range — i.e. payments *for* that month, whenever received.
 */
export async function listPayments(
  ownerId: number,
  opts: { from?: string; to?: string; studentId?: number } = {},
): Promise<PaymentWithUsage[]> {
  const where: SQL[] = [eq(payments.ownerId, ownerId)];
  if (opts.studentId) where.push(eq(payments.studentId, opts.studentId));
  if (opts.from || opts.to) {
    const range: SQL[] = [];
    if (opts.from) range.push(gte(lessons.date, opts.from));
    if (opts.to) range.push(lte(lessons.date, opts.to));
    where.push(
      sql`exists (select 1 from ${paymentAllocations} join ${lessons} on ${lessons.id} = ${paymentAllocations.lessonId}
        where ${paymentAllocations.paymentId} = ${payments.id} and ${and(...range)})`,
    );
  }
  const rows = await db
    .select({ payment: payments, ...usage })
    .from(payments)
    .leftJoin(paymentAllocations, eq(paymentAllocations.paymentId, payments.id))
    .leftJoin(lessons, eq(lessons.id, paymentAllocations.lessonId))
    .where(and(...where))
    .groupBy(payments.id)
    .orderBy(desc(payments.createdAt), desc(payments.id));
  return rows.map((r) => ({
    ...r.payment,
    allocatedCents: Number(r.allocatedCents),
    allocatedLessons: Number(r.allocatedLessons),
    firstDate: r.firstDate,
    lastDate: r.lastDate,
  }));
}

/** Unused prepayment per student: money left and package lessons left. */
export async function creditByStudent(ownerId: number, studentId?: number): Promise<Map<number, { cents: number; lessons: number }>> {
  const map = new Map<number, { cents: number; lessons: number }>();
  for (const p of await listPayments(ownerId, { studentId })) {
    const left = remainingCredit(p);
    if (left.cents <= 0 && !left.lessons) continue;
    const cur = map.get(p.studentId) ?? { cents: 0, lessons: 0 };
    cur.cents += left.cents;
    cur.lessons += left.lessons ?? 0;
    map.set(p.studentId, cur);
  }
  return map;
}

async function creditSources(ownerId: number, studentId: number): Promise<CreditSource[]> {
  const rows = await db
    .select({ payment: payments, allocatedCents: usage.allocatedCents, allocatedLessons: usage.allocatedLessons })
    .from(payments)
    .leftJoin(paymentAllocations, eq(paymentAllocations.paymentId, payments.id))
    .where(and(eq(payments.ownerId, ownerId), eq(payments.studentId, studentId)))
    .groupBy(payments.id)
    .orderBy(asc(payments.createdAt), asc(payments.id));
  return rows.map((r) => ({
    id: r.payment.id,
    amountCents: r.payment.amountCents,
    lessonCount: r.payment.lessonCount,
    allocatedCents: Number(r.allocatedCents),
    allocatedLessons: Number(r.allocatedLessons),
  }));
}

/** Charged, unpaid lessons of a student (optionally only `ids`), oldest first, with what is still due. */
async function dueLessons(ownerId: number, studentId: number, ids?: number[]): Promise<DueLesson[]> {
  const where: SQL[] = [
    eq(lessons.ownerId, ownerId),
    eq(lessons.studentId, studentId),
    eq(lessons.paid, false),
    inArray(lessons.status, [...CHARGED]),
  ];
  if (ids) where.push(inArray(lessons.id, ids));
  const rows = await db
    .select({
      id: lessons.id,
      priceCents: lessons.priceCents,
      allocatedCents: allocatedCentsSql,
    })
    .from(lessons)
    .where(and(...where))
    .orderBy(asc(lessons.date), asc(lessons.startTime), asc(lessons.id));
  return rows.map((r) => ({ id: r.id, dueCents: Math.max(0, r.priceCents - Number(r.allocatedCents)) }));
}

/** Writes allocations and marks settled lessons paid, as one atomic batch. */
async function record(allocations: Allocation[], settled: number[]): Promise<void> {
  const items: BatchItem<'pg'>[] = [];
  const rows = allocations.filter((a) => a.amountCents > 0);
  if (rows.length) items.push(db.insert(paymentAllocations).values(rows));
  if (settled.length) items.push(db.update(lessons).set({ paid: true }).where(inArray(lessons.id, settled)));
  if (items.length) await db.batch(items as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
}

/**
 * Spends a student's unused prepayments on their charged, unpaid lessons, oldest first.
 * Called whenever credit or charged lessons change. Returns the ids of lessons it fully paid.
 */
export async function applyCredit(ownerId: number, studentId: number): Promise<number[]> {
  const [sources, due] = await Promise.all([creditSources(ownerId, studentId), dueLessons(ownerId, studentId)]);
  if (due.length === 0 || sources.every((s) => remainingCredit(s).cents <= 0 && !remainingCredit(s).lessons)) return [];
  const plan = planCredit(sources, due);
  await record(plan.allocations, plan.settled);
  return plan.settled;
}

/** Takes back everything paid towards a lesson (it becomes unpaid; the money returns to credit). */
export async function releaseLesson(ownerId: number, lessonId: number): Promise<void> {
  await db.batch([
    db.delete(paymentAllocations).where(
      and(
        eq(paymentAllocations.lessonId, lessonId),
        sql`exists (select 1 from "lessons" l where l."id" = ${lessonId} and l."owner_id" = ${ownerId})`,
      ),
    ),
    db.update(lessons).set({ paid: false }).where(and(eq(lessons.ownerId, ownerId), eq(lessons.id, lessonId))),
  ]);
}

export type NewPayment = {
  studentId: number;
  amountCents: number;
  method: PaymentMethod;
  notes: string | null;
  /** Lessons to pay now (oldest first); any extra money stays as prepayment. Ignored for packages. */
  lessonIds: number[];
  /** When the amount is less than the lessons' total: a discount on all, or pay oldest first. */
  shortfall: 'discount' | 'oldest';
  /** Package size; each lesson then uses an equal share and unpaid lessons are covered oldest first. */
  lessonCount: number | null;
};

export type PaymentResult = { payment: Payment; lessonsPaid: number; credit: { cents: number; lessons: number | null } };

/** Records a payment, pays the chosen lessons, then lets any remaining credit pay older dues. */
export async function createPayment(ownerId: number, data: NewPayment): Promise<PaymentResult> {
  const [payment] = await db
    .insert(payments)
    .values({
      ownerId,
      studentId: data.studentId,
      amountCents: data.amountCents,
      method: data.method,
      notes: data.notes,
      lessonCount: data.lessonCount,
    })
    .returning();

  let paidNow: number[] = [];
  if (data.lessonCount === null && data.lessonIds.length > 0) {
    const due = await dueLessons(ownerId, data.studentId, data.lessonIds);
    const plan = planTargeted(data.amountCents, due, data.shortfall);
    const allocations = due.map((l, i) => ({ paymentId: payment.id, lessonId: l.id, amountCents: plan.shares[i] }));
    paidNow = due.filter((_, i) => plan.settled[i]).map((l) => l.id);
    await record(allocations, paidNow);
  }
  const paidByCredit = await applyCredit(ownerId, data.studentId);

  const [mine] = (await creditSources(ownerId, data.studentId)).filter((s) => s.id === payment.id);
  return { payment, lessonsPaid: new Set([...paidNow, ...paidByCredit]).size, credit: remainingCredit(mine) };
}

/** Deletes a payment; the lessons it paid become unpaid unless other credit covers them. */
export async function deletePayment(ownerId: number, id: number): Promise<boolean> {
  const [payment] = await db
    .select({ id: payments.id, studentId: payments.studentId })
    .from(payments)
    .where(and(eq(payments.ownerId, ownerId), eq(payments.id, id)));
  if (!payment) return false;
  const affected = await db
    .select({ lessonId: paymentAllocations.lessonId })
    .from(paymentAllocations)
    .where(eq(paymentAllocations.paymentId, id));
  const ids = affected.map((a) => a.lessonId);
  const items: BatchItem<'pg'>[] = [db.delete(payments).where(and(eq(payments.ownerId, ownerId), eq(payments.id, id)))];
  if (ids.length) items.push(db.update(lessons).set({ paid: false }).where(and(eq(lessons.ownerId, ownerId), inArray(lessons.id, ids))));
  await db.batch(items as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
  await applyCredit(ownerId, payment.studentId);
  return true;
}

/** Pays off everything a student owes in one payment of the exact amount. Returns lessons paid. */
export async function settleStudent(ownerId: number, studentId: number): Promise<number> {
  const due = await dueLessons(ownerId, studentId);
  if (due.length === 0) return 0;
  const result = await createPayment(ownerId, {
    studentId,
    amountCents: due.reduce((s, l) => s + l.dueCents, 0),
    method: 'cash',
    notes: null,
    lessonIds: due.map((l) => l.id),
    shortfall: 'discount',
    lessonCount: null,
  });
  return result.lessonsPaid;
}
