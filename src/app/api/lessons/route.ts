import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createLessons } from '@/db/queries/lessons';
import { getStudent } from '@/db/queries/students';
import { seriesDates } from '@/lib/lessons';
import { getUserId } from '@/lib/session';
import { firstError, lessonCreateSchema } from '@/lib/validation';

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
