/**
 * Store Registry — the declared topology of this app's module-scoped stores.
 *
 * STORE_DEPENDENCIES below is the ONE authority on the store-name vocabulary and
 * on the edges between stores. Everything else about the graph is DERIVED from it:
 *
 *   - initialization order  -> getStoreInitializationOrder()  (Kahn's algorithm)
 *   - the picture           -> generateDependencyGraph()      (DOT)
 *   - docs/STORE_DEPENDENCY_GRAPH.md -> npm run docs:store-graph
 *
 * Nothing hand-writes the order, and no prose narrates the graph a second time —
 * two copies of a graph drift, and the drift is found by whoever extends it.
 *
 * The manifest is validated at module load (see the bottom of this file). It is
 * imported by src/providers/DeferredProviders.tsx, which the root layout renders
 * on every startup path, so the validation runs unasked rather than waiting for a
 * caller that never comes.
 *
 * Edges are real import edges, including the deferred ones: a `require()` inside
 * an action or a lazy accessor is still an edge — it has only moved from
 * evaluation time to call time, where no static tool can see it. Declaring it
 * here is how it stays visible.
 *
 * NOTES:
 * - grid-store reaches backlog-store and validation-notification-store through
 *   createLazyStoreAccessor (src/lib/stores/lazy-store-accessor.ts) because those
 *   may not be initialized when grid-store is first touched.
 * - match-store is the orchestrator; it coordinates the match-side stores.
 * - session-store owns persistence and session state.
 * - grid-store owns all drag-and-drop state.
 */

// =============================================================================
// Store Ownership Contracts
// =============================================================================
//
// Each store owns a specific domain of state. No two stores may write to the
// same domain. Cross-store reads use getState(); writes flow through the owning
// store's actions only.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ Store              │ Owns                        │ Persists To          │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ ranking-store      │ Canonical ranking array,     │ localStorage         │
// │                    │ item-to-tier assignments,    │ (persist middleware)  │
// │                    │ tier config & boundaries,    │                      │
// │                    │ bracket state, smart tiers   │                      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ grid-store         │ Drag-and-drop grid state,    │ localStorage         │
// │                    │ grid positions (GridItemType),│ (persist middleware)  │
// │                    │ per-list grid cache,         │                      │
// │                    │ mobile tap-to-place          │                      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ session-store      │ Session persistence,         │ localStorage +       │
// │                    │ normalized backlog data,     │ IndexedDB (offline)  │
// │                    │ session progress tracking    │                      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ match-store        │ UI orchestration (keyboard,  │ None (ephemeral)     │
// │                    │ modals, navigation), match   │                      │
// │                    │ session lifecycle            │                      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ backlog-store      │ Backlog group state,         │ None                 │
// │                    │ item usage tracking          │                      │
// └─────────────────────────────────────────────────────────────────────────┘
//
// SYNC RULES:
// - grid-store → session-store: derived sync via derived-session-sync subscriber
// - ranking-store: self-contained; tiers derive from ranking[] internally
// - match-store → grid-store, session-store: orchestrates via getState() calls
// - NO store may write tier assignments except ranking-store
// - NO store may mutate grid positions except grid-store
//

// =============================================================================
// Store Dependencies
// =============================================================================

/**
 * Documented store dependencies for the GOAT application.
 * This serves as the source of truth for store relationships.
 */
export const STORE_DEPENDENCIES = {
  // --- Leaves: no store-to-store edges -------------------------------------
  'activity-store': [],
  'audio-store': [],
  'collection-store': [],
  'comparison-store': [],
  'composition-modal-store': [],
  'consensus-store': [],
  'criteria-store': [],
  'debate-store': [],
  'drop-zone-highlight-store': [],
  'item-popup-store': [],   // Unified: floating popups + inspector mode
  'layout-store': [],
  'placement-store': [],
  'ranking-graph-store': [],
  'ranking-store': [],      // Unified ranking store (owns ranking, tiers, brackets)
  'selection-cursor': [],
  'studio-store': [],
  'undo-store': [],         // Command stack for Ctrl+Z undo/redo across drag ops
  'use-list-store': [],
  'validation-notification-store': [],
  'wiki-image-store': [],

  // --- Dependent stores -----------------------------------------------------
  // backlog/actions-items.ts imports the selection cursor directly.
  'backlog-store': ['selection-cursor'],

  // session-store: static import of selection-cursor, deferred require() of
  // backlog-store inside an action (session-store.ts).
  'session-store': ['backlog-store', 'selection-cursor'],

  // grid-store: all four edges are deferred (lazy accessor or in-action
  // require) precisely because grid-store is constructed early.
  'grid-store': [
    'backlog-store',
    'session-store',
    // Added 2026-08-25: handleMobileTapSlot records an undo step through
    // @/lib/undo/record-grid-change, which writes to undo-store. Declared here
    // because it is a real edge, reached by a deferred require() exactly like
    // the backlog-store one above.
    'undo-store',
    'use-list-store',
    'validation-notification-store',
  ],

  // match-store: the orchestrator, and the deepest node in the graph.
  'match-store': [
    'backlog-store',
    'comparison-store',
    'grid-store',
    'placement-store',
    'selection-cursor',
    'session-store',
    'undo-store',
    'use-list-store',
    'validation-notification-store',
  ],
} as const;

