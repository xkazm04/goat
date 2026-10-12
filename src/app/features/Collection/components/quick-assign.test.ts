// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBacklogStore } from '@/stores/backlog-store';
import { useGridStore } from '@/stores/grid-store';

import { quickAssignFromBacklog } from './ItemDetailPopupProvider';

import type { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

/**
 * `quickAssignFromBacklog` is the single quick-assign door for both item detail
 * surfaces (the floating ItemDetailPopup and the ItemInspector side panel).
 *
 * Before 2026-09-05 there were TWO implementations of "put this item in the
 * next open slot": the inspector's went through the grid-store's atomic
 * `assignToNextOpenSlot` (lock, fresh read, verify, mark used); the popup's
 * hand-rolled the scan against a stale component snapshot, built a grid item
 * whose id was the SLOT address, called `assignItemToGrid` directly, and never
 * marked the backlog item used — so the item stayed in the collection as
 * available after it had been placed.
 *
 * The contract pinned here is the ROUTE: the resolved backlog item goes through
 * `assignToNextOpenSlot`, and nothing else touches the grid. The mark-used and
 * lock behaviour are that action's own contract (grid-store); in vitest the
 * grid-store's lazy `require()` accessor to the backlog store does not resolve,
 * so asserting `isItemUsed` here would test the harness, not the code.
 *
 * Negative control (recorded 2026-09-05): the pre-fix popup handler, driven
 * through the same stores, called `assignToNextOpenSlot` 0 times and
 * `assignItemToGrid` once with `{ id: 'grid-1', ... }` — the first test below
 * was red against it.
 */

const item = (id: string): BacklogItem => ({
  id,
  name: `Item ${id}`,
  title: `Item ${id}`,
  category: 'games',
  created_at: '2026-01-01T00:00:00.000Z',
});

const group: BacklogGroup = {
  id: 'g1',
  name: 'Group 1',
  category: 'games',
  item_count: 3,
  created_at: '2026-01-01T00:00:00.000Z',
  items: [item('a'), item('b'), item('c')],
};

describe('quickAssignFromBacklog', () => {
  // Zustand store state outlives a test; a replaced action must be put back.
  const realDoor = useGridStore.getState().assignToNextOpenSlot;

  beforeEach(() => {
    useBacklogStore.setState({ groups: [group] });
    useGridStore.setState({ assignToNextOpenSlot: realDoor });
    useGridStore.getState().initializeGrid(2, 'list-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useGridStore.setState({ assignToNextOpenSlot: realDoor });
  });

  it('routes the resolved backlog item through the atomic assignToNextOpenSlot door', () => {
    const door = vi.fn(realDoor);
    const direct = vi.spyOn(useGridStore.getState(), 'assignItemToGrid');
    useGridStore.setState({ assignToNextOpenSlot: door });

    expect(quickAssignFromBacklog('a')).toBe(0);

    expect(door).toHaveBeenCalledTimes(1);
    expect(door.mock.calls[0][0]).toMatchObject({ id: 'a', title: 'Item a' });
    // The only grid write is the one the door makes itself.
    expect(direct).toHaveBeenCalledTimes(1);
    expect(direct.mock.calls[0][0]).toMatchObject({ id: 'a' });
  });

  it('places into the first open slot, then the next', () => {
    expect(quickAssignFromBacklog('a')).toBe(0);
    expect(quickAssignFromBacklog('b')).toBe(1);
    const slots = useGridStore.getState().gridItems;
    expect(slots[0].item?.id).toBe('a');
    expect(slots[1].item?.id).toBe('b');
    expect(slots.every((s) => s.context.matched)).toBe(true);
  });

  it('returns null and never reaches the door for an unknown item', () => {
    const door = vi.fn();
    useGridStore.setState({ assignToNextOpenSlot: door });
    expect(quickAssignFromBacklog('nope')).toBeNull();
    expect(door).not.toHaveBeenCalled();
  });

  it('returns null when the grid is full', () => {
    quickAssignFromBacklog('a');
    quickAssignFromBacklog('b');
    expect(quickAssignFromBacklog('c')).toBeNull();
    expect(useGridStore.getState().gridItems.some((s) => s.item?.id === 'c')).toBe(false);
  });
});
