/**
 * /api/personalization/track — request bounds on an in-memory buffer.
 *
 * Negative control (recorded 2026-09-05, before MAX_EVENTS_PER_REQUEST): the
 * oversized-batch case was RED — 10,000 events in one body were accepted with
 * 200 and `tracked: 10000`.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { POST } from './route';

const url = 'http://localhost/api/personalization/track';
// Mirrors the route's private MAX_EVENTS_PER_REQUEST (a route module may export
// only handlers); the 413 body's `max` field pins the two together below.
const MAX_EVENTS_PER_REQUEST = 100;

function post(body: unknown) {
  return POST(
    new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

const event = (i: number) => ({ type: 'view', category: 'Movies', itemId: `i${i}`, timestamp: i });

describe('track route bounds', () => {
  it('accepts a batch at the limit', async () => {
    const res = await post({ events: Array.from({ length: MAX_EVENTS_PER_REQUEST }, (_, i) => event(i)) });
    expect(res.status).toBe(200);
    expect((await res.json()).tracked).toBe(MAX_EVENTS_PER_REQUEST);
  });

  it('refuses a batch above the limit with 413 and tracks none of it', async () => {
    const res = await post({ events: Array.from({ length: MAX_EVENTS_PER_REQUEST + 1 }, (_, i) => event(i)) });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.received).toBe(MAX_EVENTS_PER_REQUEST + 1);
    expect(body.max).toBe(MAX_EVENTS_PER_REQUEST);
    expect(body.tracked).toBeUndefined();
  });

  it('still requires an events array', async () => {
    expect((await post({})).status).toBe(400);
  });
});
