import { NextRequest, NextResponse } from 'next/server';
import { deleteStudent, updateStudent } from '@/db/queries/students';
import { getUserId } from '@/lib/session';
import { firstError, studentPatchSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const parsed = studentPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const student = await updateStudent(getUserId(request), id, parsed.data);
  if (!student) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });
  return NextResponse.json(student);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const ok = await deleteStudent(getUserId(request), id);
  if (!ok) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
