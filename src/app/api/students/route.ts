import { NextRequest, NextResponse } from 'next/server';
import { createStudent, listStudents } from '@/db/queries/students';
import { getUserId } from '@/lib/session';
import { firstError, studentSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  return NextResponse.json(await listStudents(getUserId(request)));
}

export async function POST(request: NextRequest) {
  const parsed = studentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const student = await createStudent(getUserId(request), parsed.data);
  return NextResponse.json(student, { status: 201 });
}
