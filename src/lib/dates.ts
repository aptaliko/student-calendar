// All calendar math works on wall-clock ISO date strings ('YYYY-MM-DD'), using UTC Date
// objects purely as a calculator so the host timezone can never shift a day.

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISO(fromISO(value)) === value;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = fromISO(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toISO(d);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(iso: ISODate): number {
  return (fromISO(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(iso), 1), -1);
}

export function startOfYear(iso: ISODate): ISODate {
  return `${iso.slice(0, 4)}-01-01`;
}

export function endOfYear(iso: ISODate): ISODate {
  return `${iso.slice(0, 4)}-12-31`;
}

/** 6×7 grid of dates covering the month (Monday-first), for a month calendar view. */
export function monthGrid(iso: ISODate): ISODate[] {
  const first = startOfWeek(startOfMonth(iso));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDates(iso: ISODate): ISODate[] {
  const first = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Today's date in the given IANA timezone. */
export function todayIn(timezone: string, now: Date = new Date()): ISODate {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return toISO(now);
  }
}

/** Current 'HH:MM' in the given IANA timezone. */
export function nowTimeIn(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
  } catch {
    return `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
  }
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

// Labels are built by hand rather than with Intl: Node's and browsers' ICU data disagree on
// punctuation, which breaks hydration of client components. Greek needs the nominative month
// for "Οκτώβριος 2026" but the genitive after a day number ("2 Οκτωβρίου").
const MONTHS = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
const MONTHS_GENITIVE = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];
const MONTHS_SHORT = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
const WEEKDAYS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];
export const WEEKDAY_SHORT = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];

const parts = (iso: ISODate) => {
  const m = Number(iso.slice(5, 7)) - 1;
  return { y: iso.slice(0, 4), m, day: Number(iso.slice(8, 10)), wd: weekdayIndex(iso) };
};

/** 'Τρίτη' — reads right after 'κάθε' too (κάθε Τρίτη, κάθε Σάββατο). */
export const weekdayName = (iso: ISODate) => WEEKDAYS[weekdayIndex(iso)];

export const monthLabel = (iso: ISODate) => `${MONTHS[parts(iso).m]} ${parts(iso).y}`;
export const shortMonth = (iso: ISODate) => MONTHS_SHORT[parts(iso).m];
/** 'Παρασκευή 2 Οκτωβρίου' */
export const longDay = (iso: ISODate) => {
  const p = parts(iso);
  return `${WEEKDAYS[p.wd]} ${p.day} ${MONTHS_GENITIVE[p.m]}`;
};
/** 'Παρ, 2 Οκτ' */
export const shortDay = (iso: ISODate) => {
  const p = parts(iso);
  return `${WEEKDAY_SHORT[p.wd]}, ${p.day} ${MONTHS_SHORT[p.m]}`;
};
/** '2 Οκτ' or, with year, '2 Οκτ 2026'. */
export const dayMonth = (iso: ISODate, withYear = false) => {
  const p = parts(iso);
  return `${p.day} ${MONTHS_SHORT[p.m]}${withYear ? ` ${p.y}` : ''}`;
};