// =============================================================================
// Ownership Domain Enum (for assertions)
// =============================================================================

/**
 * Domains of state that stores own exclusively.
 * Used by dev-mode assertions to detect ownership violations.
 */
export const STORE_OWNERSHIP = {
  'ranking-store': ['ranking', 'tier-assignments', 'tier-config', 'tier-boundaries', 'bracket-state', 'smart-tiers'],
  'grid-store': ['grid-positions', 'drag-drop', 'grid-cache', 'mobile-tap-to-place'],
  'session-store': ['session-persistence', 'normalized-backlog', 'session-progress'],
  'match-store': ['match-ui', 'keyboard-navigation', 'match-lifecycle'],
  'backlog-store': ['backlog-groups', 'item-usage'],
} as const;

export type StoreOwnershipMap = typeof STORE_OWNERSHIP;

export type StoreName = keyof typeof STORE_DEPENDENCIES;

/** Every declared node name, in declaration order. */
export const STORE_NAMES = Object.keys(STORE_DEPENDENCIES) as StoreName[];

function depsOf(store: string): readonly string[] {
  return STORE_DEPENDENCIES[store as StoreName] ?? [];
}

/**
 * Topologically sort the declared graph with Kahn's algorithm: a dependency
 * always appears before the store that declares it.
 *
 * This is a DERIVATION of STORE_DEPENDENCIES, computed here at the point of use.
 * It is deliberately not a second hand-maintained list, and deliberately not a
 * sort by dependency COUNT — a count agrees with a topological order only while
 * the graph is shallow, then silently disagrees the first time a two-dependency
 * store must be built after a three-dependency one.
 *
 * @returns `{ order, cyclic }`. `cyclic` holds the nodes Kahn's could never
 *   drain, i.e. the nodes on or downstream of a cycle. It is empty for an
 *   acyclic graph, and `order` is then a full ordering of every declared node.
 */
export function topologicalSort(): { order: string[]; cyclic: string[] } {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const store of STORE_NAMES) {
    inDegree.set(store, 0);
    dependents.set(store, []);
  }

  for (const store of STORE_NAMES) {
    for (const dep of depsOf(store)) {
      if (!inDegree.has(dep)) continue; // dangling edge; validateManifest reports it
      inDegree.set(store, (inDegree.get(store) ?? 0) + 1);
      dependents.get(dep)!.push(store);
    }
  }

  // Seed with every node that depends on nothing, in declaration order so the
  // result is stable across runs rather than dependent on Map iteration luck.
  const queue: string[] = STORE_NAMES.filter((s) => inDegree.get(s) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const dependent of dependents.get(node) ?? []) {
      const remaining = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, remaining);
      if (remaining === 0) queue.push(dependent);
    }
  }

  const cyclic = STORE_NAMES.filter((s) => !order.includes(s));
  return { order, cyclic };
}

/**
 * Get the initialization order: every dependency before its dependents.
 * Throws if the declared graph is cyclic, because there is no such order then
 * and returning a partial one would be a lie a caller would trust.
 */
export function getStoreInitializationOrder(): string[] {
  const { order, cyclic } = topologicalSort();
  if (cyclic.length > 0) {
    throw new Error(
      `[store-registry] No initialization order exists: cycle through ${cyclic.join(', ')}`
    );
  }
  return order;
}

/**
 * Get all stores that a given store depends on (transitively).
 */
export function getTransitiveDependencies(storeName: keyof typeof STORE_DEPENDENCIES): string[] {
  const visited = new Set<string>();
  const queue = [...STORE_DEPENDENCIES[storeName]];

  while (queue.length > 0) {
    const dep = queue.shift()!;
    if (!visited.has(dep)) {
      visited.add(dep);
      const depDeps = STORE_DEPENDENCIES[dep as keyof typeof STORE_DEPENDENCIES] || [];
      queue.push(...depDeps);
    }
  }

  return Array.from(visited);
}

