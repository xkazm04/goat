import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import type { Dna } from '@/v2/dna/dna';

import { candidateJsonSchema, candidateSchema, candidateKey } from './candidate';
import { completeCli, extractJsonObject } from './cli';
import { MODEL } from './pool';

import type { Usage } from './converse';

/** Cut over-long model text at a word boundary instead of rejecting the whole answer. */
function clip(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .transform((text) => {
      if (text.length <= max) return text;
      const cut = text.slice(0, max - 1);
      const space = cut.lastIndexOf(' ');
      return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`;
    });
}

export const personaSchema = z.object({
  name: clip(40),
  tagline: clip(140),
  evidence: z.array(clip(160)).min(3).transform((lines) => lines.slice(0, 3)),
});

export type Persona = z.infer<typeof personaSchema>;

const MAX_RECS = 10;

const recommendationSchema = candidateSchema.extend({ topic: z.string().trim().min(1).max(120) });
type Recommendation = z.infer<typeof recommendationSchema>;

const recsOutputSchema = z.object({ recommendations: z.array(recommendationSchema).max(MAX_RECS) });

const personaJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'tagline', 'evidence'],
  properties: {
    name: { type: 'string', description: 'A two to four word persona name, like a character class.' },
    tagline: { type: 'string', description: 'One sentence that sums up this taste.' },
    evidence: { type: 'array', items: { type: 'string' }, description: 'Exactly three short observations, each citing a trait or an item.' },
  },
} as const;

const recsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
    recommendations: {
      type: 'array',
      items: {
        ...candidateJsonSchema,
        required: [...candidateJsonSchema.required, 'topic'],
        properties: { ...candidateJsonSchema.properties, topic: { type: 'string', description: 'The topic this item belongs to, like "90s sci-fi films".' } },
      },
    },
  },
} as const;

/** Stable on purpose: nothing per-person in the system prompts, so they cache. */
const PERSONA_SYSTEM = `You write a taste persona for a ranking app from a person's taste fingerprint: their strongest traits (weight 0 to 1), where their favourites sit between classic and modern (0 to 1), and the items they rank highest.

Give them a persona name of two to four words (under 40 characters), a one-sentence tagline (under 140 characters), and exactly three pieces of evidence (each under 160 characters). Each piece of evidence must point at a real trait or item from the fingerprint. Be specific, warm and a little playful. Never invent facts about the person beyond the fingerprint, and never mention numbers or weights.`;

const RECS_SYSTEM = `You recommend items to a person from their taste fingerprint: their strongest traits (weight 0 to 1), where their favourites sit between classic and modern, the topics they rank, and the items they already ranked.

Suggest up to ${MAX_RECS} items they have not ranked and are likely to love. Mix topics they already rank with adjacent ones. Prefer real, well-known items you are sure exist. For each give the exact title, year, creator, a one-sentence reason that names the trait or favourite it connects to, one to three short lowercase traits (reuse the fingerprint's trait names where they genuinely fit), the topic, and art direction (two hues at least 60 degrees apart and one motif).`;

function fingerprintText(dna: Dna): string {
  const traits = dna.traits.map((t) => `${t.name} (${t.weight.toFixed(2)})`).join(', ') || 'none yet';
  const era = dna.era ? `${dna.era.position.toFixed(2)} (average year ${dna.era.meanYear})` : 'unknown';
  const top = dna.topItems.map((i) => (i.year ? `${i.title} (${i.year})` : i.title)).join('; ') || 'none yet';
  return `Traits: ${traits}\nClassic (0) to modern (1): ${era}\nTop items: ${top}`;
}

function personaPrompt(dna: Dna): string {
  return `${fingerprintText(dna)}\n\nWrite the persona.`;
}

function recommendPrompt(dna: Dna, topics: string[], exclude: string[]): string {
  const have = exclude.slice(0, 80).join('; ') || 'none';
  return `${fingerprintText(dna)}\nTopics they rank: ${topics.join('; ') || 'none yet'}\nAlready ranked, do not repeat: ${have}\n\nRecommend.`;
}

export interface TasteProvider {
  readonly source: 'claude' | 'cli' | 'fixture';
  persona(input: { dna: Dna; signal?: AbortSignal }): Promise<{ persona: Persona; usage: Usage }>;
  recommend(input: { dna: Dna; topics: string[]; exclude: string[]; signal?: AbortSignal }): Promise<{ items: Recommendation[]; usage: Usage }>;
}

const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };

export function fixtureTaste(): TasteProvider {
  return {
    source: 'fixture',
    async persona({ dna }) {
      const [a, b, c] = dna.traits.map((t) => t.name);
      return {
        persona: {
          name: 'The Fixture Archivist',
          tagline: 'A stand-in persona written without a model.',
          evidence: [`Leans ${a ?? 'every'} way`, `Keeps returning to ${b ?? 'the classics'}`, `Has a soft spot for ${c ?? 'surprises'}`],
        },
        usage: NO_USAGE,
      };
    },
    async recommend({ dna, topics }) {
      const topic = topics[0] ?? 'Anything';
      const trait = dna.traits[0]?.name ?? 'classic';
      const items: Recommendation[] = [1, 2, 3, 4, 5, 6].map((n) => ({
        title: `${topic} recommendation ${n}`,
        year: 1990 + n,
        creator: null,
        why: `A stand-in pick that shares your ${trait} streak.`,
        traits: n % 2 === 0 ? [trait] : ['wildcard'],
        art: { hues: [n * 50, (n * 50 + 100) % 360] as [number, number], motif: 'grid' as const },
        topic,
      }));
      return { items, usage: NO_USAGE };
    },
  };
}

type JsonCall = { system: string; prompt: string; jsonSchema: object; effort: 'low' | 'medium' | 'high'; signal?: AbortSignal };

async function claudeJson(client: Anthropic, call: JsonCall): Promise<{ raw: unknown; usage: Usage }> {
  const response = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: call.effort, format: { type: 'json_schema', schema: call.jsonSchema } },
      system: [{ type: 'text', text: call.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: call.prompt }],
    } as unknown as Parameters<Anthropic['beta']['messages']['create']>[0] & { stream?: false },
    { signal: call.signal },
  );
  if (response.stop_reason === 'refusal') throw new Error('refused');
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
  return {
    raw: extractJsonObject(text),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}

async function cliJson(call: JsonCall): Promise<{ raw: unknown; usage: Usage }> {
  const system = `${call.system}\n\nReply with only one JSON object matching this JSON Schema. No prose, no code fences.\n${JSON.stringify(call.jsonSchema)}`;
  const { text, usage } = await completeCli({ system, prompt: call.prompt, signal: call.signal });
  return { raw: extractJsonObject(text), usage };
}

/** Drop invalid items and repeats instead of failing the whole list. */
function validRecommendations(raw: unknown): Recommendation[] {
  const whole = recsOutputSchema.safeParse(raw);
  if (whole.success) return whole.data.recommendations;
  const list = (raw as { recommendations?: unknown[] } | null)?.recommendations ?? [];
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const entry of list) {
    const r = recommendationSchema.safeParse(entry);
    if (!r.success || seen.has(candidateKey(r.data))) continue;
    seen.add(candidateKey(r.data));
    out.push(r.data);
  }
  return out.slice(0, MAX_RECS);
}

function tasteWith(source: 'claude' | 'cli', run: (call: JsonCall) => Promise<{ raw: unknown; usage: Usage }>): TasteProvider {
  return {
    source,
    async persona({ dna, signal }) {
      const { raw, usage } = await run({ system: PERSONA_SYSTEM, prompt: personaPrompt(dna), jsonSchema: personaJsonSchema, effort: 'high', signal });
      const persona = personaSchema.parse(raw);
      return { persona, usage };
    },
    async recommend({ dna, topics, exclude, signal }) {
      const { raw, usage } = await run({
        system: RECS_SYSTEM,
        prompt: recommendPrompt(dna, topics, exclude),
        jsonSchema: recsJsonSchema,
        effort: 'medium',
        signal,
      });
      return { items: validRecommendations(raw), usage };
    },
  };
}

export const claudeTaste = (client: Anthropic = new Anthropic()): TasteProvider => tasteWith('claude', (call) => claudeJson(client, call));
export const cliTaste = (): TasteProvider => tasteWith('cli', cliJson);
