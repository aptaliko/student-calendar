import { and, asc, desc, eq, getTableColumns, gte, inArray, lte, lt, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import { lessons, type Lesson, type LessonStatus } from '../schema';

/** A lesson plus how much payments have put towards it so far (may be partial). */
export type LessonWithPaid = Lesson & { allocatedCents: number };

/**
 * Sum of payment allocations for the current `lessons` row. Written with explicit table names on
 * purpose: in a single-table select drizzle renders columns unqualified, and inside this subquery
 * a bare "id" would resolve to payment_allocations.id instead of the outer lesson's id.
 */
export const allocatedCentsSql = sql<number>`coalesce((select sum(pa."amount_cents") from "payment_allocations" pa where pa."lesson_id" = "lessons"."id"), 0)::int`;

const withAllocated = {
  ...getTableColumns(lessons),
  allocatedCents: allocatedCentsSql,
};

export type LessonInput = Pick<
  Lesson,
  'studentId' | 'date' | 'startTime' | 'durationMinutes' | 'priceCents' | 'topic' | 'notes'
> & { status?: LessonStatus; paid?: boolean; seriesId?: string | null };

export async function listLessons(
  ownerId: number,
  opts: { from?: string; to?: string; studentId?: number; status?: LessonStatus[]; before?: string; paid?: boolean } = {},
): Promise<LessonWithPaid[]> {
  const where: SQL[] = [eq(lessons.ownerId, ownerId)];
  if (opts.from) where.push(gte(lessons.date, opts.from));
  if (opts.to) where.push(lte(lessons.date, opts.to));
  if (opts.before) where.push(lt(lessons.date, opts.before));
  if (opts.studentId) where.push(eq(lessons.studentId, opts.studentId));
  if (opts.status) where.push(inArray(lessons.status, opts.status));
  if (opts.paid !== undefined) where.push(eq(lessons.paid, opts.paid));
  return db
    .select(withAllocated)
    .from(lessons)
    .where(and(...where))
    .orderBy(asc(lessons.date), asc(lessons.startTime));
}

export async function listStudentLessons(ownerId: number, studentId: number): Promise<LessonWithPaid[]> {
  return db
    .select(withAllocated)
    .from(lessons)
    .where(and(eq(lessons.ownerId, ownerId), eq(lessons.studentId, studentId)))
    .orderBy(desc(lessons.date), desc(lessons.startTime));
}

export async function getLesson(ownerId: number, id: number): Promise<Lesson | undefined> {
  const [l] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.ownerId, ownerId), eq(lessons.id, id)));
  return l;
}

export async function createLessons(ownerId: number, rows: LessonInput[]): Promise<Lesson[]> {
  if (rows.length === 0) return [];
  return db
    .insert(lessons)
    .values(rows.map((r) => ({ ...r, ownerId })))
    .returning();
}

export async function updateLesson(
  ownerId: number,
  id: number,
  data: Partial<LessonInput>,
): Promise<Lesson | undefined> {
  const [l] = await db
    .update(lessons)
    .set(data)
    .where(and(eq(lessons.ownerId, ownerId), eq(lessons.id, id)))
    .returning();
  return l;
}

/**
 * Deletes one lesson, or — with `series: 'future'` — it and every later lesson in its series.
 * Their payment allocations go with them (cascade), returning that money to the student's credit.
 */
export async function deleteLesson(
  ownerId: number,
  id: number,
  series?: 'future',
): Promise<{ count: number; studentId: number | null }> {
  const lesson = await getLesson(ownerId, id);
  if (!lesson) return { count: 0, studentId: null };
  const where =
    series === 'future' && lesson.seriesId
      ? and(eq(lessons.ownerId, ownerId), eq(lessons.seriesId, lesson.seriesId), gte(lessons.date, lesson.date))
      : and(eq(lessons.ownerId, ownerId), eq(lessons.id, id));
  const rows = await db.delete(lessons).where(where).returning({ id: lessons.id });
  return { count: rows.length, studentId: lesson.studentId };
}
