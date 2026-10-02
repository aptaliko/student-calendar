import { NextRequest, NextResponse } from 'next/server';
import { deleteLesson, updateLesson } from '@/db/queries/lessons';
import { getStudent } from '@/db/queries/students';
import { getUserId } from '@/lib/session';
import { firstError, lessonPatchSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const userId = getUserId(request);
  const id = Number((await params).id);
  const parsed = lessonPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  if (parsed.data.studentId && !(await getStudent(userId, parsed.data.studentId))) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }
  const lesson = await updateLesson(userId, id, parsed.data);
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lesson);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const series = request.nextUrl.searchParams.get('series') === 'future' ? 'future' : undefined;
  const count = await deleteLesson(getUserId(request), id, series);
  if (count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, count });
}
