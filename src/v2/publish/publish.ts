import { pushList, type Client } from '@/v2/list/sync';

import { slugAttempt, slugify } from './slug';

import type { ListDoc } from '@/v2/list/types';

export type Published = 'unlisted' | 'public';

const MAX_ATTEMPTS = 5;
/** Postgres unique_violation, as PostgREST reports it. */
const UNIQUE_VIOLATION = '23505';

/**
 * Make a list reachable at /p/<slug>. The list is pushed first, so what
 * visitors see is what you just saw. A list keeps its slug when it is
 * republished or switched between unlisted and public, so shared links keep
 * working.
 */
export async function publishList(
  client: Client,
  doc: ListDoc,
  ownerId: string,
  visibility: Published,
  random: () => number = Math.random,
): Promise<{ slug: string }> {
  await pushList(client, doc, ownerId);

  const current = await client.from('lists').select('slug').eq('id', doc.id).maybeSingle();
  if (current.error) throw new Error(current.error.message);
  const existing = (current.data as { slug: string | null } | null)?.slug ?? null;

  const publishedAt = new Date().toISOString();
  if (existing) {
    const res = await client.from('lists').update({ visibility, published_at: publishedAt }).eq('id', doc.id);
    if (res.error) throw new Error(res.error.message);
    return { slug: existing };
  }

  const base = slugify(doc.title);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const slug = slugAttempt(base, attempt, random);
    const res = await client.from('lists').update({ slug, visibility, published_at: publishedAt }).eq('id', doc.id);
    if (!res.error) return { slug };
    if (res.error.code !== UNIQUE_VIOLATION) throw new Error(res.error.message);
  }
  throw new Error('Could not find a free address for this list. Try renaming it.');
}

/** Take a list back to private. Its slug is kept, so republishing restores the same link. */
export async function unpublishList(client: Client, listId: string): Promise<void> {
  const res = await client.from('lists').update({ visibility: 'private', published_at: null }).eq('id', listId);
  if (res.error) throw new Error(res.error.message);
}
