import { NextRequest, NextResponse } from 'next/server';
import { deleteLesson, getLesson, updateLesson } from '@/db/queries/lessons';
import { applyCredit, releaseLesson } from '@/db/queries/payments';
import { getStudent } from '@/db/queries/students';
import { isCharged } from '@/lib/lessons';
import { getUserId } from '@/lib/session';
import { firstError, lessonPatchSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Updates a lesson and keeps payments consistent:
 *  - becoming charged (Παρών/Απών) spends any prepayment on it;
 *  - no longer charged, moved to another student, or paid/unpaid ticked by hand: what payments
 *    had put towards it goes back to credit (and may pay the student's other lessons).
 * Responds with the lesson plus `paidFromCredit` when prepayment paid it just now.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const userId = getUserId(request);
  const id = Number((await params).id);
  const parsed = lessonPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const data = parsed.data;
  if (data.studentId && !(await getStudent(userId, data.studentId))) {
    return NextResponse.json({ error: 'Ο μαθητής δεν βρέθηκε' }, { status: 404 });
  }
  const before = await getLesson(userId, id);
  if (!before) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });

  // The lesson form re-sends `paid` on every save, so only an actual change counts.
  const paidChanged = data.paid !== undefined && data.paid !== before.paid;
  if (!paidChanged) delete data.paid;
  const movedStudent = data.studentId !== undefined && data.studentId !== before.studentId;
  const unCharged = isCharged(before.status) && data.status !== undefined && !isCharged(data.status);
  if (paidChanged || movedStudent || unCharged) await releaseLesson(userId, id);

  const lesson = await updateLesson(userId, id, data);
  if (!lesson) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });

  // Ticking "unpaid" by hand must stick, so don't immediately pay it again from credit.
  let paidFromCredit = false;
  if (data.paid !== false) {
    const settled = await applyCredit(userId, lesson.studentId);
    paidFromCredit = settled.includes(id);
  }
  if (movedStudent) await applyCredit(userId, before.studentId);
  return NextResponse.json({ ...lesson, paid: lesson.paid || paidFromCredit, paidFromCredit });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const userId = getUserId(request);
  const id = Number((await params).id);
  const series = request.nextUrl.searchParams.get('series') === 'future' ? 'future' : undefined;
  const { count, studentId } = await deleteLesson(userId, id, series);
  if (count === 0) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });
  // Money that had paid for the deleted lessons is credit again.
  if (studentId !== null) await applyCredit(userId, studentId);
  return NextResponse.json({ ok: true, count });
}
