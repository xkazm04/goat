import { toListItem } from '@/v2/ai/candidate';
import { itemUuid } from '@/v2/ai/ids';
import { pickGaps } from '@/v2/ai/providers';
import { gapsBodySchema } from '@/v2/ai/request';
import { gate, json } from '@/v2/ai/route-kit';
import { recordUsage, upsertItems } from '@/v2/ai/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  const parsed = gapsBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: { code: 'bad_request', message: 'Send the list.' } }, 400);
  const { snapshot } = parsed.data;

  const provider = pickGaps();
  const allowed = await gate(request, 'gaps', provider.source === 'claude');
  if (!allowed.ok) return json({ error: { code: allowed.code, message: allowed.message } }, allowed.status);

  try {
    const { candidates, usage, refused } = await provider.find({ snapshot, signal: request.signal });
    if (refused) return json({ error: { code: 'refused', message: 'That topic was declined.' } }, 422);

    const proposed = candidates.map((candidate) => ({ id: itemUuid(snapshot.topic, candidate.title, candidate.year), candidate }));
    if (allowed.userId) {
      await upsertItems(
        allowed.userId,
        snapshot.topic,
        proposed.map(({ id, candidate: c }) => ({ id, title: c.title, year: c.year, creator: c.creator, art: c.art, traits: c.traits })),
      );
      if (provider.source === 'claude') await recordUsage({ userId: allowed.userId, task: 'gaps', ...usage });
    }
    return json({
      source: provider.source,
      items: proposed.map(({ id, candidate }) => ({ item: toListItem(id, candidate), why: candidate.why })),
    });
  } catch {
    return json({ error: { code: 'failed', message: 'Could not look for gaps. Try again.' } }, 502);
  }
}
