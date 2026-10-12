/**
 * Tests for the optimistic write path: the per-entity mutex and the
 * compare-and-swap revert.
 *
 * These encode the two operations that break the naive recipe (snapshot, patch,
 * dispatch, restore-on-failure):
 *
 *   two rapid actions on one entity — attempt B snapshots A's UNCONFIRMED paint
 *   a refetch between the patch and the failure — the revert resurrects a value
 *     the authority has just contradicted
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-08-25, both
 * MEASURED and restored:
 *
 *   (1) `decideRevert` made unconditional — `return { action: 'revert', reason:
 *       'still-ours' }` as the function's first statement, which IS the naive
 *       recipe this replaces. Reds 5 of these 28 tests.
 *   (2) the mutex's ownership check on release removed — `release()` deleting
 *       the slot without comparing tokens, so an abandoned holder clears the
 *       slot out from under its successor. Reds 1 test. One is the honest
 *       number and is recorded as such: only the reaper test can distinguish
 *       "released the slot" from "released MY slot", because every other test
 *       releases while it is still the holder, where the two are the same.
 *
 * Two controls because the mutex and the predicate address the two SIDES of one
 * defect and neither substitutes for the other; a mutation in one says nothing
 * about the other.
 */

import { describe, expect, it } from 'vitest';

import { createEntityMutex, makeOperationKey } from './entity-mutex';
import { decideRevert, structurallyEqual, type OptimisticWrite } from './optimistic-revert';

const write = (over: Partial<OptimisticWrite> = {}): OptimisticWrite => ({
  label: 'test',
  previous: { title: 'before' },
  painted: { title: 'after' },
  ...over,
});

describe('makeOperationKey — composite keys guard their separator', () => {
  // The separator is NUL, written as an escape. No identifier scheme this app
  // uses can contain one, so the guard below is belt-and-braces — but it is the
  // guard, not the choice of byte, that is the technique.
  const SEP = '\u0000';

  it('builds a key from a clean family and identity', () => {
    expect(makeOperationKey('list-update', 'abc')).toBe(`list-update${SEP}abc`);
  });

  it('REFUSES a family containing the separator rather than colliding silently', () => {
    expect(() => makeOperationKey(`list${SEP}update`, 'abc')).toThrow(/reserved separator/);
  });

  it('REFUSES an identity containing the separator', () => {
    expect(() => makeOperationKey('list-update', `a${SEP}b`)).toThrow(/reserved separator/);
  });

  it('refuses an empty component — a partial key addresses more than one entry', () => {
    expect(() => makeOperationKey('', 'abc')).toThrow(/empty component/);
    expect(() => makeOperationKey('list-update', '')).toThrow(/empty component/);
  });

  it('would have collided: two distinct pairs a naive join maps to one key', () => {
    // (`a${SEP}b`, 'c') and ('a', `b${SEP}c`) both join to `a${SEP}b${SEP}c`.
    // Both are refused rather than silently corrupting each other's lifecycle.
    expect(() => makeOperationKey(`a${SEP}b`, 'c')).toThrow();
    expect(() => makeOperationKey('a', `b${SEP}c`)).toThrow();
  });

  it('accepts identities containing spaces, which a space separator could not', () => {
    // The first version of this constant used a space and would have refused
    // every human-readable identity. Recorded because the choice is not free.
    expect(makeOperationKey('list-update', 'My Best Albums')).toContain('My Best Albums');
  });
});

describe('entity mutex — serialize per entity', () => {
  it('lets one attempt hold a key at a time', async () => {
    const m = createEntityMutex();
    const a = await m.acquire('k');
    expect(m.heldKeys()).toEqual(['k']);
    a.release();
    expect(m.heldKeys()).toEqual([]);
  });

  it('the SECOND action waits; it is not dropped', async () => {
    const m = createEntityMutex();
    const order: string[] = [];
    const a = await m.acquire('k');
    order.push('a-acquired');

    const bPromise = m.acquire('k').then((lease) => {
      order.push('b-acquired');
      return lease;
    });

    // Give the queued acquire a turn. It must NOT have run yet.
    await Promise.resolve();
    expect(order).toEqual(['a-acquired']);

    order.push('a-released');
    a.release();
    const b = await bPromise;
    expect(order).toEqual(['a-acquired', 'a-released', 'b-acquired']);
    b.release();
  });

  it('does not serialize DIFFERENT entities', async () => {
    const m = createEntityMutex();
    const a = await m.acquire('k1');
    const b = await m.acquire('k2');
    expect(m.heldKeys().sort()).toEqual(['k1', 'k2']);
    a.release();
    b.release();
  });

  it('waiting on a predecessor does not inherit its failure', async () => {
    // The predecessor's work rejects; the successor must still acquire cleanly.
    const m = createEntityMutex();
    const a = await m.acquire('k');
    const work = Promise.reject(new Error('predecessor failed'));
    await work.catch(() => {});
    a.release();
    await expect(m.acquire('k')).resolves.toBeDefined();
  });

  it('release is idempotent', async () => {
    const m = createEntityMutex();
    const a = await m.acquire('k');
    a.release();
    a.release();
    expect(m.heldKeys()).toEqual([]);
  });

  it('a reaped holder reports isHeld() === false and its release is inert', async () => {
    const m = createEntityMutex({ leaseTimeoutMs: 5 });
    const a = await m.acquire('k');
    expect(a.isHeld()).toBe(true);
    await new Promise((r) => setTimeout(r, 25));
    expect(a.isHeld()).toBe(false);

    // A successor takes the reclaimed slot...
    const b = await m.acquire('k');
    expect(b.isHeld()).toBe(true);
    // ...and the abandoned predecessor settling must NOT clear it.
    a.release();
    expect(b.isHeld()).toBe(true);
    expect(m.heldKeys()).toEqual(['k']);
    b.release();
  });

  it('evictAll clears the register, and a settling holder finds itself unowned', async () => {
    const m = createEntityMutex();
    const a = await m.acquire('k');
    m.evictAll();
    expect(a.isHeld()).toBe(false);
    expect(m.heldKeys()).toEqual([]);
  });
});

