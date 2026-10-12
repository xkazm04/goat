import { type Usage } from '@/v2/ai/converse';
import { encodeCriticEvent, type CriticEvent } from '@/v2/ai/critic';
import { pickCritic } from '@/v2/ai/providers';
import { criticBodySchema } from '@/v2/ai/request';
import { gate, ndjsonLine, ndjsonStream } from '@/v2/ai/route-kit';
import { recordUsage } from '@/v2/ai/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const parsed = criticBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return ndjsonLine(encodeCriticEvent({ type: 'error', code: 'bad_request', message: 'Send the list and a question.' }), 400);
  }
  // The last turn must be the user's question; otherwise there is nothing to answer.
  const { snapshot, turns } = parsed.data;
  if (turns[turns.length - 1].kind !== 'user') {
    return ndjsonLine(encodeCriticEvent({ type: 'error', code: 'bad_request', message: 'Ask a question first.' }), 400);
  }

  const provider = pickCritic();
  const allowed = await gate(request, 'critic', provider.source === 'claude');
  if (!allowed.ok) return ndjsonLine(encodeCriticEvent({ type: 'error', code: allowed.code, message: allowed.message }), allowed.status);

  const encoder = new TextEncoder();
  return ndjsonStream(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: CriticEvent) => controller.enqueue(encoder.encode(encodeCriticEvent(event)));
        let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
        try {
          for await (const step of provider.reply({ snapshot, turns, signal: request.signal })) {
            if (step.type === 'delta') send({ type: 'delta', text: step.text });
            else if (step.type === 'refused') send({ type: 'error', code: 'refused', message: 'The critic declined this one.' });
            else usage = step;
          }
          if (allowed.userId && provider.source === 'claude') await recordUsage({ userId: allowed.userId, task: 'critic', ...usage });
          send({ type: 'done', source: provider.source, cacheReadTokens: usage.cacheReadTokens });
        } catch {
          send({ type: 'error', code: 'failed', message: 'The critic could not answer. Try again.' });
        } finally {
          controller.close();
        }
      },
    }),
  );
}
