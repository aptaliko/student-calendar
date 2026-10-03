import { NextRequest, NextResponse } from 'next/server';
import { createPayment, listPayments } from '@/db/queries/payments';
import { getStudent } from '@/db/queries/students';
import { isValidISODate } from '@/lib/dates';
import { getUserId } from '@/lib/session';
import { firstError, paymentSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  if ((from && !isValidISODate(from)) || (to && !isValidISODate(to))) {
    return NextResponse.json({ error: 'Μη έγκυρη ημερομηνία' }, { status: 400 });
  }
  const studentId = sp.get('studentId') ? Number(sp.get('studentId')) : undefined;
  return NextResponse.json(await listPayments(getUserId(request), { from, to, studentId }));
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  if (!(await getStudent(userId, parsed.data.studentId))) {
    return NextResponse.json({ error: 'Ο μαθητής δεν βρέθηκε' }, { status: 404 });
  }
  const result = await createPayment(userId, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
