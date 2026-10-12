import { z } from 'zod';

import { artOrFallback } from '@/v2/covers/art';

import { isConsistent } from './reducer';
import { DEFAULT_TIERS, LIST_SIZES, STAGE_PRESETS, type ListDoc, type ListItem, type ListSize } from './types';

import type { EditorStore } from './store';
import type { getBrowserClient } from '@/v2/db/browser';

type Client = NonNullable<ReturnType<typeof getBrowserClient>>;

/**
 * goat_v2 rows <-> the editor's ListDoc. The client has no generated types
 * yet, so every row coming back is parsed here rather than trusted.
 */

const tierSchema = z.object({ name: z.string().min(1), until: z.number().int().positive() });

const listRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  title: z.string(),
  topic: z.string(),
  size: z.number().refine((n): n is ListSize => (LIST_SIZES as readonly number[]).includes(n)),
  tiers: z.array(tierSchema).catch(DEFAULT_TIERS),
  stage_preset: z.enum(STAGE_PRESETS).catch('podium'),
  visibility: z.enum(['private', 'unlisted', 'public']),
  published_at: z.string().nullable(),
});

const itemRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number().nullable(),
  creator: z.string().nullable(),
  image_url: z.string().nullable(),
  art: z.unknown(),
  traits: z.array(z.string()).catch([]),
});

const entryRowSchema = z.object({
  item_id: z.string(),
  position: z.number().int().nullable(),
  canvas_x: z.number().nullable().catch(null),
  note: z.string().nullable(),
  items: itemRowSchema,
});

type ListRow = z.infer<typeof listRowSchema>;
type EntryRow = z.infer<typeof entryRowSchema>;

export interface LoadedList {
  doc: ListDoc;
  items: ListItem[];
  ownerId: string;
  published: boolean;
}

function toItem(row: z.infer<typeof itemRowSchema>): ListItem {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    creator: row.creator,
    imageUrl: row.image_url,
    art: artOrFallback(row.art, row.title),
    traits: row.traits,
  };
}

/** Rows to a document. Ranked entries in position order; the pool alphabetically, since it has no stored order. */
export function fromRows(list: ListRow, entries: EntryRow[]): LoadedList {
  const ranked = entries.filter((e) => e.position !== null).sort((a, b) => a.position! - b.position!);
  const pool = entries.filter((e) => e.position === null).sort((a, b) => a.items.title.localeCompare(b.items.title));
  const notes: Record<string, string> = {};
  const canvasX: Record<string, number> = {};
  for (const e of entries) {
    if (e.note) notes[e.item_id] = e.note;
    if (e.canvas_x !== null) canvasX[e.item_id] = e.canvas_x;
  }

  return {
    doc: {
      id: list.id,
      title: list.title,
      topic: list.topic,
      size: list.size,
      order: ranked.map((e) => e.item_id).slice(0, list.size),
      pool: [...ranked.slice(list.size), ...pool].map((e) => e.item_id),
      tiers: list.tiers,
      notes,
      canvasX,
      stagePreset: list.stage_preset,
    },
    items: entries.map((e) => toItem(e.items)),
    ownerId: list.owner_id,
    published: list.visibility !== 'private' && list.published_at !== null,
  };
}

/** A document to rows. Pool entries carry a null position. */
export function toRows(doc: ListDoc, ownerId: string) {
  return {
    list: {
      id: doc.id,
      owner_id: ownerId,
      title: doc.title,
      topic: doc.topic,
      size: doc.size,
      tiers: doc.tiers,
      stage_preset: doc.stagePreset,
    },
    entries: [...doc.order, ...doc.pool].map((id) => ({
      list_id: doc.id,
      item_id: id,
      position: doc.order.includes(id) ? doc.order.indexOf(id) : null,
      canvas_x: doc.canvasX[id] ?? null,
      note: doc.notes[id] ?? null,
    })),
  };
}

export async function loadList(client: Client, listId: string): Promise<LoadedList | null> {
  const listRes = await client.from('lists').select('id, owner_id, title, topic, size, tiers, stage_preset, visibility, published_at').eq('id', listId).maybeSingle();
  if (listRes.error) throw new Error(listRes.error.message);
  if (!listRes.data) return null;

  const entriesRes = await client
    .from('list_entries')
    .select('item_id, position, canvas_x, note, items(id, title, year, creator, image_url, art, traits)')
    .eq('list_id', listId);
  if (entriesRes.error) throw new Error(entriesRes.error.message);

  const loaded = fromRows(listRowSchema.parse(listRes.data), z.array(entryRowSchema).parse(entriesRes.data));
  return isConsistent(loaded.doc) ? loaded : null;
}

/**
 * Write a document. The position constraint is deferred, so one upsert can
 * reorder freely. Items never leave a document, so no rows are deleted.
 */
async function pushList(client: Client, doc: ListDoc, ownerId: string): Promise<void> {
  const { list, entries } = toRows(doc, ownerId);
  const a = await client.from('lists').upsert(list);
  if (a.error) throw new Error(a.error.message);
  const b = await client.from('list_entries').upsert(entries, { onConflict: 'list_id,item_id' });
  if (b.error) throw new Error(b.error.message);
}

/** Copy a list (a starter list, someone's published list) into a new private list owned by `ownerId`. */
export async function forkList(client: Client, source: ListDoc, ownerId: string): Promise<string> {
  const id = crypto.randomUUID();
  await pushList(client, { ...source, id }, ownerId);
  return id;
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Push to Supabase whenever the document changes, debounced. Returns a stop function. */
export function syncToSupabase(
  store: EditorStore,
  client: Client,
  ownerId: string,
  onStatus: (status: SyncStatus) => void,
  delayMs = 1200,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const push = () => {
    timer = null;
    onStatus('saving');
    pushList(client, store.getState().history.present, ownerId).then(
      () => onStatus('saved'),
      () => onStatus('error'),
    );
  };
  const unsubscribe = store.subscribe((state, prev) => {
    if (state.history.present === prev.history.present) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, delayMs);
  });
  return () => {
    unsubscribe();
    if (timer) {
      clearTimeout(timer);
      push();
    }
  };
}
