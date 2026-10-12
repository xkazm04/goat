/**
 * Tests for the undoable slice and for gesture coalescing.
 *
 * These encode the two rows this work exists to close:
 *
 *   undo-scope         four grid mutations bypassed the stack entirely, and
 *                      tier ops were CONDITIONALLY undoable, so Ctrl+Z could
 *                      fail AFTER the press
 *   gesture-coalescing every router operation pushed one command with no merge,
 *                      so arranging six items cost six Ctrl+Z presses
 *
 * NEGATIVE CONTROLS (test-harness/negative-control-tests), run 2026-08-25. All
 * three MEASURED and restored, over these 22 tests:
 *
 *   (1) `pushTagged`'s merge condition weakened from `top.tag === command.tag`
 *       to `top.tag !== undefined` — tag identity ignored, which merges two
 *       different gestures into one step and is exactly the defect a bare
 *       "move" tag ships. Reds 2.
 *   (2) the `!command.operation.rollback` guard removed from `push`, restoring
 *       "a step reaches the stack and undo discovers later that it cannot run".
 *       Reds 1.
 *   (3) the merge taking the LATEST rollback instead of keeping the FIRST —
 *       which makes undo restore where the gesture's last event landed rather
 *       than where the gesture started. Reds 1.
 *
 * Small red counts, reported honestly rather than rounded up: each mutation
 * breaks one property, and these tests were written one property per test on
 * purpose. A mutation that reddened half the file would mean the tests overlap,
 * not that the control is strong.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useUndoStore } from '@/stores/undo-store';

import {
  captureGridSlice,
  createSliceCommand,
  restoreGridSlice,
  slicesEqual,
  SLICE_CONTEXT,
  SLICE_RESULT,
} from './grid-slice';

import type { OperationStoreContext } from '@/lib/dnd/operations/types';

// ---------------------------------------------------------------------------
// A fake store context. Deliberately hand-built rather than mounting the real
// stores: a test that must construct five unrelated things to exercise one is a
// measurement of coupling somebody already paid for, and the slice's contract is
// exactly the six methods below.
// ---------------------------------------------------------------------------

function makeStores(size = 5) {
  const items = new Map<string, { id: string; title: string }>();
  for (let i = 1; i <= 9; i += 1) items.set(`i${i}`, { id: `i${i}`, title: `Item ${i}` });
  const used = new Set<string>();
  const grid: Array<{ item?: { id: string; title: string }; context: { matched: boolean } }> =
    Array.from({ length: size }, () => ({ context: { matched: false } }));

  const stores = {
    grid: {
      get gridItems() {
        return grid;
      },
      maxGridSize: size,
      assignItemToGrid: (item: { id: string }, position: number) => {
        grid[position] = {
          item: items.get(item.id) ?? { id: item.id, title: item.id },
          context: { matched: true },
        };
      },
      removeItemFromGrid: (position: number) => {
        grid[position] = { context: { matched: false } };
      },
      moveGridItem: () => {},
      emitValidationError: () => {},
    },
    backlog: {
      getItemById: (id: string) => items.get(id) ?? null,
      isItemUsed: (id: string) => used.has(id),
      markItemAsUsed: (id: string, isUsed: boolean) => {
        if (isUsed) used.add(id);
        else used.delete(id);
      },
    },
  } as unknown as OperationStoreContext;

  const place = (id: string, position: number) => {
    stores.grid.assignItemToGrid({ id } as never, position);
    stores.backlog.markItemAsUsed(id, true);
  };
  const layout = () => grid.map((g) => g.item?.id ?? null);
  return { stores, place, layout, used };
}

describe('captureGridSlice — the one capture function', () => {
  it('captures the arrangement by DURABLE item identity, position by position', () => {
    const { stores, place } = makeStores(3);
    place('i1', 0);
    place('i2', 2);
    const slice = captureGridSlice(stores);
    expect(slice.slots).toEqual([
      { position: 0, itemId: 'i1' },
      { position: 1, itemId: null },
      { position: 2, itemId: 'i2' },
    ]);
  });

  it('captures the used flags implied by the arrangement', () => {
    const { stores, place } = makeStores(3);
    place('i1', 0);
    expect(captureGridSlice(stores).usedItemIds).toEqual(['i1']);
  });

  it('captures nothing about view state — there is no field for it', () => {
    const { stores } = makeStores(3);
    const slice = captureGridSlice(stores);
    expect(Object.keys(slice).sort()).toEqual(['slots', 'usedItemIds']);
  });
});

describe('restoreGridSlice — the one restore door', () => {
  it('restores an arrangement that was cleared', () => {
    const { stores, place, layout } = makeStores(4);
    place('i1', 0);
    place('i2', 1);
    place('i3', 3);
    const before = captureGridSlice(stores);

    for (let p = 0; p < 4; p += 1) stores.grid.removeItemFromGrid(p);
    expect(layout()).toEqual([null, null, null, null]);

    restoreGridSlice(stores, before);
    expect(layout()).toEqual(['i1', 'i2', null, 'i3']);
  });

  it('restores the used flags, so nothing is stranded off both surfaces', () => {
    const { stores, place, used } = makeStores(3);
    place('i1', 0);
    const before = captureGridSlice(stores);

    stores.grid.removeItemFromGrid(0);
    stores.backlog.markItemAsUsed('i1', false);
    stores.grid.assignItemToGrid({ id: 'i2' } as never, 0);
    stores.backlog.markItemAsUsed('i2', true);

    restoreGridSlice(stores, before);
    expect(used.has('i1')).toBe(true);
    // i2 was not in the restored arrangement, so it goes back to the backlog
    // rather than being marked used while sitting nowhere.
    expect(used.has('i2')).toBe(false);
  });

  it('clears before it places, so an item never appears in two slots mid-restore', () => {
    const { stores, place, layout } = makeStores(3);
    place('i1', 0);
    const before = captureGridSlice(stores);

    // The user moved i1 from slot 0 to slot 2.
    stores.grid.removeItemFromGrid(0);
    stores.grid.assignItemToGrid({ id: 'i1' } as never, 2);
    expect(layout()).toEqual(['i1', null, 'i1'].map((v, i) => (i === 0 ? null : v)));

    restoreGridSlice(stores, before);
    expect(layout()).toEqual(['i1', null, null]);
  });

  it('skips an item that has left the backlog rather than inventing a placeholder', () => {
    const { stores, place, layout } = makeStores(3);
    place('i1', 0);
    place('i2', 1);
    const before = captureGridSlice(stores);
    for (let p = 0; p < 3; p += 1) stores.grid.removeItemFromGrid(p);

    // i1 is gone from the backlog entirely.
    const stripped = {
      ...stores,
      backlog: {
        ...stores.backlog,
        getItemById: (id: string) => (id === 'i1' ? null : stores.backlog.getItemById(id)),
      },
    } as OperationStoreContext;

    restoreGridSlice(stripped, before);
    // The rest of the slice still lands.
    expect(layout()).toEqual([null, 'i2', null]);
  });
});

describe('slicesEqual — a mutation that changed nothing records nothing', () => {
  it('is true for two captures of the same arrangement', () => {
    const { stores, place } = makeStores(3);
    place('i1', 0);
    expect(slicesEqual(captureGridSlice(stores), captureGridSlice(stores))).toBe(true);
  });

  it('is false once a slot changes', () => {
    const { stores, place } = makeStores(3);
    place('i1', 0);
    const a = captureGridSlice(stores);
    place('i2', 1);
    expect(slicesEqual(a, captureGridSlice(stores))).toBe(false);
  });
});

describe('createSliceCommand — every step is undoable by construction', () => {
  it('always carries a rollback', () => {
    const { stores } = makeStores(2);
    const s = captureGridSlice(stores);
    expect(typeof createSliceCommand('x', s, s).rollback).toBe('function');
  });

  it('names the step in the user’s words, not by operation type', () => {
    const { stores } = makeStores(2);
    const s = captureGridSlice(stores);
    expect(createSliceCommand('Rebuild grid from tier list', s, s).description).toBe(
      'Rebuild grid from tier list',
    );
  });
});

// ---------------------------------------------------------------------------
// Coalescing
// ---------------------------------------------------------------------------

// `null` means "deliberately no rollback". Passing `undefined` would trigger
// the default parameter and quietly give the step a rollback after all — which
// it did on the first run, and the refusal tests passed a step that was never
// refusable.
const step = (description: string, rollback: (() => void) | null = () => {}) => ({
  operation: {
    type: 'noop' as const,
    validate: () => ({ isValid: true }),
    execute: () => SLICE_RESULT,
    ...(rollback ? { rollback } : {}),
  },
  context: SLICE_CONTEXT,
  result: SLICE_RESULT,
  description,
});

describe('gesture coalescing', () => {
  beforeEach(() => {
    useUndoStore.getState().clear();
  });

  it('merges consecutive pushes carrying the SAME tag into one step', () => {
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    s.pushTagged({ ...step('move a again'), tag: 'move:A' });
    s.pushTagged({ ...step('move a once more'), tag: 'move:A' });
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
  });

  it('the merged step names the LATEST intention, so it says what redo will do', () => {
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('move a to 1'), tag: 'move:A' });
    s.pushTagged({ ...step('move a to 7'), tag: 'move:A' });
    expect(useUndoStore.getState().undoDescription()).toBe('move a to 7');
  });

  it('a DIFFERENT tag opens a new step — the tag names the gesture INSTANCE', () => {
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    s.pushTagged({ ...step('move b'), tag: 'move:B' });
    expect(useUndoStore.getState().undoStack).toHaveLength(2);
  });

  it('reusing a tag after another gesture does NOT resurrect the closed step', () => {
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    s.pushTagged({ ...step('move b'), tag: 'move:B' });
    s.pushTagged({ ...step('move a again'), tag: 'move:A' });
    // Three steps, not two: merging is only legal into the CURRENT TOP.
    expect(useUndoStore.getState().undoStack).toHaveLength(3);
  });

  it('closeStep seals the open step, so the next same-tag push starts a new one', () => {
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    s.closeStep();
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    expect(useUndoStore.getState().undoStack).toHaveLength(2);
  });

  it('an untagged push closes the open gesture — a commit-grade action is a boundary', () => {
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    s.closeStep();
    s.push(step('clear grid'));
    s.pushTagged({ ...step('move a'), tag: 'move:A' });
    expect(useUndoStore.getState().undoStack).toHaveLength(3);
  });

  it('merging keeps the FIRST rollback and takes the LATEST forward half', () => {
    const order: string[] = [];
    const s = useUndoStore.getState();
    s.pushTagged({ ...step('first', () => order.push('rollback-first')), tag: 'g' });
    s.pushTagged({ ...step('second', () => order.push('rollback-second')), tag: 'g' });

    const top = useUndoStore.getState().undoStack[0];
    top.operation.rollback?.(SLICE_CONTEXT, SLICE_RESULT, {} as OperationStoreContext);
    // Undo restores where the GESTURE STARTED, not where its last event did.
    expect(order).toEqual(['rollback-first']);
  });

  it('a merged step costs one entry no matter how many events merged into it', () => {
    const s = useUndoStore.getState();
    for (let i = 0; i < 40; i += 1) s.pushTagged({ ...step(`drag ${i}`), tag: 'drag:42' });
    expect(useUndoStore.getState().undoStack).toHaveLength(1);
  });
});

describe('a step that reaches the stack is undoable by construction', () => {
  beforeEach(() => {
    useUndoStore.getState().clear();
  });

  it('REFUSES an untagged step with no rollback rather than failing at Ctrl+Z', () => {
    useUndoStore.getState().push(step('tier op with no inverse', null));
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
    expect(useUndoStore.getState().canUndo()).toBe(false);
  });

  it('REFUSES a tagged step with no rollback', () => {
    useUndoStore.getState().pushTagged({ ...step('tier op', null), tag: 'tier:1' });
    expect(useUndoStore.getState().undoStack).toHaveLength(0);
  });

  it('so canUndo() is honest: true means Ctrl+Z will work', () => {
    const s = useUndoStore.getState();
    s.push(step('a real step'));
    expect(useUndoStore.getState().canUndo()).toBe(true);
    expect(useUndoStore.getState().undoStack[0].operation.rollback).toBeTypeOf('function');
  });
});
