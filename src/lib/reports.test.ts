import { describe, expect, it } from 'vitest';
import { toCsv, totals, totalsByMonth, totalsByStudent, type ReportLesson } from './reports';
import { seriesDates, seriesDatesUntil, MAX_SERIES_LESSONS } from './lessons';

const L = (p: Partial<ReportLesson>): ReportLesson => ({
  studentId: 1,
  date: '2026-10-01',
  durationMinutes: 60,
  priceCents: 3000,
  status: 'attended',
  paid: false,
  ...p,
});

describe('reports', () => {
  it('charges attended and no-show lessons only', () => {
    const t = totals([
      L({ status: 'attended', paid: true }),
      L({ status: 'no_show' }),
      L({ status: 'excused' }),
      L({ status: 'cancelled' }),
      L({ status: 'scheduled' }),
    ]);
    expect(t.earnedCents).toBe(6000);
    expect(t.paidCents).toBe(3000);
    expect(t.outstandingCents).toBe(3000);
    expect(t.upcomingCents).toBe(3000);
    expect(t.attendedMinutes).toBe(60);
    expect(t.attendanceRate).toBeCloseTo(1 / 3);
  });

  it('counts payment shares as collected, and only the rest of a partly paid lesson as owed', () => {
    const t = totals([
      L({ paid: true, allocatedCents: 2000 }), // paid at a discount
      L({ paid: true }), // ticked paid by hand: full price
      L({ paid: false, allocatedCents: 1000 }), // 10 € left from a prepayment
    ]);
    expect(t.earnedCents).toBe(9000);
    expect(t.paidCents).toBe(6000);
    expect(t.outstandingCents).toBe(2000);
  });

  it('has no attendance rate before anything is marked', () => {
    expect(totals([L({ status: 'scheduled' })]).attendanceRate).toBeNull();
  });

  it('groups by student', () => {
    const map = totalsByStudent([L({ studentId: 1 }), L({ studentId: 2, durationMinutes: 30 }), L({ studentId: 2 })]);
    expect(map.get(1)!.attended).toBe(1);
    expect(map.get(2)!.attendedMinutes).toBe(90);
  });

  it('groups by month, always 12 buckets', () => {
    const months = totalsByMonth([L({ date: '2026-01-05' }), L({ date: '2026-12-31' }), L({ date: '2025-12-31' })], 2026);
    expect(months).toHaveLength(12);
    expect(months[0].totals.attended).toBe(1);
    expect(months[11].totals.attended).toBe(1);
    expect(months.reduce((s, m) => s + m.totals.lessons, 0)).toBe(2);
  });

  it('escapes CSV cells', () => {
    expect(toCsv([['a,b', 'say "hi"', 3]])).toBe('"a,b","say ""hi""",3\n');
  });

  it('builds weekly series up to an end date, inclusive', () => {
    expect(seriesDatesUntil('2026-10-06', '2026-10-20')).toEqual(['2026-10-06', '2026-10-13', '2026-10-20']);
    expect(seriesDatesUntil('2026-10-06', '2026-10-19')).toEqual(['2026-10-06', '2026-10-13']);
    expect(seriesDatesUntil('2026-10-06', '2026-10-06')).toEqual(['2026-10-06']);
    expect(seriesDatesUntil('2026-10-06', '2026-10-01')).toEqual([]);
    // Tuesday 6 Oct → end of year: every Tuesday, last one 29 Dec
    const toYearEnd = seriesDatesUntil('2026-10-06', '2026-12-31');
    expect(toYearEnd).toHaveLength(13);
    expect(toYearEnd.at(-1)).toBe('2026-12-29');
    // stops just past the cap so callers can reject oversized series
    expect(seriesDatesUntil('2026-01-01', '2030-01-01').length).toBe(MAX_SERIES_LESSONS + 1);
  });

  it('builds weekly series dates', () => {
    expect(seriesDates('2026-10-30', 3)).toEqual(['2026-10-30', '2026-11-06', '2026-11-13']);
    expect(seriesDates('2026-10-01', 2, 2)).toEqual(['2026-10-01', '2026-10-15']);
  });
});
