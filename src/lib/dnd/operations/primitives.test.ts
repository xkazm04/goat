/**
 * Tests for identity-anchored grid primitives.
 *
 * Registry: drag-drop/payload-and-identity.
 *
 * A drop is a statement about IDENTITIES, never about indices. The moment a drag
 * begins the arrangement starts going stale, and a primitive encoded purely
 * positionally is evaluated against an arrangement that may no longer exist —
 * landing on whatever occupies those slots NOW. The user watched item X being
 * placed after item Y; the system moved slot 3 after slot 7.
 *
 * These tests pin the drift check that makes the difference visible.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-08-25 and
 * restored: `checkExpectation`'s `if (actual === expected) return null;` changed
 * to an unconditional `return null;` — i.e. the expectation recorded but never
 * compared, which is the state this file found the code in. Reds 6 of these 14 tests
 * (measured).
 */

import { describe, expect, it } from 'vitest';

import { validatePrimitive, type GridState } from './primitives';

import type { GridItemType } from '@/types/match';

function slot(position: number, itemId: string | null): GridItemType {
  return {
    // The SLOT ADDRESS. Deliberately built the way the store builds it, so a
    // test that confused it with an item id would pass for the wrong reason.
    id: `grid-${position}`,
    position,
    item: itemId ? ({ id: itemId, title: itemId } as GridItemType['item']) : null,
    context: { matched: itemId !== null },
  } as GridItemType;
}

function grid(...ids: (string | null)[]): GridState {
  return {
    gridItems: ids.map((id, i) => slot(i, id)),
    maxGridSize: ids.length,
  };
}

describe('remove — the plan states which item it displaces', () => {
  const state = grid('a', 'b', null);

  it('accepts a remove whose expectation still holds', () => {
    expect(
      validatePrimitive({ kind: 'remove', position: 0, expectItemId: 'a' }, state).isValid,
    ).toBe(true);
  });

  it('REFUSES a remove whose slot now holds a different item', () => {
    const r = validatePrimitive({ kind: 'remove', position: 0, expectItemId: 'z' }, state);
    expect(r.isValid).toBe(false);
    expect(r.errorMessage).toMatch(/no longer the item this drop was about/);
  });

  it('names both sides in the message, so the diagnosis is in the log', () => {
    const r = validatePrimitive({ kind: 'remove', position: 1, expectItemId: 'a' }, state);
    expect(r.debugInfo).toMatchObject({ position: 1, expected: 'a', actual: 'b' });
  });

  it('still refuses an empty slot before it ever looks at the expectation', () => {
    const r = validatePrimitive({ kind: 'remove', position: 2, expectItemId: 'a' }, state);
    expect(r.errorCode).toBe('SOURCE_NOT_FOUND');
  });

  it('skips the check when no expectation was stated', () => {
    expect(validatePrimitive({ kind: 'remove', position: 0 }, state).isValid).toBe(true);
  });
});

describe('swap — both ends are identities', () => {
  const state = grid('a', 'b', null);

  it('accepts a swap whose two expectations hold', () => {
    const r = validatePrimitive(
      { kind: 'swap', posA: 0, posB: 1, expectItemA: 'a', expectItemB: 'b' },
      state,
    );
    expect(r.isValid).toBe(true);
  });

  it('REFUSES when the SOURCE occupant changed under the drag', () => {
    const r = validatePrimitive(
      { kind: 'swap', posA: 0, posB: 1, expectItemA: 'z', expectItemB: 'b' },
      state,
    );
    expect(r.isValid).toBe(false);
    expect(r.errorMessage).toMatch(/Source occupant/);
  });

  it('REFUSES when the TARGET occupant changed under the drag', () => {
    const r = validatePrimitive(
      { kind: 'swap', posA: 0, posB: 1, expectItemA: 'a', expectItemB: 'z' },
      state,
    );
    expect(r.isValid).toBe(false);
    expect(r.errorMessage).toMatch(/Target occupant/);
  });

  it('accepts a move onto a slot the plan asserted was EMPTY', () => {
    const r = validatePrimitive(
      { kind: 'swap', posA: 0, posB: 2, expectItemA: 'a', expectItemB: null },
      state,
    );
    expect(r.isValid).toBe(true);
  });

  it('REFUSES a move onto a slot that was empty at plan time and is not now', () => {
    // Someone else's placement landed in slot 1 while the pointer was down.
    const r = validatePrimitive(
      { kind: 'swap', posA: 0, posB: 1, expectItemA: 'a', expectItemB: null },
      state,
    );
    expect(r.isValid).toBe(false);
    expect(r.debugInfo).toMatchObject({ expected: null, actual: 'b' });
  });

  it('bounds and same-position checks still come first', () => {
    expect(
      validatePrimitive({ kind: 'swap', posA: 0, posB: 0, expectItemA: 'a' }, state).errorCode,
    ).toBe('SAME_POSITION');
    expect(
      validatePrimitive({ kind: 'swap', posA: 0, posB: 9, expectItemA: 'a' }, state).errorCode,
    ).toBe('TARGET_OUT_OF_BOUNDS');
  });

  it('skips both checks when neither expectation was stated', () => {
    expect(validatePrimitive({ kind: 'swap', posA: 0, posB: 1 }, state).isValid).toBe(true);
  });
});

describe('the slot address is not an item identity', () => {
  it('a slot id looks like an id and identifies only the position', () => {
    const s = slot(7, 'the-real-item');
    expect(s.id).toBe('grid-7');
    expect(s.item?.id).toBe('the-real-item');
  });

  it('an expectation matching the SLOT ADDRESS is refused, not accepted', () => {
    // The failure this guards: a caller writes `expectItemId: slot.id` meaning
    // "this item", and gets "grid-0". If the check compared against slot.id the
    // mistake would pass silently and identity would be positional again.
    const r = validatePrimitive(
      { kind: 'remove', position: 0, expectItemId: 'grid-0' },
      grid('a'),
    );
    expect(r.isValid).toBe(false);
  });
});
