import { MOTIFS } from '@/v2/covers/art';

import { candidateKey, candidateSchema, type Candidate } from './candidate';
import { completeCli, extractJsonObject, runCli } from './cli';
import { type CriticProvider, type GapProvider } from './converse';
import { buildCriticMessages, CRITIC_SYSTEM, type ChatTurn } from './critic';
import { GAP_SYSTEM, gapsOutputSchema, gapsUserMessage, newGaps } from './gaps';

import type { PoolProvider } from './pool';
import type { ListSnapshot } from './snapshot';

const CANDIDATE_SHAPE = `{"title": string, "year": integer or null, "creator": string or null, "why": one sentence, "traits": [1 to 3 short lowercase strings], "art": {"hues": [integer 0-359, integer 0-359 at least 60 apart], "motif": one of ${MOTIFS.join(' | ')}}}`;

const POOL_SYSTEM = `You build the candidate pool for a ranking app. The user names a topic and you propose the strongest candidates for "the greatest of all time" in it.

Output one JSON object per line and nothing else: no prose, no markdown, no code fences, no numbering.
Each line has this shape: ${CANDIDATE_SHAPE}.
Cover different eras and styles, give real items only, never repeat one, and use the title people actually use.`;

/** The Claude Code CLI as the pool engine: candidates are parsed from the text as each line completes. */
export function cliPool(): PoolProvider {
  return {
    source: 'cli',
    async *run({ topic, count, signal }) {
      const seen = new Set<string>();
      let buffer = '';
      let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
      let proposed = 0;

      const take = function* (line: string): Generator<Candidate> {
        const raw = extractJsonObject(line);
        const parsed = candidateSchema.safeParse(raw);
        if (!parsed.success) return;
        const key = candidateKey(parsed.data);
        if (seen.has(key) || proposed >= count) return;
        seen.add(key);
        proposed += 1;
        yield parsed.data;
      };

      for await (const event of runCli({ system: POOL_SYSTEM, prompt: `Topic: ${topic.trim()}\nPropose ${count} candidates.`, signal })) {
        if (event.type === 'delta') {
          buffer += event.text;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) for (const candidate of take(line)) yield { type: 'candidate', candidate };
        } else {
          if (event.isError) throw new Error(`claude CLI error: ${event.text}`);
          usage = event.usage;
        }
      }
      for (const candidate of take(buffer)) yield { type: 'candidate', candidate };
      yield { type: 'usage', ...usage };
    },
  };
}

/** The CLI takes one prompt, so the chat is laid out as a transcript. */
function transcript(snapshot: ListSnapshot, turns: ChatTurn[]): string {
  const parts: string[] = [];
  for (const m of buildCriticMessages(snapshot, turns)) {
    const text = typeof m.content === 'string' ? m.content : m.content.map((b) => b.text).join('\n\n');
    parts.push(`${m.role === 'assistant' ? 'Critic' : m.role === 'system' ? 'Note' : 'User'}:\n${text}`);
  }
  return `${parts.join('\n\n')}\n\nCritic:`;
}

export function cliCritic(): CriticProvider {
  return {
    source: 'cli',
    async *reply({ snapshot, turns, signal }) {
      let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
      for await (const event of runCli({ system: CRITIC_SYSTEM, prompt: transcript(snapshot, turns), signal })) {
        if (event.type === 'delta') yield { type: 'delta', text: event.text };
        else {
          if (event.isError) throw new Error(`claude CLI error: ${event.text}`);
          usage = event.usage;
        }
      }
      yield { type: 'usage', ...usage };
    },
  };
}

export function cliGaps(): GapProvider {
  return {
    source: 'cli',
    async find({ snapshot, signal }) {
      const system = `${GAP_SYSTEM}\n\nReply with only a JSON object {"candidates": [...]} whose items have this shape: ${CANDIDATE_SHAPE}. No prose, no code fences.`;
      const { text, usage } = await completeCli({ system, prompt: gapsUserMessage(snapshot), signal });
      const raw = extractJsonObject(text);
      const whole = gapsOutputSchema.safeParse(raw);
      const list = (raw as { candidates?: unknown[] } | null)?.candidates ?? [];
      const found = whole.success
        ? whole.data.candidates
        : list.flatMap((c) => {
            const r = candidateSchema.safeParse(c);
            return r.success ? [r.data] : [];
          });
      return { candidates: newGaps(found, snapshot), usage, refused: false };
    },
  };
}
