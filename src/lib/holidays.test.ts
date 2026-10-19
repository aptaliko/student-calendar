import { describe, expect, it } from 'vitest';
import { monthGrid } from './dates';
import { holidaysBetween, orthodoxEaster } from './holidays';

describe('orthodoxEaster', () => {
  it('matches known Orthodox Easter Sundays', () => {
    expect(orthodoxEaster(2019)).toBe('2019-04-28');
    expect(orthodoxEaster(2022)).toBe('2022-04-24');
    expect(orthodoxEaster(2023)).toBe('2023-04-16');
    expect(orthodoxEaster(2024)).toBe('2024-05-05');
    expect(orthodoxEaster(2025)).toBe('2025-04-20');
    expect(orthodoxEaster(2026)).toBe('2026-04-12');
    expect(orthodoxEaster(2027)).toBe('2027-05-02');
  });
});

describe('holidaysBetween', () => {
  it('lists every Greek public holiday for 2026', () => {
    const holidays = holidaysBetween('2026-01-01', '2026-12-31');
    expect([...holidays]).toEqual([
      ['2026-01-01', 'Πρωτοχρονιά'],
      ['2026-01-06', 'Θεοφάνεια'],
      ['2026-02-23', 'Καθαρά Δευτέρα'],
      ['2026-03-25', 'Ευαγγελισμός της Θεοτόκου'],
      ['2026-04-10', 'Μεγάλη Παρασκευή'],
      ['2026-04-12', 'Κυριακή του Πάσχα'],
      ['2026-04-13', 'Δευτέρα του Πάσχα'],
      ['2026-05-01', 'Πρωτομαγιά'],
      ['2026-06-01', 'Αγίου Πνεύματος'],
      ['2026-08-15', 'Κοίμηση της Θεοτόκου'],
      ['2026-10-28', 'Επέτειος του ΟΧΙ'],
      ['2026-12-25', 'Χριστούγεννα'],
      ['2026-12-26', 'Σύναξη της Θεοτόκου'],
    ]);
  });

  it('covers a month grid that spans two years', () => {
    const holidays = holidaysBetween(monthGrid('2026-12-01')[0], monthGrid('2026-12-01')[41]);
    expect(holidays.get('2026-12-25')).toBe('Χριστούγεννα');
    expect(holidays.get('2027-01-01')).toBe('Πρωτοχρονιά');
    expect(holidays.get('2027-01-06')).toBe('Θεοφάνεια');
  });

  it('returns nothing for a range without holidays', () => {
    expect(holidaysBetween('2026-09-01', '2026-09-30').size).toBe(0);
  });
});
