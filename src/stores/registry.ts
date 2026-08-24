/**
 * Store Registry Configuration
 *
 * This file documents and configures the explicit store dependency graph.
 * It replaces the hidden require() hacks with a clear, type-safe dependency declaration.
 *
 * DEPENDENCY GRAPH:
 * =================
 *
 * comparison-store (no dependencies)
 *       ^
 *       |
 * session-store (no dependencies)
 *       ^
 *       |
 * backlog-store (no dependencies)
 *       ^
 *       |
 * validation-notification-store (no dependencies)
 *       ^
 *       |
 * grid-store -----> session-store
 *    |              backlog-store (lazy accessor)
 *    |              validation-notification-store (lazy accessor)
 *    v
 * match-store ----> session-store
 *                   grid-store
 *                   comparison-store
 *
 * INITIALIZATION ORDER (topological sort):
 * 1. comparison-store
 * 2. session-store
 * 3. backlog-store
 * 4. validation-notification-store
 * 5. grid-store
 * 6. match-store
 *
 * NOTES:
 * - grid-store uses lazy accessors for backlog-store and validation-notification-store
 *   because these may not be initialized when grid-store is first accessed
 * - match-store is the "orchestrator" that coordinates all stores
 * - session-store owns persistence and session state
 * - grid-store owns all drag-and-drop state
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
  // Base stores (no dependencies)
  'comparison-store': [],
  'session-store': [],
  'backlog-store': [],
  'validation-notification-store': [],
  'consensus-store': [],
  'activity-store': [],
  'heatmap-store': [],
  'wiki-image-store': [],
  'item-popup-store': [],  // Unified: floating popups + inspector mode
  'layout-store': [],
  'use-list-store': [],
  'ranking-store': [],  // Unified ranking store (owns ranking, tiers, brackets)
  'undo-store': [],     // Command stack for Ctrl+Z undo/redo across drag operations

  // Dependent stores
  'grid-store': ['session-store', 'backlog-store', 'validation-notification-store'],
  'match-store': ['session-store', 'grid-store', 'comparison-store', 'undo-store'],
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

/**
 * Get the initialization order based on dependency analysis.
 * Stores with no dependencies come first, then dependent stores.
 */
export function getStoreInitializationOrder(): string[] {
  const noDeps: string[] = [];
  const withDeps: string[] = [];

  for (const [store, deps] of Object.entries(STORE_DEPENDENCIES)) {
    if (deps.length === 0) {
      noDeps.push(store);
    } else {
      withDeps.push(store);
    }
  }

  // Sort dependent stores by their dependency depth
  // (simple heuristic: grid before match since match depends on grid)
  const sortedWithDeps = withDeps.sort((a, b) => {
    const aDeps = STORE_DEPENDENCIES[a as keyof typeof STORE_DEPENDENCIES];
    const bDeps = STORE_DEPENDENCIES[b as keyof typeof STORE_DEPENDENCIES];
    return aDeps.length - bDeps.length;
  });

  return [...noDeps, ...sortedWithDeps];
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
 * Validate that there are no circular dependencies.
 * Returns true if the graph is acyclic.
 */
export function validateNoCycles(): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const hasCycle = (node: string): boolean => {
    visited.add(node);
    recStack.add(node);

    const deps = STORE_DEPENDENCIES[node as keyof typeof STORE_DEPENDENCIES] || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true;
      } else if (recStack.has(dep)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  };

  for (const store of Object.keys(STORE_DEPENDENCIES)) {
    if (!visited.has(store)) {
      if (hasCycle(store)) return false;
    }
  }

  return true;
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

if (process.env.NODE_ENV === 'development') {
  // Validate dependency graph on module load
  if (!validateNoCycles()) {
    console.error('CRITICAL: Circular dependencies detected in store registry!');
    console.error('Run generateDependencyGraph() to visualize the dependency graph.');
  }

  // Enable store sync drift assertions (lazy — waits for stores to initialize)
  if (typeof window !== 'undefined') {
    // Defer to avoid importing stores before they exist
    setTimeout(() => {
      import('./dev-sync-assertions').then(({ enableSyncDriftAssertions }) => {
        enableSyncDriftAssertions();
      });
    }, 3000);
  }
}
