/**
 * Compare-and-swap revert for optimistic writes.
 *
 * Registry: client-state/optimistic-write-path ("revert by compare-and-swap,
 * never unconditionally").
 *
 * THE DEFECT THIS REPLACES
 * ------------------------
 * `useOptimisticMutation.onError` wrote every snapshot back unconditionally.
 * An unconditional rollback assumes it is the only writer, and in a client with
 * concurrent mutations and background revalidation it never is:
 *
 *   A refetch landing between the patch and the failure. The list revalidates —
 *   a focus return, an invalidation event, a scheduled floor — and commits the
 *   authority's current truth over the optimistic value. Then the mutation
 *   fails and writes its snapshot back, RESURRECTING a value the authority has
 *   just contradicted. The rollback wins over the fresher fact for no better
 *   reason than that it was written to be unconditional.
 *
 * THE PREDICATE
 * -------------
 * Revert only while the exact thing this attempt wrote still holds. Equal:
 * nothing has overwritten the optimistic value, and the revert is the
 * correction it was meant to be. Different: a later commit, a refetch or a
 * subsequent mutation has already written a newer truth, and the revert is
 * DROPPED.
 *
 * Scope of the comparison, and why it is the whole cached value here: the
 * technique warns that comparing the whole ENTITY is too strict, because an
 * unrelated field a refetch refreshed makes the predicate fail. That warning is
 * about an entity with fields the attempt did not write. This hook's unit of
 * writing IS the whole query-cache entry — the updater returns the complete new
 * value for that key — so the written field set and the cached value are the
 * same thing, and comparing it whole is exact rather than strict. A caller with
 * a narrower write can supply `writtenFields` to say so.
 *
 * BY VALUE, NOT BY REFERENCE. A patch carrying a structure is usually stored as
 * the very object the attempt was handed, so an identity comparison is trivially
 * true and the guard does nothing; and after a refetch, which rebuilds every
 * object, the same comparison is false even where the value is unchanged, so a
 * legitimate revert is silently skipped and the unconfirmed value stays on
 * screen. Hence a structural comparison.
 *
 * A DROPPED REVERT IS NORMAL, NOT AN ERROR — the same discipline as a stale
 * response being inert rather than logged as a fault. It is not, however,
 * silence about the OUTCOME: the mutation still failed and the failure still has
 * to reach the user. Losing the revert must never mean losing the failure, and
 * this is the case where it most often does, because the row the failure would
 * have been shown on is exactly the one that disappeared.
 */

/** What one attempt wrote to one cache key, and what was there before. */
export interface OptimisticWrite {
  /** Stringified for diagnostics; the caller holds the real key. */
  readonly label: string;
  /** The value present before this attempt painted. */
  readonly previous: unknown;
  /** The value this attempt painted. */
  readonly painted: unknown;
  /**
   * Optional narrowing: compare only these top-level fields of the painted
   * value rather than the whole thing. For a caller whose updater genuinely
   * touches a subset.
   */
  readonly writtenFields?: readonly string[];
}

export type RevertVerdict =
  | { readonly action: 'revert'; readonly reason: 'still-ours' }
  | { readonly action: 'drop'; readonly reason: 'overwritten' }
  | { readonly action: 'drop'; readonly reason: 'entity-gone' };

/**
 * Structural equality to the depth the value reaches. Deliberately small and
 * local: pulling in a deep-equal dependency for this would make the predicate's
 * semantics someone else's decision, and the semantics are the technique.
 *
 * NaN is treated as equal to NaN (Object.is), because a painted NaN that is
 * still a NaN has not been overwritten — `===` would call it different and drop
 * a legitimate revert.
 */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => structurallyEqual(v, b[i]));
  }

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => Object.hasOwn(bo, k) && structurallyEqual(ao[k], bo[k]));
}

function pick(value: unknown, fields: readonly string[]): unknown {
  if (value === null || typeof value !== 'object') return value;
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = src[f];
  return out;
}

/**
 * Decide what to do with one recorded write, given what is in the cache NOW.
 *
 * `current === undefined` means the record has left the store between the paint
 * and the failure — a refetch dropped it, an identity eviction wiped it. An
 * entity that is GONE is also a newer truth: writing a snapshot back into a
 * store that no longer lists the record resurrects something the authority has
 * stopped acknowledging, and it would survive until the next full refetch.
 */
export function decideRevert(write: OptimisticWrite, current: unknown): RevertVerdict {
  if (current === undefined && write.painted !== undefined) {
    return { action: 'drop', reason: 'entity-gone' };
  }
  const a = write.writtenFields ? pick(current, write.writtenFields) : current;
  const b = write.writtenFields ? pick(write.painted, write.writtenFields) : write.painted;
  if (structurallyEqual(a, b)) return { action: 'revert', reason: 'still-ours' };
  return { action: 'drop', reason: 'overwritten' };
}
