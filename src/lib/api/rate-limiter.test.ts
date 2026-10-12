import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRateLimitKey, rateLimit, resetRateLimiter } from './rate-limiter';

/**
 * The route limiter (result-image generation, studio generate/find-image/
 * find-youtube) used to refuse with a bare `{ error }` and a Retry-After — no
 * statement of WHICH limit, over WHAT window, so a client could not tell a
 * 5/min ceiling from a 30/min one and had nothing machine-readable to key
 * retry logic on. The refusal now states the contract in headers and body
 * (registry: rate-limiting/refusal-contract). The admit path is unchanged.
 *
 * Negative control (2026-09-05): with the X-RateLimit-* headers stripped back
 * to the previous bare Retry-After, the headers case fails. 1 red / 4 green.
 */

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  resetRateLimiter();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('admits up to maxRequests and refuses the next one', () => {
    expect(rateLimit('k', 2, 60_000)).toBeNull();
    expect(rateLimit('k', 2, 60_000)).toBeNull();
    const refused = rateLimit('k', 2, 60_000);
    expect(refused?.status).toBe(429);
  });

  it('the refusal names the limit, the window and when to retry — in headers', () => {
    rateLimit('k', 1, 60_000);
    vi.advanceTimersByTime(15_000);
    const refused = rateLimit('k', 1, 60_000)!;

    expect(refused.headers.get('Retry-After')).toBe('45');
    expect(refused.headers.get('X-RateLimit-Limit')).toBe('1');
    expect(refused.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(refused.headers.get('X-RateLimit-Reset')).toBe('45');
  });

  it('the refusal body is machine-readable and keeps the legacy `error` string', async () => {
    rateLimit('k', 1, 60_000);
    const refused = rateLimit('k', 1, 60_000)!;

    await expect(refused.json()).resolves.toEqual({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
      limit: 1,
      windowSeconds: 60,
      retryAfterSeconds: 60,
    });
  });

  it('a fresh window admits again once the old one has elapsed', () => {
    rateLimit('k', 1, 60_000);
    expect(rateLimit('k', 1, 60_000)).not.toBeNull();
    vi.advanceTimersByTime(60_001);
    expect(rateLimit('k', 1, 60_000)).toBeNull();
  });
});

describe('getRateLimitKey', () => {
  it('prefixes the first forwarded address, falling back to anonymous', () => {
    const forwarded = new Request('http://localhost/api/x', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(getRateLimitKey(forwarded, 'studio-generate')).toBe('studio-generate:203.0.113.9');
    expect(getRateLimitKey(new Request('http://localhost/api/x'), 'p')).toBe('p:anonymous');
  });
});
