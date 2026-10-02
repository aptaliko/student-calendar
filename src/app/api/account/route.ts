import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/db/queries/users';
import { getUserId } from '@/lib/session';
import { accountSchema, firstError } from '@/lib/validation';

export async function PATCH(request: NextRequest) {
  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const user = await updateUser(getUserId(request), parsed.data);
  if (!user) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
