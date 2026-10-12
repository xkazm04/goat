import { getBrowserClient } from '@/v2/db/browser';

import { parseCriticLine, type ChatTurn, type CriticEvent } from './critic';
import { createLineSplitter, parseEventLine, type PoolEvent } from './events';

import type { ListSnapshot } from './snapshot';
import type { Persona } from './taste';
import type { Dna } from '@/v2/dna/dna';
import type { ListItem , ListSize } from '@/v2/list/types';



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

/** Stream the critic's reply to the last user turn. */
export async function* streamCritic(input: {
  snapshot: ListSnapshot;
  turns: ChatTurn[];
  signal?: AbortSignal;
}): AsyncGenerator<CriticEvent> {
  const token = await accessToken();
  const response = await fetch('/api/v2/critic', {
    method: 'POST',
    signal: input.signal,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ snapshot: input.snapshot, turns: input.turns }),
  });
  if (!response.body) {
    yield { type: 'error', code: 'failed', message: 'The server sent no data.' };
    return;
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const lines = createLineSplitter();
  for (;;) {
    const { done, value } = await reader.read();
    for (const line of done ? lines.flush() : lines.push(value)) {
      const event = parseCriticLine(line);
      if (event) yield event;
    }
    if (done) return;
  }
}

export interface GapSuggestion {
  item: ListItem;
  why: string;
}

/** Ask for up to five suggestions that are missing from the list. */
export async function findGaps(snapshot: ListSnapshot, signal?: AbortSignal): Promise<GapSuggestion[]> {
  const token = await accessToken();
  const response = await fetch('/api/v2/gaps', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ snapshot }),
  });
  const body = (await response.json().catch(() => null)) as
    | { items?: GapSuggestion[]; error?: { message?: string } }
    | null;
  if (!response.ok || !body?.items) throw new Error(body?.error?.message ?? 'Could not look for gaps.');
  return body.items;
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const token = await accessToken();
  const response = await fetch(path, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !data || data.error) throw new Error(data?.error?.message ?? 'The request failed.');
  return data;
}

export function fetchPersona(input: { dna: Dna; previousCardNo: number; sourceLists: string[] }, signal?: AbortSignal) {
  return postJson<{ persona: Persona; cardNo: number; source: string }>('/api/v2/persona', input, signal);
}

export interface RecommendationView {
  item: ListItem;
  topic: string;
  reason: string;
  match: number;
}

export async function fetchRecommendations(
  input: { dna: Dna; topics: string[]; exclude: string[] },
  signal?: AbortSignal,
): Promise<RecommendationView[]> {
  const body = await postJson<{ items: RecommendationView[] }>('/api/v2/recommend', input, signal);
  return body.items;
}
