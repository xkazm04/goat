import { getBrowserClient } from '@/v2/db/browser';

import { createLineSplitter, parseEventLine, type PoolEvent } from './events';

import type { ListSize } from '@/v2/list/types';

async function accessToken(): Promise<string | null> {
  const client = getBrowserClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Stream the candidate pool for a topic. Yields events as the server sends them. */
export async function* streamPool(input: { topic: string; size: ListSize; signal?: AbortSignal }): AsyncGenerator<PoolEvent> {
  const token = await accessToken();
  const response = await fetch('/api/v2/pool', {
    method: 'POST',
    signal: input.signal,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ topic: input.topic, size: input.size }),
  });
  if (!response.body) {
    yield { type: 'error', code: 'failed', message: 'The server sent no data.' };
    return;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const lines = createLineSplitter();
  for (;;) {
    const { done, value } = await reader.read();
    const batch = done ? lines.flush() : lines.push(value);
    for (const line of batch) {
      const event = parseEventLine(line);
      if (event) yield event;
    }
    if (done) return;
  }
}
