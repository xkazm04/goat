import { z } from 'zod';

import { MODEL } from './pool';

import type Anthropic from '@anthropic-ai/sdk';

/**
 * Trait tagging for items added outside the pool flow (custom or imported).
 * Pool candidates already carry traits; this is the async, half-price route
 * for the rest (docs/v2/TECHNICAL_PACKAGE.md §4, Message Batches API).
 */
const TAG_SYSTEM = `You tag items for a ranking app. Given a topic and one item, return up to three short lowercase traits (genre, mood, era, style) that describe it. Prefer common, reusable words over unique phrases.`;

const tagSchema = z.object({ traits: z.array(z.string().trim().min(1).max(40)).min(1).max(3) });

const tagJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['traits'],
  properties: { traits: { type: 'array', items: { type: 'string' } } },
} as const;

export interface TagInput {
  id: string;
  title: string;
  year: number | null;
  creator: string | null;
}

/** Batches accept at most 100,000 requests, but one list never needs more than this. */
const MAX_TAG_ITEMS = 200;

export function buildTagRequests(topic: string, items: TagInput[]) {
  return items.slice(0, MAX_TAG_ITEMS).map((item) => ({
    custom_id: item.id,
    params: {
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' as const },
      output_config: { effort: 'low' as const, format: { type: 'json_schema' as const, schema: tagJsonSchema } },
      system: [{ type: 'text' as const, text: TAG_SYSTEM, cache_control: { type: 'ephemeral' as const } }],
      messages: [
        {
          role: 'user' as const,
          content: `Topic: ${topic}\nItem: ${item.title}${item.year ? ` (${item.year})` : ''}${item.creator ? ` by ${item.creator}` : ''}`,
        },
      ],
    },
  }));
}

/** One batch result row, as far as this module needs it. */
export interface TagResultRow {
  custom_id: string;
  result: { type: string; message?: { content: { type: string; text?: string }[] } };
}

/** Results arrive in any order and may include errors; key by custom_id and skip what failed. */
export function parseTagResults(rows: TagResultRow[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    if (row.result.type !== 'succeeded') continue;
    const text = row.result.message?.content.find((b) => b.type === 'text')?.text;
    if (!text) continue;
    try {
      const parsed = tagSchema.safeParse(JSON.parse(text));
      if (parsed.success) out[row.custom_id] = parsed.data.traits;
    } catch {
      // A malformed row is skipped; the item keeps its empty traits.
    }
  }
  return out;
}

export type TagBatchState =
  | { status: 'in_progress' }
  | { status: 'ended'; traits: Record<string, string[]> }
  | { status: 'failed' };

export async function submitTagBatch(client: Anthropic, topic: string, items: TagInput[]): Promise<string> {
  const batch = await client.messages.batches.create({ requests: buildTagRequests(topic, items) as never });
  return batch.id;
}

export async function readTagBatch(client: Anthropic, batchId: string): Promise<TagBatchState> {
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== 'ended') return { status: 'in_progress' };
  const rows: TagResultRow[] = [];
  for await (const row of await client.messages.batches.results(batchId)) rows.push(row as unknown as TagResultRow);
  return { status: 'ended', traits: parseTagResults(rows) };
}
