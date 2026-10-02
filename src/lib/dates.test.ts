import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  endOfMonth,
  isValidISODate,
  monthGrid,
  startOfWeek,
  todayIn,
  weekdayIndex,
} from './dates';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('clamps addMonths to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
  });

  it('uses Monday-first weeks', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-04')).toBe(6); // Sunday
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28');
  });

  it('builds a 42-day month grid starting on a Monday', () => {
    const grid = monthGrid('2026-10-15');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-09-28');
    expect(grid).toContain('2026-10-31');
  });

  it('finds month ends incl. leap years', () => {
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
  });

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('26-2-3')).toBe(false);
  });

  it('computes today in a timezone', () => {
    const now = new Date('2026-10-02T23:30:00Z');
    expect(todayIn('UTC', now)).toBe('2026-10-02');
    expect(todayIn('Europe/Athens', now)).toBe('2026-10-03');
    expect(todayIn('Not/AZone', now)).toBe('2026-10-02');
  });
});

describe('labels', () => {
  it('formats deterministically', async () => {
    const { shortDay, longDay, monthLabel, dayMonth } = await import('./dates');
    expect(shortDay('2026-10-02')).toBe('Παρ, 2 Οκτ');
    expect(longDay('2026-10-02')).toBe('Παρασκευή 2 Οκτωβρίου');
    expect(monthLabel('2026-10-02')).toBe('Οκτώβριος 2026');
    expect(dayMonth('2026-12-28', true)).toBe('28 Δεκ 2026');
  });
});
