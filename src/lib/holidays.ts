// Greek public holidays (αργίες), computed by rule so server and client render the same
// names. Dates are wall-clock ISO strings, like the rest of the calendar.
import { addDays, type ISODate } from './dates';

const pad = (n: number) => String(n).padStart(2, '0');

const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Πρωτοχρονιά' },
  { month: 1, day: 6, name: 'Θεοφάνεια' },
  { month: 3, day: 25, name: 'Ευαγγελισμός της Θεοτόκου' },
  { month: 5, day: 1, name: 'Πρωτομαγιά' },
  { month: 8, day: 15, name: 'Κοίμηση της Θεοτόκου' },
  { month: 10, day: 28, name: 'Επέτειος του ΟΧΙ' },
  { month: 12, day: 25, name: 'Χριστούγεννα' },
  { month: 12, day: 26, name: 'Σύναξη της Θεοτόκου' },
];

/** Orthodox Easter Sunday for the given year, as a Gregorian ISO date (Meeus' Julian algorithm). */
export function orthodoxEaster(year: number): ISODate {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // The Julian calendar runs behind the Gregorian one by this many days (13 for 1900–2099).
  const julianOffset = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  return addDays(`${year}-${pad(month)}-${pad(day)}`, julianOffset);
}

function holidaysInYear(year: number): Map<ISODate, string> {
  const easter = orthodoxEaster(year);
  const holidays = new Map<ISODate, string>();
  for (const { month, day, name } of FIXED_HOLIDAYS) {
    holidays.set(`${year}-${pad(month)}-${pad(day)}`, name);
  }
  holidays.set(addDays(easter, -48), 'Καθαρά Δευτέρα');
  holidays.set(addDays(easter, -2), 'Μεγάλη Παρασκευή');
  holidays.set(easter, 'Κυριακή του Πάσχα');
  holidays.set(addDays(easter, 1), 'Δευτέρα του Πάσχα');
  holidays.set(addDays(easter, 50), 'Αγίου Πνεύματος');
  return holidays;
}

/** Holidays between two ISO dates (inclusive), keyed by date. Spans as many years as needed. */
export function holidaysBetween(from: ISODate, to: ISODate): Map<ISODate, string> {
  const firstYear = Number(from.slice(0, 4));
  const years = Array.from({ length: Number(to.slice(0, 4)) - firstYear + 1 }, (_, i) => firstYear + i);
  const inRange = years.flatMap((year) => [...holidaysInYear(year)]).filter(([date]) => date >= from && date <= to);
  return new Map(inRange.sort(([a], [b]) => a.localeCompare(b)));
}
