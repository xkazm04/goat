import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkRateLimit,
  createApiHeaders,
  getRateLimitWindowCount,
  resetRateLimitWindows,
} from './public-api';

/**
 * The public v1 limiter is keyed by API key, and validateApiKey() accepts any
 * well-formed string when GOAT_API_KEYS is unset — a world-controlled key set.
 * Its window map had no reaper (its sibling in rate-limiter.ts always did), so
 * it grew by one entry per distinct key forever. It also never told the caller
 * WHICH limit refused it.
 *
 * Negative control (2026-09-05): with the reaper call and the
 * X-RateLimit-Limit header disabled, the reaper case fails (1000 stale keys
 * still resident after the window) and the header case fails (header absent).
 * 2 red / 4 green.
 */

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  resetRateLimitWindows();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit window reaping', () => {
  it('drops expired windows so the map does not grow with the key population', () => {
    for (let i = 0; i < 1000; i++) {
      checkRateLimit(`goat_stale_${i}`, 'free');
    }
    expect(getRateLimitWindowCount()).toBe(1000);

    // Past every window, past the reaper's interval; one live call triggers the sweep.
    vi.advanceTimersByTime(61_000);
    checkRateLimit('goat_live_key', 'free');

    expect(getRateLimitWindowCount()).toBe(1);
  });

  it('does not reap a window that is still open', () => {
    checkRateLimit('goat_a', 'free');
    vi.advanceTimersByTime(30_000);
    checkRateLimit('goat_b', 'free');
    expect(getRateLimitWindowCount()).toBe(2);
  });
});

describe('checkRateLimit refusal contract', () => {
  it('publishes the tier ceiling on every verdict', () => {
    expect(checkRateLimit('goat_k', 'free').limit).toBe(10);
    expect(checkRateLimit('goat_k2', 'pro').limit).toBe(300);
  });

  it('refuses the 11th free-tier call in a minute with remaining 0 and the limit named', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('goat_free', 'free').allowed).toBe(true);
    }
    const refused = checkRateLimit('goat_free', 'free');
    expect(refused).toMatchObject({ allowed: false, limit: 10, remaining: 0 });
    expect(refused.resetIn).toBeGreaterThan(0);
  });

  it('createApiHeaders carries X-RateLimit-Limit alongside Remaining and Reset', () => {
    const verdict = checkRateLimit('goat_h', 'basic');
    const headers = createApiHeaders(verdict, 'basic');

    expect(headers.get('X-RateLimit-Limit')).toBe('60');
    expect(headers.get('X-RateLimit-Remaining')).toBe('59');
    expect(headers.get('X-RateLimit-Reset')).toBe('60');
    expect(headers.get('X-Api-Tier')).toBe('basic');
  });

  it('createApiHeaders still accepts the old verdict shape without a limit', () => {
    const headers = createApiHeaders({ remaining: 3, resetIn: 1_500 }, 'free');
    expect(headers.get('X-RateLimit-Limit')).toBeNull();
    expect(headers.get('X-RateLimit-Remaining')).toBe('3');
    expect(headers.get('X-RateLimit-Reset')).toBe('2');
  });
});
