/**
 * dnd-kit adapter for the pure arrow-stepping logic in ./keyboard-coordinates.
 *
 * Everything decidable without a browser lives in that module and is unit
 * tested. This file is the thin, untestable-without-a-DOM half: it reads
 * dnd-kit's live droppable rects and hands them over.
 *
 * Registry: drag-drop/keyboard-alternatives (grab / move / drop / cancel, one
 * operation with two inputs).
 */

import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';

import {
  coordinatesForTarget,
  directionFromKey,
  pickDirectionalTarget,
  type DropCandidate,
} from './keyboard-coordinates';

/**
 * Arrow keys step the drag from one registered droppable to the next in the
 * pressed direction, rather than translating a fixed number of pixels.
 *
 * `filterId` narrows which droppables are reachable — the grid passes a
 * predicate that keeps slots and tier rows and drops decorative containers, so
 * an arrow press cannot land the drag somewhere the pointer path would refuse.
 */
export function createStepwiseKeyboardCoordinateGetter(
  filterId?: (id: string) => boolean,
): KeyboardCoordinateGetter {
  return (event, { currentCoordinates, context }) => {
    const direction = directionFromKey(event.key);
    if (!direction) return undefined;

    const { droppableRects, droppableContainers, collisionRect } = context;
    if (!collisionRect) return undefined;

    const candidates: DropCandidate<string>[] = [];
    for (const container of droppableContainers.toArray()) {
      if (container.disabled) continue;
      const id = String(container.id);
      if (filterId && !filterId(id)) continue;
      const rect = droppableRects.get(container.id);
      if (!rect) continue;
      candidates.push({ id, rect });
    }

    const target = pickDirectionalTarget(direction, collisionRect, candidates);
    // No target in that direction: stay put. Deliberately not a wrap — see
    // keyboard-coordinates.ts.
    if (!target) return undefined;

    // Consume the key only once a move is actually happening, so an arrow at
    // the edge of the grid still scrolls the page.
    event.preventDefault();
    return coordinatesForTarget(currentCoordinates, collisionRect, target.rect);
  };
}

/**
 * `pointerWithin` returns nothing when there are no pointer coordinates, which
 * is exactly the keyboard's situation — wiring a KeyboardSensor behind it gives
 * a drag that moves and can never drop. Fall back to `closestCenter` when the
 * pointer is absent.
 *
 * This is the defect that makes a naively-added KeyboardSensor worse than none:
 * the announcement becomes true, the grab works, and the drop silently does
 * nothing.
 */
export function pointerWithinOrClosestCenter(): CollisionDetection {
  return (args) => (args.pointerCoordinates ? pointerWithin(args) : closestCenter(args));
}
