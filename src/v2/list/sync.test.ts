import { describe, expect, it } from 'vitest';

import { fallbackArt } from '@/v2/covers/art';

import { DEMO_ITEMS, demoDoc } from './fixtures';
import { fromRows, toRows } from './sync';

const byId = Object.fromEntries(DEMO_ITEMS.map((i) => [i.id, i]));

function itemRow(id: string) {
  const i = byId[id];
  return { id, title: i.title, year: i.year, creator: i.creator, image_url: null, art: i.art, traits: i.traits };
}

describe('toRows / fromRows', () => {
  it('round-trips a document through goat_v2 rows', () => {
    const doc = { ...demoDoc(), canvasX: { er: 0.4 }, stagePreset: 'rushmore' as const };
    const { list, entries } = toRows(doc, 'owner-1');
    expect(list).toMatchObject({ id: 'demo', owner_id: 'owner-1', size: 25 });
    expect(entries.filter((e) => e.position !== null)).toHaveLength(doc.order.length);

    const back = fromRows(
      { ...list, visibility: 'private', published_at: null },
      entries.map((e) => ({ item_id: e.item_id, position: e.position, canvas_x: e.canvas_x, note: e.note, items: itemRow(e.item_id) })),
    );
    expect(back.doc.order).toEqual(doc.order);
    expect([...back.doc.pool].sort()).toEqual([...doc.pool].sort());
    expect(back.doc.notes).toEqual(doc.notes);
    expect(back.doc.canvasX).toEqual({ er: 0.4 });
    expect(back.doc.stagePreset).toBe('rushmore');
    expect(back.ownerId).toBe('owner-1');
    expect(back.published).toBe(false);
  });

  it('orders ranked entries by position even when rows arrive shuffled', () => {
    const list = { ...toRows(demoDoc(), 'o').list, visibility: 'public' as const, published_at: '2026-10-01' };
    const entries = [
      { item_id: 'w3', position: 1, canvas_x: 0.25, note: null, items: itemRow('w3') },
      { item_id: 'er', position: 0, canvas_x: null, note: null, items: itemRow('er') },
      { item_id: 'hk', position: null, canvas_x: null, note: null, items: itemRow('hk') },
    ];
    const back = fromRows(list, entries);
    expect(back.doc.order).toEqual(['er', 'w3']);
    expect(back.doc.pool).toEqual(['hk']);
    expect(back.doc.canvasX).toEqual({ w3: 0.25 });
    expect(back.published).toBe(true);
  });

  it('falls back to a generated cover when stored art is missing', () => {
    const list = { ...toRows(demoDoc(), 'o').list, visibility: 'private' as const, published_at: null };
    const row = { ...itemRow('er'), art: null };
    const back = fromRows(list, [{ item_id: 'er', position: 0, canvas_x: null, note: null, items: row }]);
    expect(back.items[0].art).toEqual(fallbackArt('Elden Ring'));
  });
});
