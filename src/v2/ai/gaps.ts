import { z } from 'zod';

import { candidateJsonSchema, candidateKey, candidateSchema, type Candidate } from './candidate';
import { renderSnapshot, type ListSnapshot } from './snapshot';

const MAX_GAPS = 5;

export const GAP_SYSTEM = `You spot what is missing from a ranking list in a topic. You are given the ranked items and the unranked pool.

Suggest up to ${MAX_GAPS} strong candidates that belong in a conversation about the greatest of all time in this topic and that are not already ranked or in the pool. Prefer real gaps (an era, style or sub-genre the list ignores) over more of what it already has. Use web search when you are unsure an item exists or what its year or creator is, and skip anything you cannot verify.

For each suggestion give the exact title, year, creator, one sentence on why it belongs, up to three short lowercase traits, and art direction (two hues at least 60 degrees apart and one motif).`;

export const gapsOutputSchema = z.object({ candidates: z.array(candidateSchema).max(MAX_GAPS) });

export const gapsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: { candidates: { type: 'array', items: candidateJsonSchema } },
} as const;

export function gapsUserMessage(snapshot: ListSnapshot): string {
  return `${renderSnapshot(snapshot)}\n\nWhat is missing?`;
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Drop suggestions already in the list or repeated, and cap at the limit. */
export function newGaps(found: Candidate[], snapshot: ListSnapshot): Candidate[] {
  const taken = new Set([...snapshot.ranked, ...snapshot.pool].map((i) => norm(i.title)));
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of found) {
    const key = candidateKey(c);
    if (taken.has(norm(c.title)) || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.slice(0, MAX_GAPS);
}
