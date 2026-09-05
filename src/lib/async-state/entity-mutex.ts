/**
 * Per-entity mutation mutex, and the keys that address it.
 *
 * Registry: client-state/optimistic-write-path ("serialize per entity"),
 * client-state/status-fsms ("key the machine by what runs concurrently").
 *
 * WHY THIS EXISTS
 * ---------------
 * `useOptimisticMutation` implemented the naive recipe: snapshot the whole
 * query, patch it, and on failure write the snapshot back unconditionally. That
 * is correct in a demonstration and wrong under two operations every real
 * interface performs.
 *
 * TWO RAPID ACTIONS ON ONE ENTITY. The user toggles a row and toggles it again
 * before the first request lands. Attempt A snapshots the settled value and
 * paints its own; attempt B snapshots *A's unconfirmed paint* and paints on top.
 * A fails: its rollback restores the pre-A value and discards B's paint while B
 * is still in flight. Or B fails first: its rollback restores A's optimistic
 * value — a value the authority never agreed to and, if A also fails, never
 * will. A snapshot only means anything when it is the SETTLED state, and under
 * overlap it is not.
 *
 * The mutex makes overlapping snapshots stop existing rather than be detected
 * after the fact: at most one in-flight mutation per entity identity, and the
 * WHOLE attempt is inside the critical section — snapshot, paint, request,
 * settle. Splitting the paint out to keep the interface responsive reintroduces
 * exactly the overlap this exists to prevent.
 */

/**
 * The separator used to build a composite operation key.
 *
 * A key built as "family + separator + identity" collides the moment either
 * component can contain the separator — two different (family, identity) pairs
 * producing one string, and the collision corrupts a DIFFERENT entity's
 * lifecycle, which is among the hardest defects to trace back. The invariant is
 * enforced at the single key-construction site below, not by hoping identifier
 * schemes stay clean.
 *
 * NUL is the separator because no identifier scheme this app uses can contain
 * one, which makes the guard below belt-and-braces rather than the only
 * defence. It is written as an ESCAPE, never as a literal byte: a raw NUL in a
 * source file makes git and grep treat the whole file as binary. That is how
 * the first version of this constant landed, and how it was caught — `git grep`
 * reported "Binary file ... matches" while the key tests failed with an
 * assertion whose two sides printed identically.
 */
const KEY_SEPARATOR = '\u0000';

/**
 * Build a composite operation key. Throws rather than producing a colliding
 * key: refusing loudly is the whole point, and a caller that cannot supply a
 * clean identity has a bug this is surfacing.
 */
export function makeOperationKey(family: string, identity: string): string {
  if (family.includes(KEY_SEPARATOR) || identity.includes(KEY_SEPARATOR)) {
    throw new Error(
      `[entity-mutex] refusing to build a key: "${family}" / "${identity}" contains the ` +
        `reserved separator. Two different (family, identity) pairs would produce one key, ` +
        `and the collision would corrupt a different entity's lifecycle.`,
    );
  }
  if (!family || !identity) {
    throw new Error(
      `[entity-mutex] refusing to build a key from an empty component ` +
        `(family="${family}", identity="${identity}"). A partial key addresses more than one ` +
        `entry, and picking whichever match enumeration order yields completes the WRONG ` +
        `lifecycle, silently.`,
    );
  }
  return `${family}${KEY_SEPARATOR}${identity}`;
}

/** A held slot. The lease knows whether it is still the owner. */
export interface MutexLease {
  readonly key: string;
  readonly token: number;
  /**
   * False once the slot has been reclaimed from under this lease — by the
   * timeout reaper, or by an eviction. An attempt that discovers it no longer
   * owns anything must stay inert rather than write.
   */
  isHeld(): boolean;
  /**
   * Release the slot, but ONLY if this lease is still the holder. Without that
   * check an abandoned or superseded holder clears the slot out from under its
   * successor, and two mutations proceed concurrently in precisely the case the
   * mutex was built for.
   */
  release(): void;
}

interface Slot {
  token: number;
  /** Resolves when the current holder settles. Never REJECTS — see below. */
  settled: Promise<void>;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface EntityMutexOptions {
  /**
   * How long a holder may keep a slot before it is reclaimed. A slot whose
   * holder never settles wedges that entity permanently, so the holder names
   * its reaper. Default 30s: long enough for any request this app makes,
   * short enough that a wedged entity recovers within one user's patience.
   */
  leaseTimeoutMs?: number;
}

const DEFAULT_LEASE_TIMEOUT_MS = 30_000;

export function createEntityMutex(options: EntityMutexOptions = {}) {
  const leaseTimeoutMs = options.leaseTimeoutMs ?? DEFAULT_LEASE_TIMEOUT_MS;
  const slots = new Map<string, Slot>();
  let nextToken = 1;

  function reclaim(key: string, token: number) {
    const slot = slots.get(key);
    if (slot && slot.token === token) slots.delete(key);
  }

  return {
    /**
     * Wait for the entity to be free, then take it. The returned lease must be
     * released in a `finally`.
     *
     * THE SECOND ACTION WAITS; IT IS NOT DROPPED. A discarded toggle reads as a
     * broken control and the user presses it again. Where a later action
     * genuinely supersedes an earlier one, coalescing is legitimate — but that
     * is a decision taken per operation kind with the reason recorded, not a
     * default, so this queue does not make it.
     */
    async acquire(key: string): Promise<MutexLease> {
      // WAITING ON A PREDECESSOR IS NOT INHERITING ITS FAILURE. The chain is
      // built from a promise that never rejects, so a failed predecessor cannot
      // turn one failed write into a run of failures on unrelated intents.
      const previous = slots.get(key)?.settled;
      if (previous) await previous;

      const token = nextToken++;
      let settle!: () => void;
      const settled = new Promise<void>((resolve) => {
        settle = resolve;
      });

      const timer = setTimeout(() => {
        // The reaper. The abandoned attempt discovers on settlement that it no
        // longer owns anything and stays inert.
        reclaim(key, token);
        settle();
      }, leaseTimeoutMs);

      slots.set(key, { token, settled, timer });

      let released = false;
      return {
        key,
        token,
        isHeld: () => slots.get(key)?.token === token,
        release: () => {
          if (released) return;
          released = true;
          const slot = slots.get(key);
          // Only if we still own it.
          if (slot && slot.token === token) {
            if (slot.timer) clearTimeout(slot.timer);
            slots.delete(key);
          }
          if (timer) clearTimeout(timer);
          settle();
        },
      };
    },

    /**
     * Drop every slot. An identity eviction clears the whole register at once,
     * which is the second and more common way a settling attempt finds itself
     * unowned — and the reason the ownership check on release is not optional
     * even where nothing ever times out.
     */
    evictAll(): void {
      slots.forEach((slot) => {
        if (slot.timer) clearTimeout(slot.timer);
      });
      slots.clear();
    },

    /** For assertions and instrumentation only. */
    heldKeys(): string[] {
      return Array.from(slots.keys());
    },
  };
}

/**
 * The process-wide mutex used by useOptimisticMutation.
 *
 * A module singleton on purpose: the thing being serialized is writes to a
 * shared query cache, and a per-hook-instance mutex would let two components
 * mutating the same entity proceed concurrently — which is the defect, not a
 * scoping preference.
 */
export const optimisticEntityMutex = createEntityMutex();
