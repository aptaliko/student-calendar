import { describe, expect, it } from 'vitest';
import { formatHours, parseMoney, priceFor } from './money';

describe('money', () => {
  it('prices lessons pro rata', () => {
    expect(priceFor(3000, 60)).toBe(3000);
    expect(priceFor(3000, 45)).toBe(2250);
    expect(priceFor(2500, 50)).toBe(2083);
  });

  it('parses user-entered amounts', () => {
    expect(parseMoney('25')).toBe(2500);
    expect(parseMoney('25,5')).toBe(2550);
    expect(parseMoney(' 0.99 ')).toBe(99);
    expect(parseMoney('-3')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });

  it('formats hours', () => {
    expect(formatHours(90)).toBe('1.5h');
    expect(formatHours(120)).toBe('2h');
  });
});
