/**
 * GET/POST /api/personalization/recommend — limit parsing.
 *
 * Negative control (recorded 2026-09-05, before the parseBoundedInt fix): with
 * `parseInt(searchParams.get('limit') || '10', 10)` and `slice(0, limit)`,
 * `?limit=abc` returned 0 recommendations and `?limit=-1` returned total-1.
 * Measured red count against the old route: 4 of 7 (non-numeric, negative,
 * zero, POST) — expected 5 / 1 / 1 / 5, got 0 / 4 / 0 / 0 over a 5-item
 * showcase population.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { showcaseData } from '@/lib/constants/showCaseExamples';

import { GET, POST } from './route';

const total = showcaseData.length;
const expectDefault = Math.min(10, total);

async function get(query: string) {
  const res = await GET(new NextRequest(`http://localhost/api/personalization/recommend${query}`));
  expect(res.status).toBe(200);
  return res.json();
}

async function post(body: unknown) {
  const res = await POST(
    new NextRequest('http://localhost/api/personalization/recommend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
  expect(res.status).toBe(200);
  return res.json();
}

describe('recommend limit parsing', () => {
  it('has a population to slice', () => {
    expect(total).toBeGreaterThan(1);
  });

  it('GET: absent limit returns the default', async () => {
    const body = await get('');
    expect(body.meta.returned).toBe(expectDefault);
  });

  it('GET: non-numeric limit falls back to the default instead of returning nothing', async () => {
    const body = await get('?limit=abc');
    expect(body.meta.returned).toBe(expectDefault);
  });

  it('GET: negative limit clamps to 1 instead of dropping items off the end', async () => {
    const body = await get('?limit=-1');
    expect(body.meta.returned).toBe(1);
  });

  it('GET: zero limit clamps to 1', async () => {
    const body = await get('?limit=0');
    expect(body.meta.returned).toBe(1);
  });

  it('GET: oversized limit caps at the population (never more than 100)', async () => {
    const body = await get('?limit=99999');
    expect(body.meta.returned).toBe(Math.min(100, total));
  });

  it('POST: string and negative limits are bounded the same way as GET', async () => {
    expect((await post({ limit: 'abc' })).meta.returned).toBe(expectDefault);
    expect((await post({ limit: -5 })).meta.returned).toBe(1);
    expect((await post({})).meta.returned).toBe(expectDefault);
  });
});
