/**
 * /api/generate-ai-image — the request door in front of paid image vendors.
 *
 * Registry: generative-provider-routing (spend is gated BEFORE a vendor is
 * touched); browser-credential-boundary (the client gets a closed vocabulary,
 * never the upstream's words).
 *
 * Before 2026-09-05 the body was destructured untyped: `{ request: {} }` reached
 * `request.dimensions.width` and the catch echoed
 * `Cannot read properties of undefined (reading 'width')` to the browser with a
 * 500, and the route had no rate limit while every studio Gemini route has one.
 *
 * Negative control (recorded 2026-09-05, before the fix): 3 of 4 tests RED
 * (malformed body -> 500 not 400; message echoed; 11th request in a minute -> 200).
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetRateLimiter } from '@/lib/api/rate-limiter';

import { POST } from './route';

const post = (body: unknown, ip = '203.0.113.7') =>
  POST(
    new NextRequest('http://localhost/api/generate-ai-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': ip },
      body: JSON.stringify(body),
    })
  );

const valid = {
  provider: 'mock',
  prompt: 'a ranking poster',
  request: {
    listTitle: 'Top 3',
    category: 'Movies',
    items: [{ position: 1, title: 'A' }],
    style: 'minimalist',
    dimensions: { width: 1200, height: 630 },
    numVariations: 1,
  },
};

describe('generate-ai-image request door', () => {
  beforeEach(() => resetRateLimiter());

  it('refuses a body whose request has no dimensions with 400, not a 500', async () => {
    const res = await post({ provider: 'mock', prompt: 'x', request: {} });
    expect(res.status).toBe(400);
  });

  it('never echoes an internal error string', async () => {
    const res = await post({ provider: 'mock', prompt: 'x', request: {} });
    const text = await res.text();
    expect(text).not.toMatch(/Cannot read properties|TypeError/);
  });

  it('refuses an unknown provider', async () => {
    const res = await post({ ...valid, provider: 'midjourney' });
    expect(res.status).toBe(400);
  });

  it('rate-limits the 11th request from one address inside a minute', async () => {
    let last: Response | null = null;
    for (let i = 0; i < 11; i++) {
      // A body that fails validation is enough: the limit is checked first.
      last = await post({ provider: 'mock', prompt: 'x', request: {} }, '198.51.100.9');
    }
    expect(last!.status).toBe(429);
  });
});
