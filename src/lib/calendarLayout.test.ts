import { describe, expect, it } from 'vitest';
import { layoutDay } from './calendarLayout';

const L = (id: number, startTime: string, durationMinutes = 60) => ({ id, startTime, durationMinutes });

describe('layoutDay', () => {
  it('keeps non-overlapping lessons full width', () => {
    const out = layoutDay([L(1, '10:00'), L(2, '11:00')]);
    expect(out.map((p) => [p.lane, p.lanes])).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it('puts overlapping lessons side by side', () => {
    const out = layoutDay([L(1, '10:00', 90), L(2, '10:30'), L(3, '11:30')]);
    const byId = Object.fromEntries(out.map((p) => [p.item.id, p]));
    expect(byId[1].lanes).toBe(2);
    expect(byId[2].lane).toBe(1);
    expect(byId[3].lane).toBe(0); // lesson 1 ended at 11:30, lane 0 is free again
  });
});
