import { describe, expect, it } from 'vitest';

import { FIXTURE_USER, LISTS, NS, id, itemsFor } from './seed-e2e';

/**
 * The fixtures seed-e2e.ts writes are the browser suite's whole population,
 * and their ids are hand-shaped UUIDs. The shape defect this pins is real: the
 * first version of `id()` padded the last group to 6 characters and every
 * insert failed with "invalid input syntax for type uuid" — found against a
 * live database, the most expensive place to find it. This test finds it in
 * 10 ms with no database.
 *
 * Negative control (recorded 2026-09-05): with padStart(10) changed to
 * padStart(6), the shape assertion is red for every id; with two lists given
 * the same `id('bb', 1)`, the uniqueness assertion is red.
 *
 * Importing seed-e2e.ts executes nothing: main() runs only when the file is
 * argv[1] (the `npm run seed:e2e` path).
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Every id the seeder writes, in the order it writes them. */
function allFixtureIds(): string[] {
  const ids = [FIXTURE_USER];
  for (const [index, list] of LISTS.entries()) {
    ids.push(list.id);
    const rows = itemsFor(index, list.itemCount);
    ids.push(...rows.map((r) => r.id));
    ids.push(...rows.slice(0, list.size).map((_, i) => id(`d${index}`, i + 1)));
  }
  return ids;
}

describe('seed-e2e fixture ids', () => {
  it('every id is a well-formed v4-shaped UUID inside the e2e namespace', () => {
    const ids = allFixtureIds();
    expect(ids.length).toBeGreaterThan(20);
    const malformed = ids.filter((x) => !UUID_V4.test(x));
    expect(malformed).toEqual([]);
    const outsideNamespace = ids.filter((x) => !x.startsWith(`${NS}-`));
    expect(outsideNamespace).toEqual([]);
  });

  it('no two fixtures share an id (a collision would make an upsert overwrite a sibling)', () => {
    const ids = allFixtureIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a kind wider than 2 characters or a counter wider than 10 digits cannot produce a valid id', () => {
    // The last group must be exactly 12 hex chars; these are the two ways to break it.
    expect(UUID_V4.test(id('abc', 1))).toBe(false);
    expect(UUID_V4.test(id('aa', 10_000_000_000))).toBe(false);
    expect(UUID_V4.test(id('zz', 1))).toBe(false); // z is not hex
  });
});

describe('seed-e2e fixture lists', () => {
  it('each list has more items than ranked slots, so a journey can still place something', () => {
    for (const list of LISTS) expect(list.itemCount).toBeGreaterThan(list.size);
  });

  it('the two lists differ in category and size, so a suite can tell them apart', () => {
    expect(LISTS.length).toBe(2);
    expect(LISTS[0].category).not.toBe(LISTS[1].category);
    expect(LISTS[0].size).not.toBe(LISTS[1].size);
  });

  it('item rows are obviously synthetic and namespaced by subcategory', () => {
    const rows = itemsFor(0, LISTS[0].itemCount);
    expect(rows.every((r) => r.name.startsWith('E2E ') && r.subcategory === 'E2E')).toBe(true);
  });
});
