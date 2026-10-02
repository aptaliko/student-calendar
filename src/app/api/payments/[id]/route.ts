import { NextRequest, NextResponse } from 'next/server';
import { deletePayment } from '@/db/queries/payments';
import { getUserId } from '@/lib/session';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await deletePayment(getUserId(request), Number((await params).id));
  if (!ok) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
