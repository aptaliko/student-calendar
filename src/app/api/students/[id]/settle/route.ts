import { NextRequest, NextResponse } from 'next/server';
import { settleStudent } from '@/db/queries/payments';
import { getUserById } from '@/db/queries/users';
import { todayIn } from '@/lib/dates';
import { getUserId } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  const user = await getUserById(userId);
  const count = await settleStudent(userId, Number((await params).id), todayIn(user?.timezone ?? 'UTC'));
  return NextResponse.json({ ok: true, count });
}
