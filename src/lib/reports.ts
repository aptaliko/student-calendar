import type { LessonStatus } from '@/db/schema';
import { isCharged } from './lessons';

export type ReportLesson = {
  studentId: number;
  date: string;
  durationMinutes: number;
  priceCents: number;
  status: LessonStatus;
  paid: boolean;
  /** Share of a payment; null means the full price was paid (or the lesson is unpaid). */
  paidCents?: number | null;
};

export type Totals = {
  lessons: number; // all lessons in range, any status
  attended: number;
  noShow: number;
  excused: number;
  cancelled: number;
  scheduled: number;
  attendedMinutes: number;
  earnedCents: number; // attended + no-show
  paidCents: number; // actually received for these lessons (after any discount)
  outstandingCents: number;
  upcomingCents: number; // still-scheduled lessons, not yet earned
  attendanceRate: number | null; // attended / (attended + no-show + excused)
};

export function emptyTotals(): Totals {
  return {
    lessons: 0,
    attended: 0,
    noShow: 0,
    excused: 0,
    cancelled: 0,
    scheduled: 0,
    attendedMinutes: 0,
    earnedCents: 0,
    paidCents: 0,
    outstandingCents: 0,
    upcomingCents: 0,
    attendanceRate: null,
  };
}

function add(t: Totals, l: ReportLesson) {
  t.lessons++;
  switch (l.status) {
    case 'attended':
      t.attended++;
      t.attendedMinutes += l.durationMinutes;
      break;
    case 'no_show':
      t.noShow++;
      break;
    case 'excused':
      t.excused++;
      break;
    case 'cancelled':
      t.cancelled++;
      break;
    case 'scheduled':
      t.scheduled++;
      t.upcomingCents += l.priceCents;
      break;
  }
  if (isCharged(l.status)) {
    t.earnedCents += l.priceCents;
    if (l.paid) t.paidCents += l.paidCents ?? l.priceCents;
    else t.outstandingCents += l.priceCents;
  }
}

function finish(t: Totals): Totals {
  const marked = t.attended + t.noShow + t.excused;
  t.attendanceRate = marked === 0 ? null : t.attended / marked;
  return t;
}

export function totals(lessons: ReportLesson[]): Totals {
  const t = emptyTotals();
  for (const l of lessons) add(t, l);
  return finish(t);
}

export function totalsByStudent(lessons: ReportLesson[]): Map<number, Totals> {
  const map = new Map<number, Totals>();
  for (const l of lessons) {
    let t = map.get(l.studentId);
    if (!t) map.set(l.studentId, (t = emptyTotals()));
    add(t, l);
  }
  for (const t of map.values()) finish(t);
  return map;
}

/** Totals for each month ('YYYY-MM') of a year, always 12 entries in order. */
export function totalsByMonth(lessons: ReportLesson[], year: number): { month: string; totals: Totals }[] {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const map = new Map(months.map((m) => [m, emptyTotals()]));
  for (const l of lessons) {
    const t = map.get(l.date.slice(0, 7));
    if (t) add(t, l);
  }
  return months.map((month) => ({ month, totals: finish(map.get(month)!) }));
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}
