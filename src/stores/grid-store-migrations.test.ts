/**
 * Tests for the grid-store persistence contract.
 *
 * These matter more than most: the payloads under test are written by builds
 * that no longer exist, and the only place that shape can be exercised is a
 * literal fixture. A fresh profile — which is where all development and all
 * manual testing happen — never runs any of this code.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by changing the future-payload arm in `migrateGridState` from
 * `version > GRID_STORE_PERSIST_VERSION` to `version >= ...`, a coarse mutation
 * nothing normalizes. Reds 1 of these 27 tests — the one asserting a current
 * payload passes through untouched. Restored after.
 */

import { describe, expect, it } from 'vitest';

import {
  GRID_STORE_PERSIST_VERSION,
  migrateGridState,
  type PersistedGridState,
} from './grid-store-migrations';

/** A payload as written before the `context` envelope existed. */
const V0_LEGACY: PersistedGridState = {
  gridItems: [
    { id: 'g0', item: { id: 'i1', title: 'A' }, matched: true },
    { id: 'g1', item: null, matched: false },
  ],
  maxGridSize: 50,
  currentListId: 'list-1',
  listGridCache: {
    'list-1': {
      maxGridSize: 50,
      gridItems: [{ id: 'g0', item: { id: 'i1', title: 'A' }, matched: true }],
    },
  },
  // note: no listGridCacheOrder — it was added after the cache itself
};

const itemsOf = (state: PersistedGridState | null) =>
  (state?.gridItems ?? []) as Array<Record<string, unknown>>;

describe('migrateGridState — version routing', () => {
  it('passes a current-version payload through untouched', () => {
    const payload: PersistedGridState = { gridItems: [], listGridCache: {}, listGridCacheOrder: [] };
    const result = migrateGridState(payload, GRID_STORE_PERSIST_VERSION);
    expect(result.outcome).toBe('current');
    expect(result.state).toBe(payload);
  });

  it('migrates a version-0 payload', () => {
    const result = migrateGridState(V0_LEGACY, 0);
    expect(result.outcome).toBe('migrated');
    expect(result.detail).toContain('0 -> 1');
  });

  it('refuses to migrate a payload from the future, and keeps it untouched', () => {
    // Preserve-and-default. A newer build wrote this; running defaults now
    // costs the user one session, whereas "migrating" it down would destroy
    // fields this code cannot even name.
    const future = { gridItems: [{ id: 'g0', somethingNew: true }] };
    const result = migrateGridState(future, GRID_STORE_PERSIST_VERSION + 1);
    expect(result.outcome).toBe('from-future');
    expect(result.state).toBeNull();
    expect(result.detail).toContain('newer than this build');
    // The input object itself must not have been mutated.
    expect(future).toEqual({ gridItems: [{ id: 'g0', somethingNew: true }] });
  });
});