describe('decideRevert — compare-and-swap, never unconditional', () => {
  it('REVERTS while the painted value still holds', () => {
    const w = write();
    expect(decideRevert(w, w.painted)).toEqual({ action: 'revert', reason: 'still-ours' });
  });

  it('DROPS when a refetch has landed a newer truth', () => {
    const w = write();
    expect(decideRevert(w, { title: 'from the server' })).toEqual({
      action: 'drop',
      reason: 'overwritten',
    });
  });

  it('DROPS when a later mutation has painted over it', () => {
    const w = write();
    expect(decideRevert(w, { title: 'later paint' })).toMatchObject({ action: 'drop' });
  });

  it('DROPS when the entity is gone — absence is also a newer truth', () => {
    const w = write();
    expect(decideRevert(w, undefined)).toEqual({ action: 'drop', reason: 'entity-gone' });
  });

  it('reverts a deliberate paint of undefined rather than calling it gone', () => {
    const w = write({ painted: undefined, previous: { title: 'before' } });
    expect(decideRevert(w, undefined)).toMatchObject({ action: 'revert' });
  });

  it('compares BY VALUE, not by reference', () => {
    const w = write();
    // A refetch rebuilds every object. An identity comparison would call this
    // different and silently skip a legitimate revert.
    expect(decideRevert(w, { title: 'after' })).toMatchObject({ action: 'revert' });
  });

  it('compares only the written fields when the caller narrows them', () => {
    const w = write({
      painted: { title: 'after', viewCount: 1 },
      writtenFields: ['title'],
    });
    // viewCount moved underneath us; the attempt did not write it, so it must
    // not veto the revert.
    expect(decideRevert(w, { title: 'after', viewCount: 99 })).toMatchObject({ action: 'revert' });
    // title moved; that IS ours, so drop.
    expect(decideRevert(w, { title: 'other', viewCount: 1 })).toMatchObject({ action: 'drop' });
  });
});

describe('structurallyEqual', () => {
  it('handles nested objects and arrays', () => {
    expect(structurallyEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(structurallyEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
  });

  it('distinguishes arrays from objects', () => {
    expect(structurallyEqual([], {})).toBe(false);
  });

  it('compares dates by instant', () => {
    expect(structurallyEqual(new Date(0), new Date(0))).toBe(true);
    expect(structurallyEqual(new Date(0), new Date(1))).toBe(false);
  });

  it('treats NaN as equal to NaN, so a painted NaN is not read as overwritten', () => {
    expect(structurallyEqual(NaN, NaN)).toBe(true);
  });

  it('is false for different key counts', () => {
    expect(structurallyEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('is false when null meets an object', () => {
    expect(structurallyEqual(null, {})).toBe(false);
    expect(structurallyEqual({}, null)).toBe(false);
  });
});

describe('the two failure stories, end to end', () => {
  it('two rapid actions: with the mutex, B snapshots the SETTLED value', async () => {
    const m = createEntityMutex();
    const cache = { title: 'settled' };
    const snapshots: string[] = [];

    const attempt = async (paint: string) => {
      const lease = await m.acquire('entity-1');
      try {
        snapshots.push(cache.title); // snapshot
        cache.title = paint; // paint
        await new Promise((r) => setTimeout(r, 1)); // request
      } finally {
        lease.release();
      }
    };

    await Promise.all([attempt('A'), attempt('B')]);
    // Without the mutex the second snapshot would be 'A' — an unconfirmed paint.
    // With it, B snapshots what A actually settled on.
    expect(snapshots).toEqual(['settled', 'A']);
  });

  it('a refetch between patch and failure: the revert is dropped, not applied', () => {
    const w = write({ previous: { title: 'old' }, painted: { title: 'optimistic' } });
    // The list revalidated and committed the authority's truth.
    const afterRefetch = { title: 'authoritative' };
    const verdict = decideRevert(w, afterRefetch);
    expect(verdict).toEqual({ action: 'drop', reason: 'overwritten' });
    // The naive recipe would have written { title: 'old' } here, resurrecting a
    // value the authority had just contradicted.
  });
});
