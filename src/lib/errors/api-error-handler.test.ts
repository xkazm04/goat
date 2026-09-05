import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fromSupabaseError, withErrorHandler } from './api-error-handler';
import { GoatError, NotFoundError, ValidationError } from './GoatError';

/**
 * The API error door. `withErrorHandler` wraps 20 route files; before this
 * file the whole `src/lib/errors` layer had no test at all, so the door's
 * own failure modes had never been exercised.
 *
 * Every `it.fails` below is a defect pinned RED on purpose (2026-09-05, at
 * dde1d99); the fix that flips it to `it` is the commit that closes it.
 * Measured at pinning time:
 *   - a `TypeError: fetch failed` thrown by a route (an upstream down)
 *     escaped the handler as a RangeError: `fromUnknown` classified it
 *     NETWORK_OFFLINE (Node 22 has a `navigator` with no `onLine`, so
 *     `!navigator.onLine` is true on every server) with status 0, and
 *     `NextResponse.json(..., { status: 0 })` throws — the client got Next's
 *     bare 500, the log got nothing (logError only logs status >= 400).
 *   - an unexpected `Error` became HTTP 400 CLIENT_UNKNOWN_ERROR with its raw
 *     message on the wire (`fromUnknown` maps a plain Error to the client
 *     category, and CATEGORY_TO_STATUS.client is 400).
 *   - `fromSupabaseError` put the driver's message — constraint and table
 *     names included — into the GoatError message the response echoes.
 *   - `ErrorLogEntry.requestId` existed and was never populated, so the
 *     `x-request-id` a client sent could not be joined to the error line.
 * 4 red / 3 green.
 */

const errorSpy = () => vi.spyOn(console, 'error').mockImplementation(() => {});
const warnSpy = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
});

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/lists', { headers });
}

async function body(res: Response): Promise<Record<string, unknown> & { details?: Record<string, unknown> }> {
  return (await res.json()) as Record<string, unknown> & { details?: Record<string, unknown> };
}

describe('withErrorHandler — the API error door', () => {
  it('passes a successful handler through untouched', async () => {
    const wrapped = withErrorHandler(async () => NextResponse.json({ ok: true }));
    const res = await wrapped(request());
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ ok: true });
  });

  it('serialises a thrown GoatError with its own status and code', async () => {
    warnSpy();
    const wrapped = withErrorHandler(async () => {
      throw new NotFoundError('list', 'abc');
    });
    const res = await wrapped(request());
    expect(res.status).toBe(404);
    const b = await body(res);
    expect(b.code).toBe('NOT_FOUND_LIST');
    expect(b.category).toBe('not_found');
    expect(b.details?.traceId).toMatch(/^goat-/);
  });

  it('carries field errors for a ValidationError', async () => {
    warnSpy();
    const wrapped = withErrorHandler(async () => {
      throw new ValidationError('bad input', { title: ['This field is required'] });
    });
    const res = await wrapped(request());
    expect(res.status).toBe(400);
    expect((await body(res)).details?.fieldErrors).toEqual({ title: ['This field is required'] });
  });

  it('a network-class failure inside a route is a structured 502, not a crash', async () => {
    const err = errorSpy();
    const wrapped = withErrorHandler(async () => {
      throw new TypeError('fetch failed');
    });
    const res = await wrapped(request());
    expect(res.status).toBe(502);
    const b = await body(res);
    expect(b.success).toBe(false);
    expect(b.category).toBe('network');
    expect(b.code).toBe('NETWORK_CONNECTION_REFUSED');
    expect(String(b.message)).not.toMatch(/offline/i);
    expect(err).toHaveBeenCalled();
  });

  it('an unexpected exception is a 500 with a sanitised message; the raw one stays in the log', async () => {
    const err = errorSpy();
    const wrapped = withErrorHandler(async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
    });
    const res = await wrapped(request());
    expect(res.status).toBe(500);
    const b = await body(res);
    expect(b.code).toBe('SERVER_INTERNAL_ERROR');
    expect(b.category).toBe('server');
    expect(String(b.message)).not.toContain('ECONNREFUSED');
    const logged = err.mock.calls.map((c) => c.map(String).join(' ')).join('\n');
    expect(logged).toContain('ECONNREFUSED');
  });

  it.fails('the error log line carries the x-request-id the client sent', async () => {
    const err = errorSpy();
    const wrapped = withErrorHandler(async () => {
      throw new GoatError('SERVER_INTERNAL_ERROR');
    });
    await wrapped(request({ 'x-request-id': 'goat-abc123-xyz789' }));
    const logged = err.mock.calls.map((c) => c.map(String).join(' ')).join('\n');
    expect(logged).toContain('"requestId": "goat-abc123-xyz789"');
  });
});

describe('fromSupabaseError — what the driver said vs what the wire gets', () => {
  it.fails('a mapped driver code keeps constraint and table names off the wire', () => {
    const e = fromSupabaseError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "lists_slug_key"',
    });
    expect(e.code).toBe('CONFLICT_DUPLICATE');
    expect(e.status).toBe(409);
    expect(e.message).not.toMatch(/lists_slug_key|unique constraint/);
  });
});
