/**
 * Store Registry - Explicit Store Dependency Management
 *
 * This module provides an explicit, type-safe way to manage Zustand store dependencies.
 * Instead of using lazy require() hacks to avoid circular dependencies, stores declare
 * their dependencies upfront and the registry handles initialization ordering.
 *
 * Benefits:
 * - Explicit dependency graph (no hidden runtime require())
 * - Compile-time type safety for cross-store access
 * - Automatic topological sorting for initialization order
 * - Acyclic dependency enforcement (throws at registration time)
 * - Easy testing (mock entire store subgraphs)
 * - Self-documenting dependency relationships
 *
 * @example
 * ```ts
 * // In store-registry-config.ts
 * import { createStoreRegistry } from './store-registry';
 *
 * export const storeRegistry = createStoreRegistry({
 *   stores: {
 *     session: { factory: createSessionStore, dependencies: [] },
 *     backlog: { factory: createBacklogStore, dependencies: [] },
 *     grid: { factory: createGridStore, dependencies: ['session', 'backlog'] },
 *     match: { factory: createMatchStore, dependencies: ['session', 'grid'] },
 *   }
 * });
 *
 * // Initialize all stores in correct order
 * await storeRegistry.initialize();
 *
 * // Access stores type-safely
 * const gridState = storeRegistry.getStore('grid').getState();
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Base interface for a Zustand-like store.
 */
export interface ZustandStore<State = unknown> {
  getState: () => State;
  setState: (partial: Partial<State> | ((state: State) => Partial<State>)) => void;
  subscribe: (listener: (state: State, prevState: State) => void) => () => void;
}

/**
 * Store factory function type.
 * Receives resolved dependencies and returns the store instance.
 */
export type StoreFactory<
  State,
  Deps extends Record<string, ZustandStore> = Record<string, never>
> = (dependencies: Deps) => ZustandStore<State>;

/**
 * Configuration for a single store in the registry.
 */
export interface StoreConfig<
  State = unknown,
  DepKeys extends string = string
> {
  /** Factory function to create the store */
  factory: StoreFactory<State, Record<DepKeys, ZustandStore>>;
  /** Array of store names this store depends on */
  dependencies: DepKeys[];
  /** Optional description for documentation */
  description?: string;
}

/**
 * Registry configuration containing all store definitions.
 */
export interface RegistryConfig<
  StoreMap extends Record<string, StoreConfig>
