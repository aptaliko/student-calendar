import { NextRequest, NextResponse } from 'next/server';
import { settleStudent } from '@/db/queries/payments';
import { getUserId } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const count = await settleStudent(getUserId(request), Number((await params).id));
  return NextResponse.json({ ok: true, count });
}
