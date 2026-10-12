/**
 * The versioned persistence contract for `grid-store`.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Persisted state is a message to a future version of the app — one running
 * code that does not exist yet. Until 2026-08-24 this store persisted 6 fields
 * with `partialize` and declared no `version:` and no `migrate:`, while
 * hand-rolling a real shape migration inside `onRehydrateStorage`. That
 * arrangement works exactly once. It has three defects the moment a second
 * shape change arrives:
 *
 *   1. A payload cannot say what version it is, so every future migration has
 *      to re-sniff the shape ("does this item have a `context` key?") and the
 *      sniffing gets more ambiguous with each step.
 *   2. There is nowhere to append step 2. The existing code is one block that
 *      runs on every hydration forever, including on payloads it has already
 *      migrated.
 *   3. A payload from the FUTURE — written by a newer build, after a rollback
 *      or on a synced profile — is silently treated as current and partially
 *      adopted.
 *
 * The chain below fixes all three. It is deliberately separate from the store
 * module and free of zustand, React and storage APIs, so each step can be
 * tested against a literal payload. See ./grid-store-migrations.test.ts.
 *
 * APPENDING A STEP
 * ----------------
 * Migrations are append-only history. A shipped step is FROZEN — it describes
 * a shape that exists in the field, and editing it breaks the installations
 * still holding that shape. To change the persisted shape:
 *
 *   1. bump GRID_STORE_PERSIST_VERSION
 *   2. add `migrateNtoN1` and register it in MIGRATION_STEPS
 *   3. add tests, including a payload written by a BUGGY release of version N
 *
 * Registry: client-state/persistence-and-migration.
 */

/**
 * Current shape version.
 *
 * Version 0 is "everything written before 2026-08-24" — zustand's persist
 * middleware reports a stored payload with no `version` field as version 0,
 * which is why introducing this chain strands nothing: every existing
 * localStorage payload routes through step 0->1 on its next load.
 */
export const GRID_STORE_PERSIST_VERSION = 1;

/** Loose view of a persisted grid item; the field of payloads is not typed. */
interface LooseGridItem {
  context?: { source?: string; matched?: boolean } | null;
  item?: unknown;
  /** Pre-v1 shape carried `matched` at the top level instead of in `context`. */
  matched?: boolean;
  [key: string]: unknown;
}

interface LooseCacheEntry {
  gridItems?: unknown;
  [key: string]: unknown;
}

/** The persisted slice, as loosely as it must be read. */
export interface PersistedGridState {
  gridItems?: unknown;
  maxGridSize?: unknown;
  gridStatistics?: unknown;
  currentListId?: unknown;
  listGridCache?: unknown;
  listGridCacheOrder?: unknown;
  [key: string]: unknown;
}

/**
 * Give every grid item a `context` envelope.
 *
 * TOTAL over its input version by construction: it handles items that already
 * have a context (left alone), items with the pre-v1 top-level `matched`
 * boolean, and items with neither — including ones written by buggy releases
 * of version 0, which is what the defensive defaults are for. The field
 * contains every bug ever shipped.
 */
function addContextEnvelope(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  return items.map((raw) => {
    if (raw === null || typeof raw !== 'object') return raw;
    const item = raw as LooseGridItem;
    if (item.context && typeof item.context === 'object') return item;
    return {
      ...item,
      context: {
        source: 'grid',
        matched: typeof item.matched === 'boolean' ? item.matched : item.item != null,
      },
    };
  });
}

/**
 * v0 -> v1. FROZEN — shipped 2026-08-24. Do not edit; append instead.
 *
 * This is the migration that used to live inline in `onRehydrateStorage`,
 * lifted out unchanged in behaviour and made addressable by version.
 */
function migrate0to1(persisted: PersistedGridState): PersistedGridState {
  const next: PersistedGridState = { ...persisted };

  next.gridItems = addContextEnvelope(next.gridItems);

  if (next.listGridCache && typeof next.listGridCache === 'object') {
    const cache = next.listGridCache as Record<string, LooseCacheEntry>;
    const migratedCache: Record<string, LooseCacheEntry> = {};
    for (const [listId, entry] of Object.entries(cache)) {
      migratedCache[listId] =
        entry && typeof entry === 'object'
          ? { ...entry, gridItems: addContextEnvelope(entry.gridItems) }
          : entry;
    }
    next.listGridCache = migratedCache;
  } else {
    next.listGridCache = {};
  }

  // The LRU order was added after the cache itself, so v0 payloads may hold a
  // cache with no order. Reconstructing from the keys is lossy about recency
  // and deliberately so: an arbitrary-but-complete order evicts the wrong
  // entry at worst, whereas a missing order breaks eviction entirely.
  if (!Array.isArray(next.listGridCacheOrder)) {
    next.listGridCacheOrder = Object.keys(next.listGridCache as Record<string, unknown>);
  }

  return next;
}

/** Ordered chain. Index i transforms version i into version i+1. */
const MIGRATION_STEPS: ((state: PersistedGridState) => PersistedGridState)[] = [migrate0to1];

export interface MigrationOutcome {
  state: PersistedGridState | null;
  /**
   * What happened, for the caller to log. A reset must be distinguishable from
   * a first run: "your grid was reset" and "welcome" are different facts.
   */
  outcome: 'current' | 'migrated' | 'from-future' | 'unusable';
  detail: string;
}

/**
 * Route a persisted payload to the current shape.
 *
 * Never throws. A payload that cannot be rescued yields null plus a diagnostic
 * and the store falls back to its defaults — a corrupt payload that prevented
 * launch would convert a data problem into an unrecoverable product problem,
 * because the payload survives the restart the user will try.
 */
export function migrateGridState(persisted: unknown, version: number): MigrationOutcome {
  if (persisted === null || typeof persisted !== 'object' || Array.isArray(persisted)) {
    return {
      state: null,
      outcome: 'unusable',
      detail: `persisted grid payload was ${
        Array.isArray(persisted) ? 'an array' : typeof persisted
      }, not an object; falling back to defaults`,
    };
  }

  if (!Number.isInteger(version) || version < 0) {
    return {
      state: null,
      outcome: 'unusable',
      detail: `persisted grid payload declared version ${String(version)}, which is not a version; falling back to defaults`,
    };
  }

  // A payload from the future was written by a build that knows more than this
  // one. Preserve-and-default: run on defaults now and leave the stored payload
  // alone, so the newer version still finds its data. "Migrating" it downward
  // would destroy fields this code cannot even name.
  if (version > GRID_STORE_PERSIST_VERSION) {
    return {
      state: null,
      outcome: 'from-future',
      detail:
        `persisted grid payload is version ${version}, newer than this build's ` +
        `${GRID_STORE_PERSIST_VERSION}. Running on defaults and leaving the stored ` +
        `payload untouched for the version that wrote it.`,
    };
  }

  if (version === GRID_STORE_PERSIST_VERSION) {
    return { state: persisted as PersistedGridState, outcome: 'current', detail: '' };
  }

  let state = persisted as PersistedGridState;
  try {
    for (let v = version; v < GRID_STORE_PERSIST_VERSION; v++) {
      state = MIGRATION_STEPS[v](state);
    }
  } catch (err) {
    return {
      state: null,
      outcome: 'unusable',
      detail: `grid migration from version ${version} threw: ${String(
        (err as Error)?.message ?? err,
      )}; falling back to defaults`,
    };
  }

  return {
    state,
    outcome: 'migrated',
    detail: `grid payload migrated ${version} -> ${GRID_STORE_PERSIST_VERSION}`,
  };
}
