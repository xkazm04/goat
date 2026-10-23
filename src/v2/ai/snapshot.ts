import type { ItemId, ListDoc, ListItem } from '@/v2/list/types';

/** What the critic and the gap spotter see of a list: titles, ranks and notes, no art. */
export interface ListSnapshot {
  title: string;
  topic: string;
  size: number;
  ranked: { id: ItemId; title: string; year: number | null; creator: string | null; note: string }[];
  pool: { id: ItemId; title: string }[];
}

/** The pool is capped so a 200-item pool cannot swell every critic request. */
const POOL_CAP = 60;

export function snapshotOf(doc: ListDoc, items: Record<ItemId, ListItem>): ListSnapshot {
  const known = (id: ItemId) => items[id] !== undefined;
  return {
    title: doc.title,
    topic: doc.topic,
    size: doc.size,
    ranked: doc.order.filter(known).map((id) => ({
      id,
      title: items[id].title,
      year: items[id].year,
      creator: items[id].creator,
      note: doc.notes[id] ?? '',
    })),
    pool: doc.pool
      .filter(known)
      .slice(0, POOL_CAP)
      .map((id) => ({ id, title: items[id].title })),
  };
}

function label(i: { title: string; year: number | null; creator: string | null }): string {
  const by = [i.year, i.creator].filter((v) => v !== null && v !== '').join(', ');
  return by ? `${i.title} (${by})` : i.title;
}

/** Deterministic text for a snapshot. Same list in, same bytes out, so it caches. */
export function renderSnapshot(s: ListSnapshot): string {
  const lines = [`List: ${s.title}`, `Topic: ${s.topic}`, `Size: top ${s.size}`, '', 'Ranking:'];
  if (s.ranked.length === 0) lines.push('(nothing ranked yet)');
  s.ranked.forEach((r, i) => lines.push(`#${i + 1} ${label(r)}${r.note ? ` | note: ${r.note}` : ''}`));
  lines.push('', 'Unranked pool:');
  lines.push(s.pool.length === 0 ? '(empty)' : s.pool.map((p) => p.title).join('; '));
  return lines.join('\n');
}

/**
 * What changed between two snapshots, as plain lines for the critic. Returns
 * null when nothing the critic cares about changed.
 */
export function describeChange(prev: ListSnapshot, next: ListSnapshot): string | null {
  const lines: string[] = [];
  const rank = (s: ListSnapshot) => new Map(s.ranked.map((r, i) => [r.id, i + 1]));
  const before = rank(prev);
  const after = rank(next);
  const title = new Map([...prev.ranked, ...next.ranked, ...prev.pool, ...next.pool].map((r) => [r.id, r.title]));

  for (const [id, now] of after) {
    const was = before.get(id);
    if (was === undefined) lines.push(`${title.get(id)} was ranked at #${now}.`);
    else if (was !== now) lines.push(`${title.get(id)} moved from #${was} to #${now}.`);
  }
  for (const [id, was] of before) {
    if (!after.has(id)) lines.push(`${title.get(id)} was removed from the ranking (was #${was}).`);
  }
  const prevNotes = new Map(prev.ranked.map((r) => [r.id, r.note]));
  for (const r of next.ranked) {
    if (before.has(r.id) && (prevNotes.get(r.id) ?? '') !== r.note && r.note) {
      lines.push(`Note on ${r.title} is now: ${r.note}`);
    }
  }
  const known = new Set([...prev.pool.map((p) => p.id), ...prev.ranked.map((r) => r.id)]);
  const added = next.pool.filter((p) => !known.has(p.id));
  if (added.length > 0) lines.push(`Added to the pool: ${added.map((a) => a.title).join('; ')}.`);
  if (prev.title !== next.title) lines.push(`The list was renamed to "${next.title}".`);
  if (prev.size !== next.size) lines.push(`The list is now a top ${next.size}.`);

  return lines.length > 0 ? lines.join('\n') : null;
}
