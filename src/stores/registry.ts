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

import {
  createStoreRegistry,
  defineStore,
  type ZustandStore,
  type StoreConfig,
} from '@/lib/stores';

// =============================================================================
// Store State Types (for reference)
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
  'tier-store': [],
  'activity-store': [],
  'heatmap-store': [],
  'wiki-image-store': [],
  'filter-store': [],
  'inspector-store': [],
  'layout-store': [],
  'use-list-store': [],

  // Dependent stores
  'grid-store': ['session-store', 'backlog-store', 'validation-notification-store'],
  'match-store': ['session-store', 'grid-store', 'comparison-store'],
} as const;

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
}
