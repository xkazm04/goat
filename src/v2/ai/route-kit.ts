import { accountingConfigured, callerFromToken, overQuota } from './server';

import type { AiTask } from './quota';

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
}

const NDJSON = { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' };

export function ndjsonStream(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { status: 200, headers: NDJSON });
}

export function ndjsonLine(line: string, status: number): Response {
  return new Response(line, { status, headers: NDJSON });
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export type Gate = { ok: true; userId: string | null } | { ok: false; status: 401 | 429; code: 'auth' | 'quota'; message: string };

/**
 * Who is asking, and may they spend. A signed-in caller is resolved whenever
 * accounting is configured. The paid (Claude) path needs one and is metered;
 * the fixture path spends nothing and passes without an account.
 */
export async function gate(request: Request, task: AiTask, paid: boolean): Promise<Gate> {
  if (!accountingConfigured()) return { ok: true, userId: null };
  const caller = await callerFromToken(bearer(request));
  const userId = caller?.userId ?? null;
  if (!paid) return { ok: true, userId };
  if (!userId) return { ok: false, status: 401, code: 'auth', message: 'Sign in (a guest session is enough) to use this.' };
  if (await overQuota(userId, task)) {
    return { ok: false, status: 429, code: 'quota', message: 'You have used the daily allowance for this. Try again tomorrow.' };
  }
  return { ok: true, userId };
}
