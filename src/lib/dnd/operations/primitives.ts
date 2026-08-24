/**
 * Algebraic DnD Primitives
 *
 * Three primitives from which all grid operations compose:
 * - Place(itemId, item, position) — put an item into a grid slot
 * - Remove(position)              — take an item out of a grid slot
 * - Swap(posA, posB)              — exchange two grid slots
 *
 * Validation is a pure function over (primitive, gridState) → ValidationResult.
 * Execution applies a primitive to the grid store (side effect).
 *
 * Compound operations decompose into primitive sequences:
 *   Assign = [Remove(pos) if occupied] + Place(item, pos)
 *   Move   = Swap(from, to)
 *   Swap   = Swap(posA, posB)
 */

import { createGridItem, type GridItemSource } from '@/lib/grid';

import type { GridStoreContext } from './types';
import type { ValidationResult } from '@/lib/validation';
import type { GridItemType } from '@/types/match';

// ============================================================================
// Primitive Types
// ============================================================================

export interface PlacePrimitive {
  readonly kind: 'place';
  readonly itemId: string;
  readonly item: GridItemSource;
  readonly position: number;
}

export interface RemovePrimitive {
  readonly kind: 'remove';
  readonly position: number;
  /**
   * WHICH ITEM this statement is about, as of plan time.
   *
   * A drop is a statement about IDENTITIES, never about indices. The moment a
   * drag begins the arrangement starts going stale — another surface writes, a
   * rehydration lands, a second gesture finishes — and a primitive encoded
   * purely positionally is evaluated against an arrangement that may no longer
   * exist. It then lands on whatever occupies that slot NOW: the user watched
   * item X being removed, the system removed slot 3.
   *
   * `null` means "the plan asserts this slot was EMPTY". `undefined` means the
   * caller did not state an expectation and the check is skipped — kept only so
   * older call sites are not silently reinterpreted, and every in-repo caller
   * now states one.
   */
  readonly expectItemId?: string | null;
}

export interface SwapPrimitive {
  readonly kind: 'swap';
  readonly posA: number;
  readonly posB: number;
  /** Which item the plan believed occupied posA. See RemovePrimitive.expectItemId. */
  readonly expectItemA?: string | null;
  /** Which item the plan believed occupied posB. `null` asserts an empty slot. */
  readonly expectItemB?: string | null;
}

export type GridPrimitive = PlacePrimitive | RemovePrimitive | SwapPrimitive;

// ============================================================================
// Grid State (read-only snapshot for validation)
// ============================================================================

export interface GridState {
  readonly gridItems: GridItemType[];
  readonly maxGridSize: number;
}

// ============================================================================
// Pure Validation
// ============================================================================

/**
 * The identity of whatever occupies a slot right now, or null for empty.
 *
 * NOTE the two ids on a grid slot, which is the trap this whole check exists
 * around: `slot.id` is the SLOT ADDRESS ("grid-7", rewritten whenever the slot's
 * occupant changes) and `slot.item.id` is the ITEM'S DURABLE IDENTITY. Only the
 * second one identifies anything. Reading the first as an item id gives you a
 * value that is a function of position, which is exactly how a positional drop
 * lands on the wrong record.
 */
function occupantIdentity(state: GridState, position: number): string | null {
  const slot = state.gridItems[position];
  if (!slot || !slot.context.matched) return null;
  return slot.item?.id ?? null;
}

/**
 * Refuse a primitive whose statement no longer matches the world.
 *
 * Returns null when the expectation holds (or was not stated).
 */
function checkExpectation(
  state: GridState,
  position: number,
  expected: string | null | undefined,
  label: string,
): ValidationResult | null {
  if (expected === undefined) return null;
  const actual = occupantIdentity(state, position);
  if (actual === expected) return null;
  return {
    isValid: false,
    errorCode: actual === null ? 'SOURCE_NOT_FOUND' : 'SOURCE_ALREADY_USED',
    errorMessage:
      `${label} at position ${position} is no longer the item this drop was about ` +
      `(expected ${expected ?? 'an empty slot'}, found ${actual ?? 'an empty slot'}).`,
    debugInfo: { position, expected, actual },
  };
}

