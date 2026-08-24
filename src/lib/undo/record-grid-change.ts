/**
 * The one call the four previously-unundoable grid mutations make.
 *
 * Registry: undo-history/undo-scope ("one slice definition, one restore door"),
 * gesture-coalescing.
 *
 * Every writer that changes the arrangement wraps itself here. That is what
 * makes the scope enforceable: capture and restore have a single door, and the
 * writers are enumerable — which is exactly what the four bypassing mutations
 * were not.
 *
 * MACHINE-ORIGINATED WRITES DO NOT MINT STEPS. Undo walks user INTENTIONS. A
 * rehydration pass, a derived-statistics recompute, or a reconciliation that
 * fixes an inconsistent slot is nobody's intention and must not call this. The
 * rule is a declaration, not an inference: a writer that is a mechanical apply
 * simply does not wrap. After any restore, that machinery reruns against the
 * restored state and regenerates its own writes.
 */

import { useUndoStore } from '@/stores/undo-store';

import {
  captureGridSlice,
  createSliceCommand,
  slicesEqual,
  SLICE_CONTEXT,
  SLICE_RESULT,
  type GridSlice,
} from './grid-slice';
import { liveStoreContext } from './live-context';

export interface RecordOptions {
  /** What the user did, in their words. Becomes the step's name. */
  description: string;
  /**
   * The gesture this mutation belongs to, or omit for a standalone step.
   *
   * The tag names the GESTURE INSTANCE, not the operation type — include the
   * target's identity ("remove:slot-7", "quick-place:item-42"). A bare "remove"
   * would merge removing slot 3 and slot 9 into one step if the user clicks
   * quickly, and undo would then revert both.
   */
  tag?: string;
}

/**
 * Run `mutate`, and record the arrangement change it caused as an undo step.
 *
 * A mutation that changed nothing records nothing: a no-op step is a Ctrl+Z that
 * appears to do nothing, which the user cannot distinguish from a broken undo.
 *
 * If the stores are not available the mutation STILL RUNS and no step is
 * recorded. Refusing the user's action because the history machinery is not
 * ready would be a worse trade than a missing undo entry — but the two cases
 * are logged differently, so a run that could not record says so.
 */
export function recordGridChange(options: RecordOptions, mutate: () => void): void {
  const stores = liveStoreContext();
  if (!stores) {
    mutate();
    return;
  }

  const before: GridSlice = captureGridSlice(stores);
  mutate();
  const after: GridSlice = captureGridSlice(stores);

  if (slicesEqual(before, after)) return;

  const command = createSliceCommand(options.description, before, after);
  const store = useUndoStore.getState();
  const step = {
    operation: command,
    context: SLICE_CONTEXT,
    result: SLICE_RESULT,
    description: options.description,
  };

  if (options.tag) {
    store.pushTagged({ ...step, tag: options.tag });
  } else {
    // No tag means a standalone intention, which must also CLOSE whatever
    // gesture was open — a commit-grade action is a boundary event.
    store.closeStep();
    store.push(step);
  }
}
