import { z } from 'zod';

import { renderSnapshot, type ListSnapshot } from './snapshot';

/**
 * Stable on purpose (no dates, ids or list data) so it caches. The list goes
 * in the first user turn; later edits arrive as system messages, never as a
 * rewrite of this prefix (docs/v2/TECHNICAL_PACKAGE.md §4).
 */
export const CRITIC_SYSTEM = `You are the critic in a ranking app. The user is ranking a list of the greatest of all time in some topic, and you argue with their choices so they sharpen them.

- Be direct and specific. Name items and ranks. Make one strong point, then ask one pointed question.
- Take the other side when the ranking looks lazy, sentimental or inconsistent, and concede honestly when the user makes a good case.
- Judge the ranking, not the user. Never change the list yourself and never claim you did.
- Messages starting with "System:" describe edits the user made since you last spoke. Treat them as fact and react to them when they matter.
- Keep replies under 120 words, in plain prose with no headings or lists.`;

export const turnSchema = z.object({
  kind: z.enum(['user', 'assistant', 'change']),
  text: z.string().trim().min(1).max(2000),
});

export type ChatTurn = z.infer<typeof turnSchema>;

export interface CriticMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[];
}

/**
 * Lay a conversation out for the API so the cached prefix never moves:
 * snapshot (cached) + first question, then alternating turns. List edits
 * become a system message placed right after the user turn they precede,
 * because a system message must follow a user message.
 */
export function buildCriticMessages(snapshot: ListSnapshot, turns: ChatTurn[]): CriticMessage[] {
  const out: CriticMessage[] = [];
  let pending: string[] = [];
  let first = true;

  for (const turn of turns) {
    if (turn.kind === 'change') {
      pending.push(turn.text);
    } else if (turn.kind === 'user') {
      if (first) {
        out.push({
          role: 'user',
          content: [
            { type: 'text', text: renderSnapshot(snapshot), cache_control: { type: 'ephemeral' } },
            { type: 'text', text: turn.text },
          ],
        });
        first = false;
        pending = []; // the snapshot already reflects everything before the first question
      } else {
        out.push({ role: 'user', content: turn.text });
        if (pending.length > 0) {
          out.push({ role: 'system', content: `System: the list changed since your last reply.\n${pending.join('\n')}` });
          pending = [];
        }
      }
    } else if (!first) {
      out.push({ role: 'assistant', content: turn.text });
    }
  }
  return out;
}

/** What `/api/v2/critic` streams, one JSON object per line. */
export type CriticEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; source: 'claude' | 'cli' | 'fixture'; cacheReadTokens: number }
  | { type: 'error'; code: 'quota' | 'auth' | 'refused' | 'failed' | 'bad_request'; message: string };

export function encodeCriticEvent(event: CriticEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseCriticLine(line: string): CriticEvent | null {
  const text = line.trim();
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as { type?: unknown; text?: unknown };
    if (raw.type === 'delta' && typeof raw.text === 'string') return raw as CriticEvent;
    if (raw.type === 'done' || raw.type === 'error') return raw as CriticEvent;
  } catch {
    return null;
  }
  return null;
}
