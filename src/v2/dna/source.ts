
import type { getBrowserClient } from '@/v2/db/browser';
import type { ListStorage } from '@/v2/list/storage';
import { loadList } from '@/v2/list/sync';
import type { ListDoc, ListItem } from '@/v2/list/types';

import type { DnaList } from './dna';

type Client = NonNullable<ReturnType<typeof getBrowserClient>>;

export interface TasteSources {
  lists: DnaList[];
  /** Topics the person ranks, without repeats. */
  topics: string[];
  /** Every item title across their lists, to keep recommendations new. */
  titles: string[];
  listIds: string[];
}

function toDnaList(doc: ListDoc, items: Record<string, ListItem>, updatedAt: number): DnaList {
  return {
    id: doc.id,
    size: doc.size,
    updatedAt,
    ranked: doc.order.flatMap((id) => {
      const item = items[id];
      return item ? [{ id, title: item.title, year: item.year, traits: item.traits }] : [];
    }),
  };
}

/**
 * Everything the profile is built from: the lists saved in this browser
 * (always at least as fresh as the server's) plus the signed-in person's
 * other lists from Supabase. The demo list counts, so a fresh browser can see
 * a card; until publishing exists (M6) every list counts, not only published ones.
 */
export async function gatherTasteSources(input: {
  storage: ListStorage;
  client: Client | null;
  userId: string | null;
}): Promise<TasteSources> {
  const lists = new Map<string, DnaList>();
  const topics = new Set<string>();
  const titles = new Set<string>();

  const add = (doc: ListDoc, items: Record<string, ListItem>, updatedAt: number) => {
    if (lists.has(doc.id)) return;
    lists.set(doc.id, toDnaList(doc, items, updatedAt));
    if (doc.topic) topics.add(doc.topic);
    for (const id of [...doc.order, ...doc.pool]) if (items[id]) titles.add(items[id].title);
  };

  for (const { id, saved } of await input.storage.all()) {
    const items = Object.fromEntries(saved.items.map((i) => [i.id, i]));
    const parsed = Date.parse(saved.savedAt);
    add({ ...saved.history.present, id }, items, Number.isNaN(parsed) ? Date.now() : parsed);
  }

  if (input.client && input.userId) {
    try {
      const res = await input.client.from('lists').select('id, updated_at').eq('owner_id', input.userId);
      const rows = (res.data ?? []) as { id: string; updated_at?: string }[];
      for (const row of rows) {
        if (lists.has(row.id)) continue;
        const remote = await loadList(input.client, row.id);
        if (!remote) continue;
        const at = row.updated_at ? Date.parse(row.updated_at) : NaN;
        add(remote.doc, Object.fromEntries(remote.items.map((i) => [i.id, i])), Number.isNaN(at) ? Date.now() : at);
      }
    } catch {
      // Offline or not set up: the local lists are still a profile.
    }
  }

  return { lists: [...lists.values()], topics: [...topics], titles: [...titles], listIds: [...lists.keys()] };
}