/**
 * Get all stores that depend on a given store.
 */
export function getStoreDependents(storeName: string): string[] {
  const dependents: string[] = [];

  for (const [store, deps] of Object.entries(STORE_DEPENDENCIES)) {
    if ((deps as readonly string[]).includes(storeName)) {
      dependents.push(store);
    }
  }

  return dependents;
}

/**
 * Find one concrete cycle in the declared graph, as a readable path.
 * Returns null when the graph is acyclic.
 */
export function findCycle(): string[] | null {
  const visited = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let found: string[] | null = null;

  const walk = (node: string): boolean => {
    visited.add(node);
    stack.push(node);
    onStack.add(node);

    for (const dep of depsOf(node)) {
      if (!(dep in STORE_DEPENDENCIES)) continue; // dangling; reported separately
      if (onStack.has(dep)) {
        found = [...stack.slice(stack.indexOf(dep)), dep];
        return true;
      }
      if (!visited.has(dep) && walk(dep)) return true;
    }

    stack.pop();
    onStack.delete(node);
    return false;
  };

  for (const store of STORE_NAMES) {
    if (!visited.has(store) && walk(store)) return found;
  }
  return null;
}

/** Kept for callers that only want the yes/no answer. */
export function validateNoCycles(): boolean {
  return findCycle() === null;
}

/**
 * Validate the manifest itself. A manifest that tolerates a dependency on a
 * name it never declared validates nothing — it will happily report a clean
 * graph over a renamed or deleted store.
 *
 * @returns the list of problems; empty means the manifest is internally sound.
 */
export function validateManifest(): string[] {
  const problems: string[] = [];

  for (const store of STORE_NAMES) {
    const seen = new Set<string>();
    for (const dep of depsOf(store)) {
      if (!(dep in STORE_DEPENDENCIES)) {
        problems.push(`"${store}" depends on "${dep}", which is not a declared store`);
      }
      if (dep === store) {
        problems.push(`"${store}" declares itself as its own dependency`);
      }
      if (seen.has(dep)) {
        problems.push(`"${store}" declares "${dep}" more than once`);
      }
      seen.add(dep);
    }
  }

  const cycle = findCycle();
  if (cycle) {
    problems.push(`circular dependency: ${cycle.join(' -> ')}`);
  }

  return problems;
}

/**
 * Generate a DOT graph for visualization.
 * Use with Graphviz or online DOT viewers.
 */
export function generateDependencyGraph(): string {
  const lines = [
    'digraph StoreDependencies {',
    '  rankdir=BT;',
    '  node [shape=box, style=rounded];',
    '',
    '  // Base stores (no dependencies)',
  ];

  // Add base stores
  for (const [store, deps] of Object.entries(STORE_DEPENDENCIES)) {
    if (deps.length === 0) {
      lines.push(`  "${store}" [fillcolor=lightgreen, style="rounded,filled"];`);
    }
  }

  lines.push('');
  lines.push('  // Dependencies');

  // Add edges
  for (const [store, deps] of Object.entries(STORE_DEPENDENCIES)) {
    for (const dep of deps) {
      lines.push(`  "${store}" -> "${dep}";`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

// =============================================================================
// Runtime Validation (Development Only)
// =============================================================================

// This block is the whole point of the file, and it only means anything because
// something imports this module: src/providers/DeferredProviders.tsx, which the
// root layout renders on every startup path. An assertion in a module nothing
// imports is documentation that reviewers mistake for enforcement.

const manifestProblems = validateManifest();

if (manifestProblems.length > 0) {
  const report = [
    'Store registry manifest is invalid:',
    ...manifestProblems.map((p) => `  - ${p}`),
    'Fix STORE_DEPENDENCIES in src/stores/registry.ts.',
  ].join('\n');

  if (process.env.NODE_ENV === 'development') {
    // A cyclic or dangling singleton graph is not a degraded state the app can
    // proceed from, and the failure is cheapest at the earliest possible frame.
    throw new Error(report);
  }
  // In production the same check reports rather than throws: the graph is
  // already baked into the shipped bundle, and taking the app down over it
  // helps nobody.
  console.error(report);
}

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Enable store sync drift assertions (lazy — waits for stores to initialize).
  // Deferred so we do not pull the stores in before they exist.
  setTimeout(() => {
    void import('./dev-sync-assertions').then(({ enableSyncDriftAssertions }) => {
      enableSyncDriftAssertions();
    });
  }, 3000);
}
