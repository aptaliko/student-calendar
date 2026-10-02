import type { LessonStatus } from '@/db/schema';
import { addDays, type ISODate } from './dates';

export const STATUS_META: Record<
  LessonStatus,
  { label: string; short: string; charged: boolean; badge: string; dot: string }
> = {
  scheduled: { label: 'Προγραμματισμένο', short: 'Εκκρεμεί', charged: false, badge: 'badge-ghost', dot: 'bg-base-content/30' },
  attended: { label: 'Παρουσία', short: 'Παρών', charged: true, badge: 'badge-success', dot: 'bg-success' },
  no_show: { label: 'Απουσία (χρεώνεται)', short: 'Απών', charged: true, badge: 'badge-error', dot: 'bg-error' },
  excused: { label: 'Δικαιολογημένη απουσία', short: 'Δικαιολ.', charged: false, badge: 'badge-warning', dot: 'bg-warning' },
  cancelled: { label: 'Ακυρώθηκε', short: 'Ακυρώθηκε', charged: false, badge: 'badge-neutral', dot: 'bg-base-content/20' },
};

export function isCharged(status: LessonStatus): boolean {
  return STATUS_META[status].charged;
}

/** Dates for a weekly series: the first date plus `count - 1` more, `everyWeeks` apart. */
export function seriesDates(first: ISODate, count: number, everyWeeks = 1): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7 * everyWeeks));
}

// Student colors. Full class strings live here so Tailwind's scanner sees them.
export const STUDENT_COLORS = {
  violet: { bg: 'bg-violet-500', soft: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-300', border: 'border-violet-500' },
  sky: { bg: 'bg-sky-500', soft: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-300', border: 'border-sky-500' },
  emerald: { bg: 'bg-emerald-500', soft: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500' },
  amber: { bg: 'bg-amber-500', soft: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500' },
  rose: { bg: 'bg-rose-500', soft: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-300', border: 'border-rose-500' },
  fuchsia: { bg: 'bg-fuchsia-500', soft: 'bg-fuchsia-500/15', text: 'text-fuchsia-600 dark:text-fuchsia-300', border: 'border-fuchsia-500' },
  teal: { bg: 'bg-teal-500', soft: 'bg-teal-500/15', text: 'text-teal-600 dark:text-teal-300', border: 'border-teal-500' },
  orange: { bg: 'bg-orange-500', soft: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-300', border: 'border-orange-500' },
  indigo: { bg: 'bg-indigo-500', soft: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-300', border: 'border-indigo-500' },
  lime: { bg: 'bg-lime-500', soft: 'bg-lime-500/15', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-500' },
} as const;

export type StudentColor = keyof typeof STUDENT_COLORS;
export const STUDENT_COLOR_NAMES = Object.keys(STUDENT_COLORS) as StudentColor[];

export function colorOf(name: string) {
  return STUDENT_COLORS[(name in STUDENT_COLORS ? name : 'violet') as StudentColor];
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  );
}

export const LESSON_STATUS_ORDER: LessonStatus[] = ['attended', 'no_show', 'excused', 'cancelled', 'scheduled'];