> {
  stores: StoreMap;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Infer the state type from a store config.
 */
type InferStoreState<T> = T extends StoreConfig<infer State, string> ? State : never;

/**
 * Result of dependency graph analysis.
 */
interface DependencyAnalysis {
  /** Topologically sorted store names (initialization order) */
  initializationOrder: string[];
  /** Map of store name to its direct dependencies */
  directDependencies: Map<string, Set<string>>;
  /** Map of store name to all transitive dependencies */
  transitiveDependencies: Map<string, Set<string>>;
  /** Detected cycles (empty if acyclic) */
  cycles: string[][];
}

// =============================================================================
// Store Registry Implementation
// =============================================================================

/**
 * Store Registry class that manages store lifecycle and dependencies.
 */
export class StoreRegistry<
  StoreMap extends Record<string, StoreConfig>
> {
  private config: RegistryConfig<StoreMap>;
  private stores: Map<string, ZustandStore> = new Map();
  private initialized: boolean = false;
  private analysis: DependencyAnalysis | null = null;

  constructor(config: RegistryConfig<StoreMap>) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate the registry configuration.
   * Checks for missing dependencies and cycles.
   */
  private validateConfig(): void {
    const storeNames = new Set(Object.keys(this.config.stores));

    // Check all dependencies exist
    for (const [storeName, storeConfig] of Object.entries(this.config.stores)) {
      for (const dep of storeConfig.dependencies) {
        if (!storeNames.has(dep)) {
          throw new Error(
            `Store "${storeName}" depends on unknown store "${dep}". ` +
            `Available stores: ${Array.from(storeNames).join(', ')}`
          );
        }
      }
    }

    // Analyze dependency graph
    this.analysis = this.analyzeDependencies();

    // Check for cycles
    if (this.analysis.cycles.length > 0) {
      const cycleDescriptions = this.analysis.cycles
        .map(cycle => cycle.join(' -> '))
        .join('\n  ');
      throw new Error(
        `Circular dependencies detected in store registry:\n  ${cycleDescriptions}\n` +
        `Please restructure your stores to eliminate circular dependencies.`
      );
    }

    if (this.config.debug) {
      console.log('Store Registry Configuration Valid');
      console.log('Initialization order:', this.analysis.initializationOrder.join(' -> '));
    }
  }

  /**
   * Analyze the dependency graph using Kahn's algorithm for topological sort.
   */
  private analyzeDependencies(): DependencyAnalysis {
    const storeNames = Object.keys(this.config.stores);
    const directDependencies = new Map<string, Set<string>>();
    const transitiveDependencies = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const name of storeNames) {
      const deps = new Set(this.config.stores[name].dependencies);
      directDependencies.set(name, deps);
      inDegree.set(name, deps.size);
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const initializationOrder: string[] = [];

    // Find all nodes with no dependencies
    inDegree.forEach((degree, name) => {
      if (degree === 0) {
        queue.push(name);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      initializationOrder.push(current);

      // For each store that depends on current, reduce its in-degree
      directDependencies.forEach((deps, name) => {
        if (deps.has(current)) {
          const newDegree = inDegree.get(name)! - 1;
          inDegree.set(name, newDegree);
          if (newDegree === 0) {
            queue.push(name);
          }
        }
      });
    }

    // Detect cycles (stores not in initialization order have cycles)
    const cycles: string[][] = [];
    if (initializationOrder.length !== storeNames.length) {
      // Find cycle using DFS
      const visited = new Set<string>();
      const recStack = new Set<string>();

      const findCycle = (node: string, path: string[]): string[] | null => {
        visited.add(node);
        recStack.add(node);

        const nodeDeps = directDependencies.get(node);
        const depsArray = nodeDeps ? Array.from(nodeDeps) : [];
        for (const dep of depsArray) {
          if (!visited.has(dep)) {
            const cycle = findCycle(dep, [...path, node]);
            if (cycle) return cycle;
          } else if (recStack.has(dep)) {
            // Found cycle
            const cycleStart = path.indexOf(dep);
            return [...path.slice(cycleStart), node, dep];
          }
        }

        recStack.delete(node);
        return null;
      };

      for (const name of storeNames) {
        if (!visited.has(name)) {
          const cycle = findCycle(name, []);
          if (cycle) {
            cycles.push(cycle);
          }
        }
      }
    }

    // Compute transitive dependencies
    for (const name of initializationOrder) {
      const transitive = new Set<string>();
      const direct = directDependencies.get(name)!;

      Array.from(direct).forEach(dep => {
        transitive.add(dep);
        // Add transitive deps of direct dep
        const depTransitive = transitiveDependencies.get(dep);
        if (depTransitive) {
          Array.from(depTransitive).forEach(t => {
            transitive.add(t);
          });
        }
      });

      transitiveDependencies.set(name, transitive);
    }

    return {
      initializationOrder,
      directDependencies,
      transitiveDependencies,
      cycles,
    };
  }

  /**
   * Initialize all stores in dependency order.
   */
  initialize(): void {
    if (this.initialized) {
      if (this.config.debug) {
        console.log('Store Registry already initialized');
      }
      return;
    }

    if (!this.analysis) {
      throw new Error('Registry not properly configured');
    }

    if (this.config.debug) {
      console.log('Initializing stores in order:', this.analysis.initializationOrder.join(' -> '));
    }

    for (const storeName of this.analysis.initializationOrder) {
      const storeConfig = this.config.stores[storeName];

      // Gather dependencies (already initialized at this point)
      const dependencies: Record<string, ZustandStore> = {};
      for (const depName of storeConfig.dependencies) {
        const depStore = this.stores.get(depName);
        if (!depStore) {
          throw new Error(
            `Internal error: Dependency "${depName}" not initialized for "${storeName}"`
          );
        }
        dependencies[depName] = depStore;
      }

      // Create the store
      const store = storeConfig.factory(dependencies);
      this.stores.set(storeName, store);

      if (this.config.debug) {
        console.log(`Initialized store: ${storeName}`);
      }
    }

    this.initialized = true;

    if (this.config.debug) {
      console.log('Store Registry initialization complete');
    }
  }

  /**
   * Get a store by name with type safety.
   */
  getStore<K extends keyof StoreMap & string>(
    name: K
  ): ZustandStore<InferStoreState<StoreMap[K]>> {
    if (!this.initialized) {
      throw new Error(
        `Store Registry not initialized. Call initialize() before accessing stores.`
      );
    }

    const store = this.stores.get(name);
    if (!store) {
      throw new Error(`Store "${name}" not found in registry`);
    }

    return store as ZustandStore<InferStoreState<StoreMap[K]>>;
  }

  /**
   * Get store state directly (convenience method).
   */
  getState<K extends keyof StoreMap & string>(
    name: K
  ): InferStoreState<StoreMap[K]> {
    return this.getStore(name).getState();
  }

  /**
   * Check if the registry is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the initialization order of stores.
   */
  getInitializationOrder(): string[] {
    return this.analysis?.initializationOrder ?? [];
  }

  /**
   * Get dependencies for a specific store.
   */
  getDependencies<K extends keyof StoreMap & string>(
    name: K,
    transitive: boolean = false
  ): string[] {
    if (!this.analysis) return [];

    const deps = transitive
      ? this.analysis.transitiveDependencies.get(name)
      : this.analysis.directDependencies.get(name);

    return deps ? Array.from(deps) : [];
  }

  /**
   * Get stores that depend on a specific store.
   */
  getDependents<K extends keyof StoreMap & string>(name: K): string[] {
    if (!this.analysis) return [];

    const dependents: string[] = [];
    this.analysis.directDependencies.forEach((deps, storeName) => {
      if (deps.has(name)) {
        dependents.push(storeName);
      }
    });
    return dependents;
  }

  /**
   * Generate a DOT graph representation for visualization.
   */
  toDotGraph(): string {
    if (!this.analysis) return '';

    const lines = ['digraph StoreRegistry {', '  rankdir=BT;'];

    this.analysis.directDependencies.forEach((deps, storeName) => {
      if (deps.size === 0) {
        lines.push(`  "${storeName}";`);
      } else {
        Array.from(deps).forEach(dep => {
          lines.push(`  "${storeName}" -> "${dep}";`);
        });
      }
    });

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Reset the registry (useful for testing).
   */
  reset(): void {
    this.stores.clear();
    this.initialized = false;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new store registry with the given configuration.
 */
export function createStoreRegistry<
  StoreMap extends Record<string, StoreConfig>
>(config: RegistryConfig<StoreMap>): StoreRegistry<StoreMap> {
  return new StoreRegistry(config);
}

// =============================================================================
// Convenience Types for Store Definitions
// =============================================================================

/**
 * Helper to define a store config with proper typing.
 */
export function defineStore<
  State,
  DepKeys extends string = never
>(config: StoreConfig<State, DepKeys>): StoreConfig<State, DepKeys> {
  return config;
}

/**
 * Helper type to extract store state type from registry.
 */
export type StoreState<
  Registry extends StoreRegistry<any>,
  Name extends string
> = Registry extends StoreRegistry<infer Map>
  ? Name extends keyof Map
    ? InferStoreState<Map[Name]>
    : never
  : never;
