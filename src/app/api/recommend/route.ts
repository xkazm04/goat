import { titleKey, toListItem } from '@/v2/ai/candidate';
import { itemUuid } from '@/v2/ai/ids';
import { pickTaste } from '@/v2/ai/providers';
import { recommendBodySchema } from '@/v2/ai/request';
import { gate, json } from '@/v2/ai/route-kit';
import { recordUsage, saveRecommendations, upsertItems } from '@/v2/ai/server';
import { matchScore } from '@/v2/dna/dna';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Recommendations for a taste fingerprint. The model proposes; the match
 * percentage is computed here from trait overlap, so it is ours and not the
 * model's, and the list is ordered by it.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = recommendBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: { code: 'bad_request', message: 'Send a taste fingerprint.' } }, 400);
  const { dna, topics, exclude } = parsed.data;
  if (dna.traits.length === 0) return json({ error: { code: 'bad_request', message: 'Rank a list first.' } }, 400);

  const provider = pickTaste();
  const allowed = await gate(request, 'recommend', provider.source === 'claude');
  if (!allowed.ok) return json({ error: { code: allowed.code, message: allowed.message } }, allowed.status);

  try {
    const { items, usage } = await provider.recommend({ dna, topics, exclude, signal: request.signal });
    const have = new Set(exclude.map((t) => titleKey(t)));
    const scored = items
      .filter((r) => !have.has(titleKey(r.title)))
      .map((r) => ({ r, id: itemUuid(r.topic, r.title, r.year), match: matchScore(dna.traits, r.traits) }))
      .sort((a, b) => b.match - a.match);

    if (allowed.userId) {
      for (const { r, id } of scored) {
        await upsertItems(allowed.userId, r.topic, [{ id, title: r.title, year: r.year, creator: r.creator, art: r.art, traits: r.traits }]);
      }
      await saveRecommendations(
        allowed.userId,
        scored.map(({ r, id, match }) => ({ itemId: id, score: match, reason: r.why })),
      );
      if (provider.source === 'claude') await recordUsage({ userId: allowed.userId, task: 'recommend', ...usage });
    }
    return json({
      source: provider.source,
      items: scored.map(({ r, id, match }) => ({ item: toListItem(id, r), topic: r.topic, reason: r.why, match })),
    });
  } catch {
    return json({ error: { code: 'failed', message: 'Could not build recommendations. Try again.' } }, 502);
  }
}
