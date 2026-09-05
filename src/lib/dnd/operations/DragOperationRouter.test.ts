/**
 * Tests for DragOperationRouter — the one door every drop passes through.
 *
 * Until 2026-09-05 this router (parse source, parse target, decide the
 * operation, dispatch) had no test at all, while the primitives it feeds and
 * the keyboard maths that positions the drag both did. The parser is where the
 * LIVE payload shapes meet the router's expectations, so it is exactly where a
 * shape mismatch hides: each side reads correct in isolation and only the pair
 * is wrong (registry drag-drop/payload-and-identity).
 *
 * The harness builds a DragEndEvent the way dnd-kit does — `active.data.current`
 * and `over.data.current` carry whatever the surface handed `useDraggable` /
 * `useDroppable` / `useSortable` — using the SAME factories the live surfaces
 * use, so the tests exercise the real payload shapes, not a hand-written
 * approximation of them.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), 2026-09-05: with
 * `determineOperationType`'s `target.isOccupied ? 'swap' : 'move'` flipped, the
 * two grid-to-grid routing tests below went red (measured, restored).
 */

import { describe, expect, it, vi } from 'vitest';

import { createCollectionDragData, createGridDragData, createGridSlotDropData } from '../type-guards';
import { createUnifiedTierDragData, createUnifiedTierRowDropData } from '../unified-protocol';
import { DragOperationRouter } from './DragOperationRouter';
import { createStandardRouter } from './index';

import type { OperationStoreContext } from './types';
import type { CollectionItem } from '@/app/features/Collection/types';
import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType } from '@/types/match';
import type { DragEndEvent } from '@dnd-kit/core';

