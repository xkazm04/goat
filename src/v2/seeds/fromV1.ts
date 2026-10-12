import { fallbackArt, type ArtDirection } from '../covers/art';
import { DEFAULT_TIERS, LIST_SIZES, type ListSize } from '../list/types';

/**
 * Turns v1's seeded content (the "Top 10 Games of <year>" lists and the awards
 * event) into goat_v2 rows: the round 8 decision to import the seed lists as
 * starter content. Pure, so the plan can be tested and printed before anything
 * is written. Used by scripts/v2/import-v1-seeds.ts.
 *
 * Ids are kept: a v1 list or item keeps its UUID in goat_v2 (a different
 * schema), which makes re-running the import an idempotent upsert.
 */

export interface V1List {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  type: string | null;
  parent_list_id: string | null;
}

export interface V1Item {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  item_year: number | null;
  image_url: string | null;
  tags: string[] | null;
}

export interface V1ListItem {
  list_id: string;
  item_id: string;
  ranking: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  games: 'Video games',
  music: 'Music',
  sports: 'Sports',
  stories: 'Stories',
};

export function topicOf(category: string, subcategory: string | null): string {
  const base = CATEGORY_LABEL[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
  return subcategory ? `${base} · ${subcategory}` : base;
}

/** The smallest v2 size that holds `count` entries. */
export function sizeFor(count: number): ListSize {
  return LIST_SIZES.find((s) => s >= count) ?? 50;
}

export function slugFor(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'list'}-${id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase()}`;
}

export interface ImportPlan {
  items: {
    id: string;
    topic: string;
    title: string;
    year: number | null;
    creator: null;
    image_url: string | null;
    art: ArtDirection;
    traits: string[];
  }[];
  lists: {
    id: string;
    owner_id: string;
    title: string;
    topic: string;
    kind: 'ranking' | 'awards';
    size: ListSize;
    tiers: typeof DEFAULT_TIERS;
    parent_id: string | null;
    visibility: 'public';
    slug: string;
    published_at: string;
  }[];
  entries: { list_id: string; item_id: string; position: number }[];
  /** Rows left out, with the reason, so a dry run can show them. */
  skipped: string[];
}

export function planImport(
  source: { lists: V1List[]; items: V1Item[]; listItems: V1ListItem[] },
  curatorId: string,
  publishedAt: string,
): ImportPlan {
  const skipped: string[] = [];
  const itemsById = new Map(source.items.map((i) => [i.id, i]));
  const listIds = new Set(source.lists.map((l) => l.id));

  const entriesByList = new Map<string, V1ListItem[]>();
  for (const li of source.listItems) {
    if (!listIds.has(li.list_id)) continue;
    if (!itemsById.has(li.item_id)) {
      skipped.push(`entry ${li.list_id}/${li.item_id}: item not found`);
      continue;
    }
    const bucket = entriesByList.get(li.list_id) ?? [];
    if (bucket.some((e) => e.item_id === li.item_id)) {
      skipped.push(`entry ${li.list_id}/${li.item_id}: duplicate item in list`);
      continue;
    }
    bucket.push(li);
    entriesByList.set(li.list_id, bucket);
  }

  const entries: ImportPlan['entries'] = [];
  const usedItems = new Set<string>();
  const lists: ImportPlan['lists'] = [];

  // Parents first, so a child's parent_id always points at a row already written.
  const ordered = [...source.lists].sort((a, b) => Number(a.parent_list_id !== null) - Number(b.parent_list_id !== null));
  for (const l of ordered) {
    if (l.parent_list_id && !listIds.has(l.parent_list_id)) {
      skipped.push(`list ${l.id} "${l.title}": parent ${l.parent_list_id} is not being imported`);
      continue;
    }
    const isAward = l.type === 'award';
    const ranked = [...(entriesByList.get(l.id) ?? [])].sort((a, b) => a.ranking - b.ranking);
    const size = sizeFor(ranked.length);
    if (ranked.length > size) skipped.push(`list ${l.id} "${l.title}": kept the first ${size} of ${ranked.length} entries`);

    lists.push({
      id: l.id,
      owner_id: curatorId,
      title: l.title.trim().slice(0, 160),
      topic: topicOf(l.category, l.subcategory),
      kind: isAward && !l.parent_list_id ? 'awards' : 'ranking',
      size,
      tiers: DEFAULT_TIERS,
      parent_id: l.parent_list_id,
      visibility: 'public',
      slug: slugFor(l.title, l.id),
      published_at: publishedAt,
    });
    ranked.slice(0, size).forEach((e, position) => {
      entries.push({ list_id: l.id, item_id: e.item_id, position });
      usedItems.add(e.item_id);
    });
  }

  const items: ImportPlan['items'] = [...usedItems].map((id) => {
    const i = itemsById.get(id)!;
    return {
      id: i.id,
      topic: topicOf(i.category, i.subcategory),
      title: i.name.trim().slice(0, 200),
      year: i.item_year,
      creator: null,
      image_url: i.image_url,
      art: fallbackArt(i.name),
      traits: (i.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 3),
    };
  });

  return { items, lists, entries, skipped };
}
