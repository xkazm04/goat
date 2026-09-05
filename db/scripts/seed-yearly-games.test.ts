import { describe, expect, it } from 'vitest';

import { GAMES_BY_YEAR, ensureYearList, upsertGameItem } from './seed-yearly-games';

/**
 * seed-yearly-games.js claims to be re-runnable. Before 2026-09-05 it was not:
 *
 *   - items: `ON CONFLICT (name, category, subcategory)` with subcategory NULL.
 *     Postgres treats NULLs as distinct under a plain UNIQUE constraint, so the
 *     clause never fires and every re-run inserts another ~630 rows.
 *   - lists: `ON CONFLICT DO NOTHING` with no arbiter and no unique constraint
 *     on lists.title — never conflicts, so every re-run creates 21 more lists
 *     and the "already exists" branch below it was unreachable.
 *
 * No Postgres is reachable from the unit runner, so the figure is taken with a
 * fake client that answers SELECTs from a fixture and records every write:
 * given the row already exists, the write count must be 0.
 *
 * Negative control (recorded 2026-09-05, against the pre-fix code shape): the
 * old loop issued INSERT ... ON CONFLICT unconditionally — 1 write per item and
 * per list regardless of what existed — so "existing row → 0 writes" was red
 * for both helpers.
 *
 * Importing this module must not run the seed: the `require.main === module`
 * guard is what this file's first line exercises — if it ever regressed, the
 * import would call resolveConnectionString(process.env) and exit the runner.
 */

type Row = Record<string, unknown>;

function fakeClient(select: (sql: string, params: unknown[]) => Row[]) {
  const writes: { sql: string; params: unknown[] }[] = [];
  return {
    writes,
    async query(sql: string, params: unknown[] = []) {
      if (/^\s*SELECT/i.test(sql)) return { rows: select(sql, params) };
      writes.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: [{ id: 'new-id' }] };
    },
  };
}

describe('upsertGameItem', () => {
  it('an existing item (same name, games, NULL subcategory) is found, not inserted', async () => {
    const client = fakeClient(() => [{ id: 'existing-id', item_year: 2015 }]);
    const r = await upsertGameItem(client, 'Bloodborne', 2015);
    expect(r).toEqual({ id: 'existing-id', created: false });
    expect(client.writes).toEqual([]);
  });

  it('a missing item is inserted exactly once, with the NULL subcategory the lookup used', async () => {
    const client = fakeClient(() => []);
    const r = await upsertGameItem(client, 'Bloodborne', 2015);
    expect(r).toEqual({ id: 'new-id', created: true });
    expect(client.writes).toHaveLength(1);
    expect(client.writes[0].sql).toMatch(/^INSERT INTO items/);
    expect(client.writes[0].sql).not.toMatch(/ON CONFLICT/);
    expect(client.writes[0].params).toEqual(['Bloodborne', 2015]);
  });

  it('an existing item with no year gets the year; one with a year keeps it', async () => {
    const noYear = fakeClient(() => [{ id: 'x', item_year: null }]);
    await upsertGameItem(noYear, 'Prey', 2006);
    expect(noYear.writes.map((w) => w.sql)).toEqual(['UPDATE items SET item_year = $2 WHERE id = $1']);
    expect(noYear.writes[0].params).toEqual(['x', 2006]);

    const hasYear = fakeClient(() => [{ id: 'x', item_year: 2006 }]);
    await upsertGameItem(hasYear, 'Prey', 2017);
    expect(hasYear.writes).toEqual([]);
  });

  it('the lookup pins the natural key the unique constraint cannot enforce for NULL', async () => {
    const seen: string[] = [];
    const client = fakeClient((sql) => {
      seen.push(sql.replace(/\s+/g, ' '));
      return [{ id: 'x', item_year: 1 }];
    });
    await upsertGameItem(client, 'Hades', 2020);
    expect(seen[0]).toMatch(/WHERE name = \$1 AND category = 'games' AND subcategory IS NULL/);
  });
});

describe('ensureYearList', () => {
  const list = { title: 'Top 10 Games of 2020', ownerId: 'owner', year: 2020, description: 'd' };

  it('an existing list is found, not inserted', async () => {
    const client = fakeClient(() => [{ id: 'list-1' }]);
    expect(await ensureYearList(client, list)).toEqual({ id: 'list-1', created: false });
    expect(client.writes).toEqual([]);
  });

  it('a missing list is inserted once, without a conflict clause that could never fire', async () => {
    const client = fakeClient(() => []);
    expect(await ensureYearList(client, list)).toEqual({ id: 'new-id', created: true });
    expect(client.writes).toHaveLength(1);
    expect(client.writes[0].sql).toMatch(/^INSERT INTO lists/);
    expect(client.writes[0].sql).not.toMatch(/ON CONFLICT/);
    expect(client.writes[0].params).toEqual(['Top 10 Games of 2020', 'owner', '2020', 'd']);
  });
});

describe('GAMES_BY_YEAR corpus', () => {
  it('covers 2005-2025 with 30 titles per year', () => {
    const years = Object.keys(GAMES_BY_YEAR).map(Number);
    expect(years).toEqual(Array.from({ length: 21 }, (_, i) => 2005 + i));
    const byYear = GAMES_BY_YEAR as Record<number, string[]>;
    for (const y of years) expect(byYear[y], String(y)).toHaveLength(30);
  });
});
