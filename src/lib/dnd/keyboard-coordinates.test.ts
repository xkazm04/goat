/**
 * Tests for the keyboard-drag arrow stepping.
 *
 * This is the whole reason the selection logic was written pure: a keyboard
 * path is the one drag path that CAN be tested without a browser, and the
 * repo's e2e suite cannot run without a live server and a seeded database.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by setting CROSS_AXIS_PENALTY to 0 in keyboard-coordinates.ts —
 * a coarse mutation nothing normalizes, which makes off-row candidates
 * competitive and breaks column/row-wise stepping. Reds 2 of these 25 tests
 * ("prefers the slot directly below", "handles a ragged layout"). Restored
 * after.
 */

import { describe, expect, it } from 'vitest';

import {
  centerOf,
  coordinatesForTarget,
  directionFromKey,
  pickDirectionalTarget,
  type DropCandidate,
  type RectLike,
} from './keyboard-coordinates';

/** A 5-wide grid of 100x100 slots at 10px gaps, ids 'slot-0'..'slot-9'. */
const GRID: DropCandidate<string>[] = Array.from({ length: 10 }, (_, i) => ({
  id: `slot-${i}`,
  rect: {
    left: (i % 5) * 110,
    top: Math.floor(i / 5) * 110,
    width: 100,
    height: 100,
  },
}));

const rectOf = (id: string): RectLike => GRID.find((c) => c.id === id)!.rect;

describe('directionFromKey', () => {
  it.each([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
  ])('%s -> %s', (key, expected) => {
    expect(directionFromKey(key)).toBe(expected);
  });

  it.each(['Enter', ' ', 'Escape', 'Tab', 'a', 'ArrowUpLeft'])(
    '%s is not an arrow direction',
    (key) => {
      expect(directionFromKey(key)).toBeNull();
    },
  );
});

describe('centerOf', () => {
  it('is the midpoint of the rect', () => {
    expect(centerOf({ left: 10, top: 20, width: 100, height: 50 })).toEqual({ x: 60, y: 45 });
  });

  it('handles a zero-size rect without producing NaN', () => {
    expect(centerOf({ left: 5, top: 5, width: 0, height: 0 })).toEqual({ x: 5, y: 5 });
  });
});

describe('pickDirectionalTarget', () => {
  it('steps along the row under Right', () => {
    expect(pickDirectionalTarget('right', rectOf('slot-0'), GRID)?.id).toBe('slot-1');
    expect(pickDirectionalTarget('right', rectOf('slot-2'), GRID)?.id).toBe('slot-3');
  });

  it('steps back along the row under Left', () => {
    expect(pickDirectionalTarget('left', rectOf('slot-3'), GRID)?.id).toBe('slot-2');
  });

  it('prefers the slot directly below under Down, not the nearest by raw distance', () => {
    // slot-6 (row 2, col 1) is directly below slot-1. slot-5 and slot-7 are
    // closer in raw euclidean terms from some origins; the cross-axis penalty
    // is what keeps the column.
    expect(pickDirectionalTarget('down', rectOf('slot-1'), GRID)?.id).toBe('slot-6');
    expect(pickDirectionalTarget('down', rectOf('slot-4'), GRID)?.id).toBe('slot-9');
  });

  it('steps up into the row above', () => {
    expect(pickDirectionalTarget('up', rectOf('slot-7'), GRID)?.id).toBe('slot-2');
  });

  it('returns null at an edge instead of wrapping', () => {
    // Wrapping is disorienting under a screen reader — the item teleports and
    // the only signal is a position announcement after the fact.
    expect(pickDirectionalTarget('left', rectOf('slot-0'), GRID)).toBeNull();
    expect(pickDirectionalTarget('up', rectOf('slot-2'), GRID)).toBeNull();
    expect(pickDirectionalTarget('right', rectOf('slot-4'), GRID)).toBeNull();
    expect(pickDirectionalTarget('down', rectOf('slot-8'), GRID)).toBeNull();
  });

  it('never returns the rect it started from', () => {
    for (const candidate of GRID) {
      for (const dir of ['up', 'down', 'left', 'right'] as const) {
        expect(pickDirectionalTarget(dir, candidate.rect, GRID)?.id).not.toBe(candidate.id);
      }
    }
  });

  it('returns null when there are no candidates at all', () => {
    expect(pickDirectionalTarget('right', rectOf('slot-0'), [])).toBeNull();
  });

  it('is deterministic — identical candidates resolve the same way every call', () => {
    // Two candidates at the exact same rect: the tiebreak must be the id, not
    // the array order, or the same press moves somewhere different each time.
    const tied: DropCandidate<string>[] = [
      { id: 'zzz', rect: { left: 200, top: 0, width: 100, height: 100 } },
      { id: 'aaa', rect: { left: 200, top: 0, width: 100, height: 100 } },
    ];
    const first = pickDirectionalTarget('right', rectOf('slot-0'), tied)?.id;
    const reversed = pickDirectionalTarget('right', rectOf('slot-0'), [...tied].reverse())?.id;
    expect(first).toBe('aaa');
    expect(reversed).toBe('aaa');
  });

  it('walks the whole row one press at a time', () => {
    // The property that matters most: N presses move N slots, so the
    // announcement "position 4 of 50" stays true.
    let at = 'slot-0';
    const visited = [at];
    for (let i = 0; i < 4; i++) {
      const next = pickDirectionalTarget('right', rectOf(at), GRID);
      expect(next).not.toBeNull();
      at = next!.id;
      visited.push(at);
    }
    expect(visited).toEqual(['slot-0', 'slot-1', 'slot-2', 'slot-3', 'slot-4']);
  });

  it('handles a ragged layout — differently sized targets still step forward', () => {
    // `a` is a tall narrow rail; `b` is a short wide row whose centre lines up
    // with it, and `c` sits well below `b`. Sizes differ by 4x on both axes.
    const ragged: DropCandidate<string>[] = [
      { id: 'a', rect: { left: 0, top: 0, width: 50, height: 100 } },
      { id: 'b', rect: { left: 60, top: 30, width: 200, height: 40 } },
      { id: 'c', rect: { left: 60, top: 200, width: 200, height: 40 } },
    ];
    expect(pickDirectionalTarget('right', ragged[0].rect, ragged)?.id).toBe('b');
    expect(pickDirectionalTarget('down', ragged[1].rect, ragged)?.id).toBe('c');
  });
});

describe('coordinatesForTarget', () => {
  it('adds the rect delta to the current translate, not replacing it', () => {
    // dnd-kit works in translate space: the getter is told where the drag IS
    // and must say where it should GO. Replacing rather than offsetting makes
    // the item jump to the page origin on the first arrow press.
    const current = { x: 30, y: -12 };
    const collisionRect = { left: 100, top: 200, width: 100, height: 100 };
    const target = { left: 210, top: 200, width: 100, height: 100 };
    expect(coordinatesForTarget(current, collisionRect, target)).toEqual({ x: 140, y: -12 });
  });

  it('is a no-op when the target is already under the drag', () => {
    const current = { x: 7, y: 9 };
    const rect = { left: 1, top: 2, width: 3, height: 4 };
    expect(coordinatesForTarget(current, rect, rect)).toEqual(current);
  });

  it('round-trips: stepping right then left returns to the start', () => {
    const start = { x: 0, y: 0 };
    const a = rectOf('slot-0');
    const b = rectOf('slot-1');
    const forward = coordinatesForTarget(start, a, b);
    const back = coordinatesForTarget(forward, b, a);
    expect(back).toEqual(start);
  });
});
