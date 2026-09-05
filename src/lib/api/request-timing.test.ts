import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REQUEST_ID_HEADER } from './request-id';
import { withTiming } from './request-timing';

/**
 * One request, one correlation id. ApiClient stamps every outgoing call with
 * `X-Request-ID: goat-…` (request-id.ts); `withTiming` used to ignore it and
 * mint a second, unrelated `req-…` id for the server log line and the
 * `x-request-id` response header, so client and server logs for one request
 * could never be joined.
 *
 * Negative control (2026-09-05): against the previous `withTiming` (private
 * counter id), 3 of 4 cases fail — the response header and the log line carry
 * `req-…` instead of the client's id, and the minted-id format differs.
 * 3 red / 1 green.
 */

const okHandler = vi.fn(async () => NextResponse.json({ ok: true }));

afterEach(() => {
  vi.restoreAllMocks();
  okHandler.mockClear();
});

function requestWithId(id: string): NextRequest {
  return new NextRequest('http://localhost/api/collections', {
    headers: { [REQUEST_ID_HEADER]: id },
  });
}

describe('withTiming request correlation', () => {
  it('echoes the client-provided X-Request-ID on the response', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapped = withTiming(okHandler, '/api/collections');

    const res = await wrapped(requestWithId('goat-abc123-xyz789'));

    expect(res.headers.get('x-request-id')).toBe('goat-abc123-xyz789');
  });

  it('logs the client-provided id, not a freshly minted one', async () => {
    // The success path no longer logs (main's no-console sweep, 74573c2); the
    // ERROR path is the one [timing] line left, and it must carry the client id.
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = async () => { throw new Error('boom'); };
    const wrapped = withTiming(throwing as unknown as typeof okHandler, '/api/collections');

    await expect(wrapped(requestWithId('goat-abc123-xyz789'))).rejects.toThrow('boom');

    const line = log.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[timing]'));
    expect(line).toContain('goat-abc123-xyz789');
    expect(line).not.toMatch(/\breq-/);
  });

  it('mints an id when the client sent none', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapped = withTiming(okHandler);

    const res = await wrapped(new NextRequest('http://localhost/api/collections'));

    expect(res.headers.get('x-request-id')).toMatch(/^goat-[0-9a-z]+-[0-9a-z]+$/);
  });

  it('still attaches server-timing and passes the handler result through', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapped = withTiming(okHandler);

    const res = await wrapped(requestWithId('goat-1-2'));

    expect(res.status).toBe(200);
    expect(res.headers.get('server-timing')).toMatch(/^total;dur=\d+(\.\d+)?$/);
    expect(await res.json()).toEqual({ ok: true });
  });
});
