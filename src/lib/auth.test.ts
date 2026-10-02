import { beforeAll, describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from './auth';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret';
});

describe('session tokens', () => {
  it('round-trips a user id', () => {
    expect(verifySessionToken(createSessionToken(42))).toBe(42);
  });

  it('rejects a tampered token', () => {
    const [, exp, sig] = createSessionToken(42).split('.');
    expect(verifySessionToken(`43.${exp}.${sig}`)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('nope')).toBeNull();
  });
});
