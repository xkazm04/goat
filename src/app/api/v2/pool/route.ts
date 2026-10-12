import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { encodeEvent, type PoolEvent } from '@/v2/ai/events';
import { claudeProvider, fixtureProvider, type PoolProvider } from '@/v2/ai/pool';
import { accountingConfigured, callerFromToken, overQuota, recordUsage } from '@/v2/ai/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  topic: z.string().trim().min(2).max(120),
  size: z.union([z.literal(10), z.literal(25), z.literal(50)]).default(25),
});

/** Ask for more than the list holds, so the user can drop weak ones. */
const POOL_FACTOR = 1.2;

function pickProvider(): PoolProvider {
  const wanted = process.env.V2_AI_PROVIDER;
  if (wanted === 'fixture') return fixtureProvider();
  if (wanted === 'claude' || process.env.ANTHROPIC_API_KEY) return claudeProvider();
  return fixtureProvider();
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
}

function ndjson(stream: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(stream, {
    status,
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function single(event: PoolEvent, status: number): Response {
  return new Response(encodeEvent(event), {
    status,
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return single({ type: 'error', code: 'bad_request', message: 'Send a topic of 2 to 120 characters.' }, 400);
  }
  const { topic, size } = parsed.data;
  const provider = pickProvider();

  // The fixture provider spends nothing, so it needs no account. The real one does.
  let userId: string | null = null;
  if (provider.source === 'claude' && accountingConfigured()) {
    const caller = await callerFromToken(bearer(request));
    if (!caller) return single({ type: 'error', code: 'auth', message: 'Sign in (a guest session is enough) to create a list.' }, 401);
    userId = caller.userId;
    if (await overQuota(userId, 'pool')) {
      return single({ type: 'error', code: 'quota', message: 'You have used today\'s list creations. Try again tomorrow.' }, 429);
    }
  }

  const count = Math.ceil(size * POOL_FACTOR);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PoolEvent) => controller.enqueue(encoder.encode(encodeEvent(event)));
      let delivered = 0;
      let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
      try {
        for await (const step of provider.run({ topic, count, signal: request.signal })) {
          if (step.type === 'candidate') {
            delivered += 1;
            send({ type: 'candidate', candidate: step.candidate });
          } else if (step.type === 'usage') {
            usage = step;
          } else {
            send({ type: 'error', code: 'refused', message: 'That topic was declined. Try a different one.' });
          }
        }
        if (userId) await recordUsage({ userId, task: 'pool', ...usage });
        send({ type: 'done', count: delivered, source: provider.source });
      } catch (error) {
        const message =
          error instanceof Anthropic.RateLimitError
            ? 'The AI is busy right now. Try again in a minute.'
            : 'The pool could not be built. Try again.';
        send({ type: 'error', code: 'failed', message });
      } finally {
        controller.close();
      }
    },
  });
  return ndjson(stream);
}