// The undo store is a zustand singleton the router pushes into; stub it so a
// routing test does not depend on (or pollute) real undo state.
vi.mock('@/stores/undo-store', () => ({
  useUndoStore: { getState: () => ({ push: vi.fn() }) },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function backlogItem(id: string): BacklogItem {
  return { id, name: id, title: id, category: 'test' } as unknown as BacklogItem;
}

/** A grid slot the way grid-store builds it: `id` is the SLOT ADDRESS. */
function slot(position: number, itemId: string | null): GridItemType {
  return {
    id: `grid-${position}`,
    position,
    item: itemId ? ({ id: itemId, title: itemId } as GridItemType['item']) : null,
    context: { matched: itemId !== null },
  } as GridItemType;
}

interface Harness {
  stores: OperationStoreContext;
  grid: GridItemType[];
  used: Set<string>;
  tierCalls: string[];
}

function harness(occupants: (string | null)[], backlogIds: string[] = []): Harness {
  const grid = occupants.map((id, i) => slot(i, id));
  const used = new Set<string>(occupants.filter((id): id is string => id !== null));
  const known = new Set<string>([...backlogIds, ...used]);
  const tierCalls: string[] = [];

  const stores: OperationStoreContext = {
    grid: {
      get gridItems() {
        return grid;
      },
      maxGridSize: grid.length,
      assignItemToGrid: (item, position) => {
        const id = 'item' in item && item.item ? item.item.id : (item as BacklogItem).id;
        grid[position] = slot(position, id);
      },
      removeItemFromGrid: (position) => {
        grid[position] = slot(position, null);
      },
      moveGridItem: (from, to) => {
        const a = grid[from].item?.id ?? null;
        const b = grid[to].item?.id ?? null;
        grid[from] = slot(from, b);
        grid[to] = slot(to, a);
      },
      emitValidationError: () => {},
    },
    backlog: {
      getItemById: (id) => (known.has(id) ? backlogItem(id) : null),
      isItemUsed: (id) => used.has(id),
      markItemAsUsed: (id, isUsed) => {
        if (isUsed) used.add(id);
        else used.delete(id);
      },
    },
    tier: {
      assignToTier: (itemId, tierId) => void tierCalls.push(`assignToTier:${itemId}:${tierId}`),
      moveBetweenTiers: (itemId, from, to, toIndex) =>
        void tierCalls.push(`moveBetweenTiers:${itemId}:${from}:${to}:${toIndex ?? ''}`),
      addToUnranked: (itemId) => void tierCalls.push(`addToUnranked:${itemId}`),
      moveWithinTier: (tierId, from, to) => void tierCalls.push(`moveWithinTier:${tierId}:${from}:${to}`),
    },
  };

  return { stores, grid, used, tierCalls };
}

/** Build a DragEndEvent the way dnd-kit hands it to onDragEnd. */
function dragEnd(
  active: { id: string; data?: unknown },
  over: { id: string; data?: unknown } | null,
): DragEndEvent {
  return {
    active: { id: active.id, data: { current: active.data } },
    over: over ? { id: over.id, data: { current: over.data } } : null,
  } as unknown as DragEndEvent;
}

/** A backlog card as ConfigurableCollectionItem registers it. */
function backlogDrag(id: string) {
  return { id, data: createCollectionDragData({ id, title: id } as CollectionItem, 'group-1') };
}

/** A grid slot as PhysicsGridSlot / SimpleDropZone register it. */
function gridSlotDrop(h: Harness, position: number) {
  const occupant = h.grid[position];
  return {
    id: `grid-${position}`,
    data: createGridSlotDropData(position, occupant.context.matched, occupant.context.matched ? occupant : undefined),
  };
}

/** An occupied grid slot as SimpleDropZone makes it draggable. */
function gridItemDrag(h: Harness, position: number) {
  return { id: `grid-${position}`, data: createGridDragData(h.grid[position]) };
}

/** A tier row as TierRow registers it (`tier-${tier.id}`). */
function tierRowDrop(tierId: string, tierIndex = 0) {
  return { id: `tier-${tierId}`, data: createUnifiedTierRowDropData(tierId, tierIndex) };
}

/** A tier item as TierItem registers it: useSortable with DRAG data. */
function tierItemSortable(itemId: string, tierId: string, orderInTier: number) {
  return {
    id: itemId,
    data: createUnifiedTierDragData({ id: itemId, title: itemId }, tierId, orderInTier),
  };
}

// ---------------------------------------------------------------------------
// Grid routing
// ---------------------------------------------------------------------------

describe('DragOperationRouter — grid operations', () => {
  it('backlog card onto an empty slot is an assign that places and marks used', () => {
    const h = harness([null, null, null], ['x']);
    const router = createStandardRouter();

    const result = router.handleDragEnd(dragEnd(backlogDrag('x'), gridSlotDrop(h, 1)), h.stores);

    expect(result.success).toBe(true);
    expect(result.operationType).toBe('assign');
    expect(h.grid[1].item?.id).toBe('x');
    expect(h.used.has('x')).toBe(true);
  });

  it('grid item onto an empty slot is a move', () => {
    const h = harness(['a', null, null]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(dragEnd(gridItemDrag(h, 0), gridSlotDrop(h, 2)), h.stores);

    expect(result.operationType).toBe('move');
    expect(result.success).toBe(true);
    expect(h.grid.map((s) => s.item?.id ?? null)).toEqual([null, null, 'a']);
  });

  it('grid item onto an occupied slot is a swap', () => {
    const h = harness(['a', 'b', null]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(dragEnd(gridItemDrag(h, 0), gridSlotDrop(h, 1)), h.stores);

    expect(result.operationType).toBe('swap');
    expect(result.success).toBe(true);
    expect(h.grid.map((s) => s.item?.id ?? null)).toEqual(['b', 'a', null]);
  });

  it('dropping a grid item on its own slot is a noop, not a rejection the user sees', () => {
    const h = harness(['a', null]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(dragEnd(gridItemDrag(h, 0), gridSlotDrop(h, 0)), h.stores);

    expect(result.operationType).toBe('noop');
    expect(result.success).toBe(true);
  });

  it('a grid-only router still routes the three grid operations without any registration', () => {
    const router = new DragOperationRouter();
    expect(router.getRegisteredOperations()).toEqual(['assign', 'move', 'swap']);
  });
});

// ---------------------------------------------------------------------------
// Tier routing — the payloads the live tier surfaces actually send
// ---------------------------------------------------------------------------

describe('DragOperationRouter — tier operations', () => {
  it('backlog card onto a tier row is a tier-assign', () => {
    const h = harness([], ['x']);
    const router = createStandardRouter();

    const result = router.handleDragEnd(dragEnd(backlogDrag('x'), tierRowDrop('tier-s')), h.stores);

    expect(result.operationType).toBe('tier-assign');
    expect(result.success).toBe(true);
    expect(h.tierCalls).toEqual(['assignToTier:x:tier-s']);
  });

  it('tier item onto a different tier row is a tier-transfer', () => {
    const h = harness([]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(
      dragEnd(tierItemSortable('x', 'tier-s', 0), tierRowDrop('tier-a', 1)),
      h.stores,
    );

    expect(result.operationType).toBe('tier-transfer');
    expect(result.success).toBe(true);
    expect(h.tierCalls).toEqual(['moveBetweenTiers:x:tier-s:tier-a:']);
  });

  it('tier item onto the unranked pool is an unrank', () => {
    const h = harness([]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(
      dragEnd(tierItemSortable('x', 'tier-s', 0), { id: 'unranked-pool', data: { type: 'unranked-pool' } }),
      h.stores,
    );

    expect(result.operationType).toBe('unrank');
    expect(h.tierCalls).toEqual(['addToUnranked:x']);
  });

  // A tier ITEM is a droppable too (useSortable), and pointerWithin ranks the
  // smaller rect under the pointer ahead of the row around it — so dropping
  // onto another card is the ordinary way a user reorders or transfers. The
  // payload a tier item carries is DRAG data (source.tierId / source.orderInTier).
  // Before 2026-09-05 parseTarget read the never-produced DROP shape
  // (data.tierId / data.position), saw no tier, and refused every such drop
  // as "Target must be a different tier".
  it('tier item onto another item in the SAME tier is a reorder at that item', () => {
    const h = harness([]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(
      dragEnd(tierItemSortable('x', 'tier-s', 0), tierItemSortable('y', 'tier-s', 2)),
      h.stores,
    );

    expect(result.success).toBe(true);
    expect(result.operationType).toBe('tier-move');
    expect(h.tierCalls).toEqual(['moveWithinTier:tier-s:0:2']);
  });

  it('tier item onto an item in ANOTHER tier transfers to that position', () => {
    const h = harness([]);
    const router = createStandardRouter();

    const result = router.handleDragEnd(
      dragEnd(tierItemSortable('x', 'tier-s', 0), tierItemSortable('y', 'tier-a', 1)),
      h.stores,
    );

    expect(result.success).toBe(true);
    expect(result.operationType).toBe('tier-transfer');
    expect(h.tierCalls).toEqual(['moveBetweenTiers:x:tier-s:tier-a:1']);
  });
});
