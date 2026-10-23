import Anthropic from '@anthropic-ai/sdk';

import { candidateSchema, type Candidate } from './candidate';
import { buildCriticMessages, CRITIC_SYSTEM, type ChatTurn } from './critic';
import { GAP_SYSTEM, gapsJsonSchema, gapsOutputSchema, gapsUserMessage, newGaps } from './gaps';
import { MODEL } from './pool';

import type { ListSnapshot } from './snapshot';

type StreamParams = Parameters<Anthropic['beta']['messages']['stream']>[0];
type CreateParams = Parameters<Anthropic['beta']['messages']['create']>[0];

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

type CriticStep =
  | { type: 'delta'; text: string }
  | { type: 'refused' }
  | ({ type: 'usage' } & Usage);

export interface CriticProvider {
  readonly source: 'claude' | 'cli' | 'fixture';
  reply(input: { snapshot: ListSnapshot; turns: ChatTurn[]; signal?: AbortSignal }): AsyncGenerator<CriticStep>;
}

export interface GapProvider {
  readonly source: 'claude' | 'cli' | 'fixture';
  find(input: { snapshot: ListSnapshot; signal?: AbortSignal }): Promise<{ candidates: Candidate[]; usage: Usage; refused: boolean }>;
}

/** No model, no network: a canned reply that proves the plumbing, for CI and a fresh checkout. */
export function fixtureCritic(): CriticProvider {
  return {
    source: 'fixture',
    async *reply({ snapshot, turns }) {
      const top = snapshot.ranked[0]?.title ?? 'your list';
      const asked = turns.filter((t) => t.kind === 'user').length;
      const changed = turns.some((t) => t.kind === 'change');
      const text = `Fixture critic, round ${asked}: why is ${top} on top?${changed ? ' I saw your edits.' : ''}`;
      for (const word of text.split(' ')) yield { type: 'delta', text: `${word} ` };
      yield { type: 'usage', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
    },
  };
}

export function claudeCritic(client: Anthropic = new Anthropic()): CriticProvider {
  return {
    source: 'claude',
    async *reply({ snapshot, turns, signal }) {
      const stream = client.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 4000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: CRITIC_SYSTEM, cache_control: { type: 'ephemeral' } }],
          // Mid-conversation system messages are part of the plain Messages shape on this model.
          messages: buildCriticMessages(snapshot, turns),
        } as unknown as StreamParams,
        { signal },
      );

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'delta', text: event.delta.text };
        }
      }
      const message = await stream.finalMessage();
      if (message.stop_reason === 'refusal') yield { type: 'refused' };
      yield {
        type: 'usage',
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
      };
    },
  };
}

export function fixtureGaps(): GapProvider {
  return {
    source: 'fixture',
    async find({ snapshot }) {
      const candidates: Candidate[] = [1, 2, 3].map((n) => ({
        title: `${snapshot.topic} missing pick ${n}`,
        year: 1980 + n,
        creator: null,
        why: 'A stand-in gap suggestion generated without a model.',
        traits: ['overlooked'],
        art: { hues: [n * 70, (n * 70 + 120) % 360], motif: 'rings' },
      }));
      return { candidates: newGaps(candidates, snapshot), usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }, refused: false };
    },
  };
}

/** One structured call: up to five suggestions that are not already in the list. */
export function claudeGaps(client: Anthropic = new Anthropic()): GapProvider {
  return {
    source: 'claude',
    async find({ snapshot, signal }) {
      const response = await client.beta.messages.create(
        {
          model: MODEL,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium', format: { type: 'json_schema', schema: gapsJsonSchema } },
          system: [{ type: 'text', text: GAP_SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: gapsUserMessage(snapshot) }],
        } as unknown as CreateParams & { stream?: false },
        { signal },
      );
      const usage: Usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      };
      if (response.stop_reason === 'refusal') return { candidates: [], usage, refused: true };

      const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
      let raw: unknown = null;
      try {
        raw = JSON.parse(text);
      } catch {
        raw = null;
      }
      const parsed = gapsOutputSchema.safeParse(raw);
      const found = parsed.success
        ? parsed.data.candidates
        : // One bad item should not cost the rest.
          ((raw as { candidates?: unknown[] } | null)?.candidates ?? [])
            .map((c) => candidateSchema.safeParse(c))
            .flatMap((r) => (r.success ? [r.data] : []));
      return { candidates: newGaps(found, snapshot), usage, refused: false };
    },
  };
}
