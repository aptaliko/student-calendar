import { and, asc, desc, eq, gte, inArray, lte, lt, type SQL } from 'drizzle-orm';
import { db } from '../client';
import { lessons, type Lesson, type LessonStatus } from '../schema';

export type LessonInput = Pick<
  Lesson,
  'studentId' | 'date' | 'startTime' | 'durationMinutes' | 'priceCents' | 'topic' | 'notes'
> & { status?: LessonStatus; paid?: boolean; seriesId?: string | null };

export async function listLessons(
  ownerId: number,
  opts: { from?: string; to?: string; studentId?: number; status?: LessonStatus[]; before?: string } = {},
): Promise<Lesson[]> {
  const where: SQL[] = [eq(lessons.ownerId, ownerId)];
  if (opts.from) where.push(gte(lessons.date, opts.from));
  if (opts.to) where.push(lte(lessons.date, opts.to));
  if (opts.before) where.push(lt(lessons.date, opts.before));
  if (opts.studentId) where.push(eq(lessons.studentId, opts.studentId));
  if (opts.status) where.push(inArray(lessons.status, opts.status));
  return db
    .select()
    .from(lessons)
    .where(and(...where))
    .orderBy(asc(lessons.date), asc(lessons.startTime));
}

export async function listStudentLessons(ownerId: number, studentId: number): Promise<Lesson[]> {
  return db
    .select()
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

/** Deletes one lesson, or — with `series: 'future'` — it and every later lesson in its series. */
export async function deleteLesson(ownerId: number, id: number, series?: 'future'): Promise<number> {
  const lesson = await getLesson(ownerId, id);
  if (!lesson) return 0;
  const where =
    series === 'future' && lesson.seriesId
      ? and(eq(lessons.ownerId, ownerId), eq(lessons.seriesId, lesson.seriesId), gte(lessons.date, lesson.date))
      : and(eq(lessons.ownerId, ownerId), eq(lessons.id, id));
  const rows = await db.delete(lessons).where(where).returning({ id: lessons.id });
  return rows.length;
}

/** Marks every charged, unpaid lesson of a student as paid. */
export async function settleStudent(ownerId: number, studentId: number): Promise<number> {
  const rows = await db
    .update(lessons)
    .set({ paid: true })
    .where(
      and(
        eq(lessons.ownerId, ownerId),
        eq(lessons.studentId, studentId),
        eq(lessons.paid, false),
        inArray(lessons.status, ['attended', 'no_show']),
      ),
    )
    .returning({ id: lessons.id });
  return rows.length;
}