/**
 * Validate a single primitive against grid state.
 * Pure function — no side effects.
 */
export function validatePrimitive(
  primitive: GridPrimitive,
  state: GridState
): ValidationResult {
  switch (primitive.kind) {
    case 'place': {
      const { position } = primitive;
      if (position < 0 || position >= state.maxGridSize) {
        return {
          isValid: false,
          errorCode: 'TARGET_OUT_OF_BOUNDS',
          errorMessage: `Position ${position} is out of bounds (max ${state.maxGridSize})`,
          debugInfo: { position, maxGridSize: state.maxGridSize },
        };
      }
      return { isValid: true };
    }

    case 'remove': {
      const { position } = primitive;
      if (position < 0 || position >= state.maxGridSize) {
        return {
          isValid: false,
          errorCode: 'TARGET_OUT_OF_BOUNDS',
          errorMessage: `Position ${position} is out of bounds (max ${state.maxGridSize})`,
          debugInfo: { position, maxGridSize: state.maxGridSize },
        };
      }
      const slot = state.gridItems[position];
      if (!slot || !slot.context.matched) {
        return {
          isValid: false,
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: `No item at position ${position}`,
          debugInfo: { position },
        };
      }
      const drift = checkExpectation(state, position, primitive.expectItemId, 'Occupant');
      if (drift) return drift;
      return { isValid: true };
    }

    case 'swap': {
      const { posA, posB } = primitive;
      if (posA < 0 || posA >= state.maxGridSize) {
        return {
          isValid: false,
          errorCode: 'TARGET_OUT_OF_BOUNDS',
          errorMessage: `Source position ${posA} is out of bounds`,
          debugInfo: { posA, maxGridSize: state.maxGridSize },
        };
      }
      if (posB < 0 || posB >= state.maxGridSize) {
        return {
          isValid: false,
          errorCode: 'TARGET_OUT_OF_BOUNDS',
          errorMessage: `Target position ${posB} is out of bounds`,
          debugInfo: { posB, maxGridSize: state.maxGridSize },
        };
      }
      if (posA === posB) {
        return {
          isValid: false,
          errorCode: 'SAME_POSITION',
          errorMessage: 'Source and target positions are the same',
          debugInfo: { posA, posB },
        };
      }
      const driftA = checkExpectation(state, posA, primitive.expectItemA, 'Source occupant');
      if (driftA) return driftA;
      const driftB = checkExpectation(state, posB, primitive.expectItemB, 'Target occupant');
      if (driftB) return driftB;
      const sourceSlot = state.gridItems[posA];
      if (!sourceSlot || !sourceSlot.context.matched) {
        return {
          isValid: false,
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: `No item at source position ${posA}`,
          debugInfo: { posA },
        };
      }
      return { isValid: true };
    }
  }
}

/**
 * Validate a sequence of primitives.
 * Returns the first failure or { isValid: true }.
 */
export function validateSequence(
  primitives: GridPrimitive[],
  state: GridState
): ValidationResult {
  for (const p of primitives) {
    const result = validatePrimitive(p, state);
    if (!result.isValid) return result;
  }
  return { isValid: true };
}

// ============================================================================
// Execution (side effects)
// ============================================================================

/**
 * Execute a single primitive against the grid store.
 * This is the only function that causes side effects.
 */
export function executePrimitive(
  primitive: GridPrimitive,
  grid: GridStoreContext
): void {
  switch (primitive.kind) {
    case 'place': {
      const gridItem = createGridItem(primitive.item, primitive.position);
      grid.assignItemToGrid(gridItem, primitive.position);
      break;
    }
    case 'remove': {
      grid.removeItemFromGrid(primitive.position);
      break;
    }
    case 'swap': {
      grid.moveGridItem(primitive.posA, primitive.posB);
      break;
    }
  }
}

/**
 * Execute a sequence of primitives.
 */
export function executeSequence(
  primitives: GridPrimitive[],
  grid: GridStoreContext
): void {
  for (const p of primitives) {
    executePrimitive(p, grid);
  }
}
