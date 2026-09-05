/**
 * /api/personalization/profile — request bounds on an in-memory store.
 *
 * Negative control (recorded 2026-09-05, before MAX_PROFILE_BYTES): the
 * oversized-profile case was RED — a 1 MiB profile was accepted with 200 and
 * held in process memory under a caller-chosen userId.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { GET, POST, DELETE } from './route';

const url = 'http://localhost/api/personalization/profile';
// Mirrors the route's private MAX_PROFILE_BYTES (a route module may export only
// handlers); the 413 body's `max` field pins the two together below.
const MAX_PROFILE_BYTES = 64 * 1024;

function post(body: unknown) {
  return POST(
    new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('profile route bounds', () => {
  it('stores and returns a normal-sized profile', async () => {
    const userId = 'test-user-ok';
    const res = await post({ userId, profile: { interests: [{ category: 'Movies', score: 80 }] } });
    expect(res.status).toBe(200);
    const got = await GET(new NextRequest(`${url}?userId=${userId}`));
    expect((await got.json()).source).toBe('cache');
    await DELETE(new NextRequest(`${url}?userId=${userId}`, { method: 'DELETE' }));
  });

  it('refuses a profile above MAX_PROFILE_BYTES with 413 and does not store it', async () => {
    const userId = 'test-user-huge';
    const res = await post({ userId, profile: { blob: 'x'.repeat(MAX_PROFILE_BYTES + 1) } });
    expect(res.status).toBe(413);
    expect((await res.json()).max).toBe(MAX_PROFILE_BYTES);
    const got = await GET(new NextRequest(`${url}?userId=${userId}`));
    expect((await got.json()).source).toBe('new');
  });

  it('refuses a non-object profile', async () => {
    const res = await post({ userId: 'test-user-str', profile: 'not-an-object' });
    expect(res.status).toBe(400);
  });
});
