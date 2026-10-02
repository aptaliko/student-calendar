import { NextRequest, NextResponse } from 'next/server';
import { listLessons } from '@/db/queries/lessons';
import { listStudents } from '@/db/queries/students';
import { isValidISODate } from '@/lib/dates';
import { STATUS_META } from '@/lib/lessons';
import { toCsv } from '@/lib/reports';
import { getUserId } from '@/lib/session';

/** CSV of every lesson in [from, to] — opens straight in Excel / Numbers / Sheets. */
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const from = request.nextUrl.searchParams.get('from') ?? '';
  const to = request.nextUrl.searchParams.get('to') ?? '';
  if (!isValidISODate(from) || !isValidISODate(to)) {
    return NextResponse.json({ error: 'Οι ημερομηνίες πρέπει να είναι σε μορφή ΕΕΕΕ-ΜΜ-ΗΗ' }, { status: 400 });
  }

  const [lessons, students] = await Promise.all([listLessons(userId, { from, to }), listStudents(userId)]);
  const names = new Map(students.map((s) => [s.id, s.name]));
  const csv = toCsv([
    ['Ημερομηνία', 'Έναρξη', 'Λεπτά', 'Μαθητής', 'Κατάσταση', 'Τιμή', 'Πληρώθηκε', 'Θέμα', 'Σημειώσεις'],
    ...lessons.map((l) => [
      l.date,
      l.startTime,
      l.durationMinutes,
      names.get(l.studentId) ?? '',
      STATUS_META[l.status].label,
      (l.priceCents / 100).toFixed(2).replace('.', ','),
      l.paid ? 'ναι' : 'όχι',
      l.topic ?? '',
      l.notes ?? '',
    ]),
  ]);

  // Leading BOM so Excel opens the Greek text as UTF-8.
  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mathimata_${from}_${to}.csv"`,
    },
  });
}
