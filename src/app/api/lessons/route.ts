import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createLessons, listLessons } from '@/db/queries/lessons';
import { getStudent } from '@/db/queries/students';
import { seriesDates } from '@/lib/lessons';
import type { LessonStatus } from '@/db/schema';
import { getUserId } from '@/lib/session';
import { firstError, lessonCreateSchema } from '@/lib/validation';

/** GET /api/lessons?studentId=1&unpaid=1 — a student's charged lessons that are still unpaid. */
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const studentId = Number(request.nextUrl.searchParams.get('studentId'));
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: 'Λείπει ο μαθητής' }, { status: 400 });
  }
  const unpaid = request.nextUrl.searchParams.get('unpaid') === '1';
  const lessons = await listLessons(userId, {
    studentId,
    ...(unpaid ? { status: ['attended', 'no_show'] as LessonStatus[], paid: false } : {}),
  });
  return NextResponse.json(lessons);
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const parsed = lessonCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const { repeatWeeks, ...lesson } = parsed.data;

  if (!(await getStudent(userId, lesson.studentId))) {
    return NextResponse.json({ error: 'Ο μαθητής δεν βρέθηκε' }, { status: 404 });
  }

  const seriesId = repeatWeeks > 1 ? randomUUID() : null;
  const created = await createLessons(
    userId,
    seriesDates(lesson.date, repeatWeeks).map((date) => ({ ...lesson, date, seriesId })),
  );
  return NextResponse.json(created, { status: 201 });
}