describe('migrateGridState — v0 to v1', () => {
  it('gives every grid item a context envelope', () => {
    const items = itemsOf(migrateGridState(V0_LEGACY, 0).state);
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.context).toBeDefined();
      expect((item.context as Record<string, unknown>).source).toBe('grid');
    }
  });

  it('carries the pre-v1 top-level `matched` into the envelope', () => {
    const items = itemsOf(migrateGridState(V0_LEGACY, 0).state);
    expect((items[0].context as Record<string, unknown>).matched).toBe(true);
    expect((items[1].context as Record<string, unknown>).matched).toBe(false);
  });

  it('infers `matched` from item presence when the flag is absent', () => {
    // A buggy version-0 release could omit `matched` entirely. Every step must
    // be TOTAL over its input version, including payloads written by bugs.
    const result = migrateGridState(
      { gridItems: [{ id: 'g0', item: { id: 'x' } }, { id: 'g1', item: null }] },
      0,
    );
    const items = itemsOf(result.state);
    expect((items[0].context as Record<string, unknown>).matched).toBe(true);
    expect((items[1].context as Record<string, unknown>).matched).toBe(false);
  });

  it('leaves an item that already has a context alone', () => {
    const existing = { id: 'g0', item: { id: 'x' }, context: { source: 'tier', matched: false } };
    const items = itemsOf(migrateGridState({ gridItems: [existing] }, 0).state);
    expect(items[0].context).toEqual({ source: 'tier', matched: false });
  });

  it('migrates cached grids too, not only the active one', () => {
    // The cache is where a stale shape hides longest: a list the user has not
    // opened since the upgrade.
    const state = migrateGridState(V0_LEGACY, 0).state!;
    const cache = state.listGridCache as Record<string, { gridItems: Array<Record<string, unknown>> }>;
    expect(cache['list-1'].gridItems[0].context).toBeDefined();
  });

  it('reconstructs a missing LRU order from the cache keys', () => {
    const state = migrateGridState(V0_LEGACY, 0).state!;
    expect(state.listGridCacheOrder).toEqual(['list-1']);
  });

  it('preserves an LRU order that is already present', () => {
    const state = migrateGridState(
      { ...V0_LEGACY, listGridCacheOrder: ['list-9', 'list-1'] },
      0,
    ).state!;
    expect(state.listGridCacheOrder).toEqual(['list-9', 'list-1']);
  });

  it('defaults a missing cache to an empty object rather than leaving it undefined', () => {
    const state = migrateGridState({ gridItems: [] }, 0).state!;
    expect(state.listGridCache).toEqual({});
    expect(state.listGridCacheOrder).toEqual([]);
  });

  it('does not mutate its input', () => {
    // The store hands us the payload it may still need if we return null.
    const snapshot = JSON.parse(JSON.stringify(V0_LEGACY));
    migrateGridState(V0_LEGACY, 0);
    expect(V0_LEGACY).toEqual(snapshot);
  });

  it('preserves the fields it does not touch', () => {
    const state = migrateGridState(V0_LEGACY, 0).state!;
    expect(state.maxGridSize).toBe(50);
    expect(state.currentListId).toBe('list-1');
  });

  it('is idempotent — migrating twice equals migrating once', () => {
    const once = migrateGridState(V0_LEGACY, 0).state!;
    const twice = migrateGridState(once, 0).state!;
    expect(twice).toEqual(once);
  });
});

describe('migrateGridState — hostile input falls to defaults, loudly', () => {
  // A corrupt payload that prevented launch would convert a data problem into
  // an unrecoverable product problem: the payload survives the restart the user
  // will try. Every case here must yield null + a diagnostic, never a throw.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', '{"gridItems":[]}'],
    ['a number', 42],
    ['an array', [{ id: 'g0' }]],
    ['a boolean', true],
  ])('rejects %s without throwing', (_label, payload) => {
    const result = migrateGridState(payload, 0);
    expect(result.state).toBeNull();
    expect(result.outcome).toBe('unusable');
    expect(result.detail.length).toBeGreaterThan(0);
  });

  it.each([
    ['a negative version', -1],
    ['a fractional version', 0.5],
    ['NaN', Number.NaN],
  ])('rejects %s', (_label, version) => {
    const result = migrateGridState({ gridItems: [] }, version as number);
    expect(result.outcome).toBe('unusable');
    expect(result.detail).toContain('not a version');
  });

  it('survives gridItems being the wrong type', () => {
    const result = migrateGridState({ gridItems: 'not an array' }, 0);
    expect(result.outcome).toBe('migrated');
    expect(result.state!.gridItems).toBe('not an array');
  });

  it('survives a null entry inside gridItems', () => {
    const result = migrateGridState({ gridItems: [null, { id: 'g1' }] }, 0);
    expect(result.outcome).toBe('migrated');
    expect(itemsOf(result.state)[0]).toBeNull();
  });

  it('survives a cache entry that is not an object', () => {
    const result = migrateGridState({ listGridCache: { 'list-1': 'garbage' } }, 0);
    expect(result.outcome).toBe('migrated');
    expect((result.state!.listGridCache as Record<string, unknown>)['list-1']).toBe('garbage');
  });

  it('always reports an outcome the caller can log', () => {
    for (const payload of [null, {}, V0_LEGACY, 'x']) {
      const result = migrateGridState(payload, 0);
      expect(['current', 'migrated', 'from-future', 'unusable']).toContain(result.outcome);
    }
  });
});
