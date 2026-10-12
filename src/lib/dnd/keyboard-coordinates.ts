/**
 * Arrow-key stepping for keyboard drags.
 *
 * WHY THIS EXISTS
 * ---------------
 * The grid's screen-reader instructions have always announced "press Space or
 * Enter to pick up, use arrow keys to move" — and until 2026-08-24 there was no
 * KeyboardSensor anywhere in this repo, so none of that could be done. A grip
 * that announces a control which does not exist is a *false affordance*: worse
 * than an unlabelled decoration, because it spends the user's effort proving
 * the promise was a lie (registry drag-drop/keyboard-alternatives).
 *
 * dnd-kit's stock keyboard coordinate getter translates the drag by a fixed
 * 25px per keypress, which on a 50-slot grid means ~4 presses per slot and no
 * relationship between "right arrow" and "next slot". This module instead steps
 * the drag from one *drop candidate* to the next in the pressed direction —
 * the technique's "arrow keys step the item through candidate positions".
 *
 * The selection logic is deliberately pure and dnd-kit-free: it takes
 * rectangles and returns a rectangle, so it is unit-testable without a DOM,
 * a browser or a drag. See ./keyboard-coordinates.test.ts.
 */

/** The subset of a DOMRect/ClientRect this module needs. */
export interface RectLike {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

export interface DropCandidate<TId = string> {
  id: TId;
  rect: RectLike;
}

/** Map an arrow key's `event.key` to a direction, or null for any other key. */
export function directionFromKey(key: string): ArrowDirection | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

export function centerOf(rect: RectLike): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * A candidate must be at least this far along the primary axis to count as
 * lying "in" that direction. Without it, floating-point jitter between two
 * slots on the same row lets a Down press pick a sibling in the same row.
 */
const MIN_PRIMARY_ADVANCE = 1;

/**
 * How much a candidate is penalised for being off-axis. Higher means arrows
 * stay within their row/column harder. 3 keeps a 50-slot grid stepping along
 * its row under Left/Right while still allowing Down to reach the row below
 * even when the grid is ragged.
 */
const CROSS_AXIS_PENALTY = 3;

/**
 * Pick the drop candidate an arrow press should move to.
 *
 * Returns `null` when nothing lies in that direction — an arrow at the edge of
 * the grid is a no-op, NOT a wrap. Wrapping is disorienting under a screen
 * reader, where the only signal that the item teleported across the grid is a
 * position announcement the user has to parse after the fact.
 *
 * Ties are broken by comparing ids, so the same press always produces the same
 * move: a keyboard path whose result depends on collection order is a keyboard
 * path that cannot be tested.
 */
export function pickDirectionalTarget<TId extends string | number>(
  direction: ArrowDirection,
  from: RectLike,
  candidates: readonly DropCandidate<TId>[],
): DropCandidate<TId> | null {
  const origin = centerOf(from);
  let best: DropCandidate<TId> | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const center = centerOf(candidate.rect);
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;

    let primary: number;
    let cross: number;
    switch (direction) {
      case 'up':
        primary = -dy;
        cross = Math.abs(dx);
        break;
      case 'down':
        primary = dy;
        cross = Math.abs(dx);
        break;
      case 'left':
        primary = -dx;
        cross = Math.abs(dy);
        break;
      case 'right':
        primary = dx;
        cross = Math.abs(dy);
        break;
    }

    if (primary < MIN_PRIMARY_ADVANCE) continue;

    const score = primary + cross * CROSS_AXIS_PENALTY;
    if (score < bestScore || (score === bestScore && best !== null && candidate.id < best.id)) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Translate the drag so the dragged item's collision rect lands on `target`.
 *
 * dnd-kit's coordinate getter works in translate space, not page space: it is
 * handed where the drag currently is and must return where it should go. The
 * delta between the two rects is therefore added to the current coordinates
 * rather than replacing them.
 */
export function coordinatesForTarget(
  currentCoordinates: Point,
  collisionRect: RectLike,
  target: RectLike,
): Point {
  return {
    x: currentCoordinates.x + (target.left - collisionRect.left),
    y: currentCoordinates.y + (target.top - collisionRect.top),
  };
}
