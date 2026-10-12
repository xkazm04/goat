import Anthropic from '@anthropic-ai/sdk';

import { tagBodySchema } from '@/v2/ai/request';
import { gate, json } from '@/v2/ai/route-kit';
import { recordUsage } from '@/v2/ai/server';
import { readTagBatch, submitTagBatch } from '@/v2/ai/tagging';

export const runtime = 'nodejs';

/** POST starts a batch and returns its id. GET ?batch=<id> reports it, with traits once it has ended. */
export async function POST(request: Request): Promise<Response> {
  const parsed = tagBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: { code: 'bad_request', message: 'Send a topic and items.' } }, 400);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: { code: 'unavailable', message: 'Tagging needs an Anthropic key.' } }, 503);

  const allowed = await gate(request, 'tag', true);
  if (!allowed.ok) return json({ error: { code: allowed.code, message: allowed.message } }, allowed.status);

  try {
    const batchId = await submitTagBatch(new Anthropic(), parsed.data.topic, parsed.data.items);
    if (allowed.userId) await recordUsage({ userId: allowed.userId, task: 'tag', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
    return json({ batchId });
  } catch {
    return json({ error: { code: 'failed', message: 'Could not start tagging.' } }, 502);
  }
}

export async function GET(request: Request): Promise<Response> {
  const batchId = new URL(request.url).searchParams.get('batch');
  if (!batchId || !/^[A-Za-z0-9_-]{8,80}$/.test(batchId)) return json({ error: { code: 'bad_request', message: 'Send a batch id.' } }, 400);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: { code: 'unavailable', message: 'Tagging needs an Anthropic key.' } }, 503);

  const allowed = await gate(request, 'tag', true);
  if (!allowed.ok) return json({ error: { code: allowed.code, message: allowed.message } }, allowed.status);

  try {
    return json(await readTagBatch(new Anthropic(), batchId));
  } catch {
    return json({ error: { code: 'failed', message: 'Could not read the batch.' } }, 502);
  }
}
