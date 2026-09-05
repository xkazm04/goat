# `src/lib/undo` — the undoable slice and its door

Added 2026-08-25. Registry: `undo-history/undo-scope`, `gesture-coalescing`,
`undo-model-selection`.

## What this closes

Undo was inverse-command only — every step a `DragOperation` carrying its own
`rollback`. That is the right model for the drag path and it stays. But it left
**four grid mutations bypassing the stack entirely**, and made tier operations
**conditionally undoable**, so Ctrl+Z could fail *after* the press.

| mutation | before | now |
|---|---|---|
| per-slot X button | no step at all — Ctrl+Z reverted the previous drag instead | one step, tagged `remove:<position>` |
| keyboard placement (`q` + digits) | no step at all | one step, tagged `quick-place:<itemId>` |
| mobile tap-to-place | no step at all — the primary touch interaction had no undo | one step, tagged `tap-place:<itemId>` |
| view-mode `clearGrid()` + bulk re-assign | **cleared all 50 slots with no way back** | one untagged, commit-grade step |
| a tier op with no `rollback` | pushed, then `undo()` returned false at the press | **refused at push** |

## Scope — the dividing line

Undo reverts what the user **said about the document**; it does not revert **how
the user is looking at it**. Every field carries an explicit in/out decision, and
the header of `grid-slice.ts` is the reviewable record of those decisions.

**In scope:** the arrangement (which item identity sits in which position), and
the backlog `used` flags implied by it.

**Out of scope:** `viewMode`, `mobileSelectedItem`, `hoveredPosition`, drag
state, drop-zone highlights, scroll, filters. Note the deliberate consequence:
switching view mode out of tier list performs a *document* mutation (clear +
rebuild), so **the mutation is undoable and the mode is not** — undo returns your
ranking without also throwing you back into the previous view.

**Out by different reasoning:** derived statistics are recomputed after restore,
never captured. A captured cache is a stale cache with provenance laundered.

## Model

A slice **snapshot** for these four operations, and inverse commands everywhere
else. Justified rather than assumed: `clearGrid()` + bulk re-assign has no cheap
inverse — inverting it means reconstructing 50 placements and their used-flags —
while its snapshot is 50 small records. Two models in one stack is fine because
both produce the same step shape, which is what `createSliceCommand` guarantees.

## Coalescing

`useUndoStore.pushTagged` merges consecutive pushes carrying the **same tag**
into the step at the top of the stack.

- The tag names the **gesture instance**, not the operation type. A bare `move`
  tag merges dragging item A with dragging item B if the user alternates
  quickly, and one Ctrl+Z would revert both.
- Merging is **only legal into the current top of stack**. `move:A`, other
  edits, `move:A` again is two steps — reusing a tag must not resurrect a closed
  step.
- Merging is **asymmetric**: keep the first mutation's rollback, take the latest
  forward half. A merged step costs one entry no matter how many events merged
  into it. An implementation that appended would have reimplemented the
  uncoalesced stack with extra bookkeeping.
- **Boundary events close a step:** a different tag, an untagged (commit-grade)
  push, and undo/redo themselves. A 60s ceiling exists as a backstop, not as
  policy — if it fires often the tag design is wrong.

## Files

| file | job |
|---|---|
| `grid-slice.ts` | THE slice definition, THE capture function, THE restore door, and the step factory |
| `live-context.ts` | a store context that reads at call time. The memoized context `SimpleMatchGrid` builds is a snapshot of `gridItems` as of the last render — correct for the drag router, and wrong for a capture/restore pair straddling a synchronous mutation |
| `record-grid-change.ts` | the one call every non-drag arrangement writer makes |

## Rules for new writers

1. A writer that changes the arrangement wraps itself in `recordGridChange`.
2. A **machine-originated** write does not. Undo walks user intentions; a
   rehydration pass or a reconciliation is nobody's intention. It mutates the
   present and does not mint a step, and after any restore it reruns against the
   restored state.
3. Any field added to the editing state gets an explicit in/out decision in
   `grid-slice.ts`'s header. That comment is the record of those decisions, and
   a field that half-joins the scope is the known decay mode.
