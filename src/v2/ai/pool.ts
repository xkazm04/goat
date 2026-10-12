import Anthropic from '@anthropic-ai/sdk';

import { MOTIFS } from '@/v2/covers/art';

import { candidateJsonSchema, candidateKey, candidateSchema, type Candidate } from './candidate';


/** One v2 model for every task; depth is tuned per task with effort (TECHNICAL_PACKAGE §4). */
export const MODEL = 'claude-opus-5-5';

type StreamParams = Parameters<Anthropic['beta']['messages']['stream']>[0];

type PoolStep =
  | { type: 'candidate'; candidate: Candidate }
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheReadTokens: number }
  | { type: 'refused'; category: string | null };

export interface PoolProvider {
  readonly source: 'claude' | 'cli' | 'fixture';
  run(input: { topic: string; count: number; signal?: AbortSignal }): AsyncGenerator<PoolStep>;
}

/**
 * Stable on purpose: no dates, ids or per-request values, so the prefix
 * caches. The topic and the wanted count go in the user turn.
 */
export const POOL_SYSTEM = `You build the candidate pool for a ranking app. The user names a topic and you propose the strongest candidates for "the greatest of all time" in it.

Work like this:
- Ground the pool with web search when you are unsure a candidate exists or what its year or creator is. Skip a candidate you cannot verify.
- Call propose_candidate once per candidate, one call per item, as you go. Do not wait to batch them.
- Cover the field: different eras, styles and sub-genres, not one cluster. Include the obvious canon and a few informed picks.
- Give every candidate a one-sentence reason, up to three short lowercase traits that you reuse across candidates where they fit, and art direction: two hues at least 60 degrees apart and one motif that suits its mood (${MOTIFS.join(', ')}).
- Never repeat a candidate. Use the title people actually use.
- When you have proposed the requested number, stop and reply with one short sentence.`;

const PROPOSE_TOOL = {
  name: 'propose_candidate',
  description: 'Add one candidate to the pool for the list topic.',
  strict: true,
  eager_input_streaming: true,
  input_schema: candidateJsonSchema as unknown as Anthropic.Tool.InputSchema,
} as const;

/** A free provider for CI and offline work: deterministic, no network, no spend. */
export function fixtureProvider(): PoolProvider {
  return {
    source: 'fixture',
    async *run({ topic, count }) {
      const traits = ['classic', 'influential', 'cult', 'modern', 'bold', 'quiet'];
      for (let i = 0; i < count; i++) {
        const hue = (i * 47) % 360;
        const candidate: Candidate = {
          title: `${topic} contender ${i + 1}`,
          year: 1970 + ((i * 7) % 50),
          creator: null,
          why: `A stand-in candidate ${i + 1} for "${topic}", generated without a model.`,
          traits: [traits[i % traits.length], traits[(i + 2) % traits.length]],
          art: { hues: [hue, (hue + 90) % 360], motif: MOTIFS[i % MOTIFS.length] },
        };
        yield { type: 'candidate', candidate };
      }
    },
  };
}

/**
 * The real pool: an agentic loop over web search plus one strict client tool.
 * Each propose_candidate call is yielded as soon as its block closes, so the
 * route can stream it to the UI while the model keeps going.
 */
export function claudeProvider(client: Anthropic = new Anthropic()): PoolProvider {
  return {
    source: 'claude',
    async *run({ topic, count, signal }) {
      const messages: Anthropic.Beta.BetaMessageParam[] = [
        {
          role: 'user',
          content: `Topic: ${topic.trim()}\nPropose ${count} candidates.`,
        },
      ];
      const seen = new Set<string>();
      let proposed = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;

      // Each turn is one streamed request; tool_use turns continue until the pool is full.
      for (let turn = 0; turn < 12 && proposed < count; turn++) {
        const stream = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 32000,
            betas: ['server-side-fallback-2026-07-01'],
            // A safety-classifier refusal is retried on a suitable model instead of failing.
            fallbacks: 'default',
            thinking: { type: 'adaptive' },
            output_config: { effort: 'medium' },
            system: [{ type: 'text', text: POOL_SYSTEM, cache_control: { type: 'ephemeral' } }],
            tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }, PROPOSE_TOOL],
            messages,
          } as StreamParams,
          { signal },
        );

        const finished: Anthropic.Beta.BetaToolUseBlock[] = [];
        stream.on('contentBlock', (block) => {
          if (block.type === 'tool_use' && block.name === PROPOSE_TOOL.name) finished.push(block);
        });
        const message = await stream.finalMessage();

        inputTokens += message.usage.input_tokens;
        outputTokens += message.usage.output_tokens;
        cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;

        if (message.stop_reason === 'refusal') {
          yield { type: 'refused', category: message.stop_details?.category ?? null };
          break;
        }

        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of message.content) {
          if (block.type !== 'tool_use' || block.name !== PROPOSE_TOOL.name) continue;
          const parsed = candidateSchema.safeParse(block.input);
          if (!parsed.success) {
            results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: 'Invalid candidate; skipped.' });
            continue;
          }
          const id = candidateKey(parsed.data);
          if (seen.has(id)) {
            results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: 'Already proposed; skipped.' });
            continue;
          }
          seen.add(id);
          proposed += 1;
          results.push({ type: 'tool_result', tool_use_id: block.id, content: 'Added.' });
          yield { type: 'candidate', candidate: parsed.data };
        }

        if (message.stop_reason === 'max_tokens') break;
        if (message.stop_reason === 'end_turn') break;
        messages.push({ role: 'assistant', content: message.content });
        // pause_turn (server tool still running) continues with no new user content.
        if (results.length > 0) messages.push({ role: 'user', content: results });
      }

      yield { type: 'usage', inputTokens, outputTokens, cacheReadTokens };
    },
  };
}
