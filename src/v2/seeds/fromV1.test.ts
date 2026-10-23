import { describe, expect, it } from 'vitest';

import { planImport, sizeFor, slugFor, topicOf, type V1Item, type V1List } from './fromV1';
import { fallbackArt } from '../covers/art';

const item = (id: string, name: string, extra: Partial<V1Item> = {}): V1Item => ({
  id,
  name,
  category: 'games',
  subcategory: null,
  item_year: 2015,
  image_url: null,
  tags: null,
  ...extra,
});

const list = (id: string, title: string, extra: Partial<V1List> = {}): V1List => ({
  id,
  title,
  category: 'games',
  subcategory: '2015',
  type: 'top',
  parent_list_id: null,
  ...extra,
});

describe('helpers', () => {
  it('labels topics and picks the smallest size that fits', () => {
    expect(topicOf('games', '2015')).toBe('Video games · 2015');
    expect(topicOf('anime', null)).toBe('Anime');
    expect([0, 10, 11, 25, 26, 80].map(sizeFor)).toEqual([10, 10, 25, 25, 50, 50]);
  });

  it('makes URL-safe slugs that stay unique per id', () => {
    expect(slugFor('Top 10 Games of 2015!', 'a0eebc99-9c0b')).toBe('top-10-games-of-2015-a0eebc');
    expect(slugFor('???', 'b1')).toBe('list-b1');
  });
});

describe('planImport', () => {
  const source = {
    lists: [
      list('L1', 'Top 10 Games of 2015'),
      list('AWD-CHILD', 'Best Narrative', { type: 'award', parent_list_id: 'AWD' }),
      list('AWD', 'Game Awards 2025', { type: 'award', subcategory: null }),
      list('ORPHAN', 'Lost child', { parent_list_id: 'NOT-IMPORTED' }),
    ],
    items: [
      item('w3', 'The Witcher 3', { tags: ['RPG', 'Open World', 'Fantasy', 'Extra'] }),
      item('bb', 'Bloodborne', { image_url: 'https://img/bb.jpg' }),
      item('unused', 'Never Ranked'),
    ],
    listItems: [
      { list_id: 'L1', item_id: 'bb', ranking: 2 },
      { list_id: 'L1', item_id: 'w3', ranking: 1 },
      { list_id: 'L1', item_id: 'w3', ranking: 5 },
      { list_id: 'L1', item_id: 'missing', ranking: 3 },
      { list_id: 'AWD-CHILD', item_id: 'bb', ranking: 1 },
    ],
  };
  const plan = planImport(source, 'curator', '2026-10-11T00:00:00Z');

  it('writes parents before children and skips children whose parent is not imported', () => {
    expect(plan.lists.map((l) => l.id)).toEqual(['L1', 'AWD', 'AWD-CHILD']);
    expect(plan.lists.find((l) => l.id === 'AWD')?.kind).toBe('awards');
    expect(plan.lists.find((l) => l.id === 'AWD-CHILD')).toMatchObject({ kind: 'ranking', parent_id: 'AWD' });
    expect(plan.skipped.some((s) => s.includes('ORPHAN'))).toBe(true);
  });

  it('turns rankings into compact positions and drops bad entries with a reason', () => {
    expect(plan.entries.filter((e) => e.list_id === 'L1')).toEqual([
      { list_id: 'L1', item_id: 'w3', position: 0 },
      { list_id: 'L1', item_id: 'bb', position: 1 },
    ]);
    expect(plan.skipped.some((s) => s.includes('missing'))).toBe(true);
    expect(plan.skipped.some((s) => s.includes('duplicate'))).toBe(true);
  });

  it('imports only items some list uses, with art and up to three traits', () => {
    expect(plan.items.map((i) => i.id).sort()).toEqual(['bb', 'w3']);
    const w3 = plan.items.find((i) => i.id === 'w3')!;
    expect(w3.traits).toEqual(['rpg', 'open world', 'fantasy']);
    expect(w3.art).toEqual(fallbackArt('The Witcher 3'));
    expect(plan.items.find((i) => i.id === 'bb')?.image_url).toBe('https://img/bb.jpg');
  });

  it('publishes every list as a public starter owned by the curator', () => {
    for (const l of plan.lists) {
      expect(l).toMatchObject({ owner_id: 'curator', visibility: 'public', published_at: '2026-10-11T00:00:00Z' });
    }
  });
});
