import { pickTaste } from '@/v2/ai/providers';
import { personaBodySchema } from '@/v2/ai/request';
import { gate, json } from '@/v2/ai/route-kit';
import { nextCardNo, recordUsage, saveProfile } from '@/v2/ai/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Write the persona for a taste fingerprint and give it the next card number.
 * Signed in, the number counts up in `taste_profiles` and the profile is
 * stored; without an account the browser's last number plus one is used.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = personaBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: { code: 'bad_request', message: 'Send a taste fingerprint.' } }, 400);
  const { dna, previousCardNo, sourceLists } = parsed.data;
  if (dna.listCount === 0 || dna.traits.length === 0) {
    return json({ error: { code: 'bad_request', message: 'Rank at least three items in a list first.' } }, 400);
  }

  const provider = pickTaste();
  const allowed = await gate(request, 'persona', provider.source === 'claude');
  if (!allowed.ok) return json({ error: { code: allowed.code, message: allowed.message } }, allowed.status);

  try {
    const { persona, usage } = await provider.persona({ dna, signal: request.signal });
    let cardNo = previousCardNo + 1;
    if (allowed.userId) {
      cardNo = (await nextCardNo(allowed.userId)) ?? cardNo;
      await saveProfile({
        userId: allowed.userId,
        traits: dna.traits,
        axes: { era: dna.era },
        persona,
        cardNo,
        sourceLists,
      });
      if (provider.source === 'claude') await recordUsage({ userId: allowed.userId, task: 'persona', ...usage });
    }
    return json({ persona, cardNo, source: provider.source });
  } catch {
    return json({ error: { code: 'failed', message: 'Could not write the persona. Try again.' } }, 502);
  }
}
