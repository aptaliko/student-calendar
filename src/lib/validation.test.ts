import { describe, expect, it } from 'vitest';
import { kindChangeError, studentPatchSchema, studentSchema } from './validation';

const base = { name: 'Γιάννης', color: 'violet', hourlyRateCents: 2000 };

describe('studentSchema kind and school', () => {
  it('defaults kind to student when omitted', () => {
    expect(studentSchema.parse(base).kind).toBe('student');
  });

  it('accepts a class with a school', () => {
    const parsed = studentSchema.parse({ ...base, kind: 'class', school: ' 2ο Δημοτικό ' });
    expect(parsed).toMatchObject({ kind: 'class', school: '2ο Δημοτικό' });
  });

  it('stores a whitespace-only school as null', () => {
    expect(studentSchema.parse({ ...base, kind: 'class', school: '   ' }).school).toBeNull();
  });

  it('rejects an unknown kind', () => {
    expect(studentSchema.safeParse({ ...base, kind: 'lesson' }).success).toBe(false);
  });
});

describe('studentPatchSchema kind', () => {
  it('leaves kind undefined when it is not sent, so no default is applied', () => {
    expect(studentPatchSchema.parse({ name: 'x' }).kind).toBeUndefined();
  });
});

describe('kindChangeError', () => {
  it('allows a PATCH that omits kind', () => {
    expect(kindChangeError('class', undefined)).toBeNull();
  });

  it('allows a PATCH that repeats the stored kind', () => {
    expect(kindChangeError('class', 'class')).toBeNull();
  });

  it('rejects a PATCH that changes the kind', () => {
    expect(kindChangeError('student', 'class')).toBe('Το είδος δεν μπορεί να αλλάξει');
  });
});
