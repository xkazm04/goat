import { z } from 'zod';

import { MOTIFS, type ArtDirection } from '@/v2/covers/art';
import { DEFAULT_TIERS, type ListDoc, type ListItem, type ListSize } from '@/v2/list/types';

/**
 * One pool candidate as Claude proposes it: the item, why it belongs, three
 * traits and its art direction, all in one tool call (docs/v2/TECHNICAL_PACKAGE.md §4).
 */
export const candidateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  year: z.number().int().min(-3000).max(2100).nullable(),
  creator: z.string().trim().max(120).nullable(),
  why: z.string().trim().min(1).max(280),
  traits: z.array(z.string().trim().min(1).max(40)).min(1).max(3),
  art: z.object({
    hues: z.tuple([z.number().min(0).max(359), z.number().min(0).max(359)]),
    motif: z.enum(MOTIFS),
  }),
});

export type Candidate = z.infer<typeof candidateSchema>;

/** The JSON Schema the model sees for `propose_candidate`. Kept literal so strict mode can rely on it. */
export const candidateJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'year', 'creator', 'why', 'traits', 'art'],
  properties: {
    title: { type: 'string', description: 'The exact, commonly used title or name.' },
    year: { type: ['integer', 'null'], description: 'Release or founding year, or null when it has none.' },
    creator: { type: ['string', 'null'], description: 'Director, artist, studio, author or maker, or null.' },
    why: { type: 'string', description: 'One sentence on why this belongs among the greatest.' },
    traits: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to three short lowercase traits (genre, mood, era), reused across candidates where they fit.',
    },
    art: {
      type: 'object',
      additionalProperties: false,
      required: ['hues', 'motif'],
      properties: {
        hues: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Two hue angles from 0 to 359 for the cover gradient, at least 60 apart.',
        },
        motif: { type: 'string', enum: [...MOTIFS] },
      },
    },
  },
} as const;

/** Stable id from the title, so the same candidate keeps its id across a regenerate. */
export function candidateId(c: Pick<Candidate, 'title' | 'year'>): string {
  const slug = c.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `c-${slug || 'item'}${c.year === null ? '' : `-${c.year}`}`;
}

function toListItem(c: Candidate): ListItem {
  const art: ArtDirection = { hues: [c.art.hues[0], c.art.hues[1]], motif: c.art.motif };
  return { id: candidateId(c), title: c.title, year: c.year, creator: c.creator, imageUrl: null, art, traits: c.traits };
}

/** A new list whose whole pool is the candidates and whose ranking is empty. */
export function docFromCandidates(input: {
  id: string;
  topic: string;
  size: ListSize;
  candidates: Candidate[];
}): { doc: ListDoc; items: ListItem[]; why: Record<string, string> } {
  const items: ListItem[] = [];
  const why: Record<string, string> = {};
  for (const c of input.candidates) {
    const item = toListItem(c);
    if (items.some((i) => i.id === item.id)) continue;
    items.push(item);
    why[item.id] = c.why;
  }
  const doc: ListDoc = {
    id: input.id,
    title: `The Greatest ${input.topic.trim()}`,
    topic: input.topic.trim(),
    size: input.size,
    order: [],
    pool: items.map((i) => i.id),
    tiers: DEFAULT_TIERS.map((t) => ({ ...t })),
    notes: {},
    canvasX: {},
    stagePreset: 'podium',
  };
  return { doc, items, why };
}
