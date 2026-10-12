/**
 * Tests for the store-registry manifest and its derivations.
 *
 * The registry module (`./registry`) runs `validateManifest()` at module load
 * and throws when NODE_ENV === 'development'. Under vitest NODE_ENV is 'test',
 * so that throw does NOT fire here — these tests call the validator directly
 * instead, which is why "the committed manifest is internally sound" below is
 * an explicit assertion rather than something inherited from the import.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by two coarse mutations of STORE_DEPENDENCIES in registry.ts,
 * neither of which the module can normalize away. Counts are what was measured,
 * not what was expected:
 *
 *   1. `'activity-store': ['no-such-store']` — a dangling edge.
 *      1 of 21 red: "the committed manifest is internally sound". (The
 *      correspondence test stays green by design — both validators see the same
 *      defect and agree, which is the property it exists to check.)
 *   2. `'selection-cursor': ['match-store']` — a cycle.
 *      8 of 21 red, across soundness, acyclicity, the initialization order and
 *      the DOT emission.
 *
 * Both were restored; `npm test` returned to 79 passing. Re-running either is a
 * one-line edit in registry.ts.
 */

import { describe, expect, it } from 'vitest';

import {
  STORE_DEPENDENCIES,
  STORE_NAMES,
  findCycle,
  generateDependencyGraph,
  getStoreDependents,
  getStoreInitializationOrder,
  getTransitiveDependencies,
  topologicalSort,
  validateManifest,
  validateNoCycles,
  type StoreName,
} from './registry';

// ---------------------------------------------------------------------------
// A reusable validator over an ARBITRARY graph.
//
// `validateManifest()` closes over the committed STORE_DEPENDENCIES, so it can
// only ever be asked one question. To prove the *rules* it encodes — dangling
// edge, self-edge, duplicate edge, cycle — the same rules are restated here
// over an injectable graph, and the committed manifest is then checked to
// produce the identical verdict. That correspondence is asserted at the bottom
// of this file, so the two implementations cannot silently drift apart.
// ---------------------------------------------------------------------------

type Graph = Record<string, readonly string[]>;

function validateGraph(graph: Graph): string[] {
  const problems: string[] = [];
  const names = Object.keys(graph);

  for (const store of names) {
    const seen = new Set<string>();
    for (const dep of graph[store]) {
      if (!(dep in graph)) {
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

  const cycle = findCycleIn(graph);
  if (cycle) problems.push(`circular dependency: ${cycle.join(' -> ')}`);

  return problems;
}

function findCycleIn(graph: Graph): string[] | null {
  const visited = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let found: string[] | null = null;

  const walk = (node: string): boolean => {
    visited.add(node);
    stack.push(node);
    onStack.add(node);
    for (const dep of graph[node] ?? []) {
      if (!(dep in graph)) continue;
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

  for (const node of Object.keys(graph)) {
    if (!visited.has(node) && walk(node)) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The rules the manifest validator claims to enforce
// ---------------------------------------------------------------------------

describe('manifest validation rules', () => {
  it('accepts a sound graph', () => {
    expect(validateGraph({ a: [], b: ['a'], c: ['a', 'b'] })).toEqual([]);
  });

  it('rejects an edge to an undeclared store', () => {
    const problems = validateGraph({ a: [], b: ['ghost-store'] });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('ghost-store');
    expect(problems[0]).toContain('not a declared store');
  });

  it('rejects a self-edge', () => {
    const problems = validateGraph({ a: ['a'] });
    expect(problems).toContain('"a" declares itself as its own dependency');
  });

  it('rejects a duplicated edge', () => {
    const problems = validateGraph({ a: [], b: ['a', 'a'] });
    expect(problems).toContain('"b" declares "a" more than once');
  });

  it('reports a cycle as a readable path that closes on itself', () => {
    const problems = validateGraph({ a: ['c'], b: ['a'], c: ['b'] });
    const cyclic = problems.filter((p) => p.startsWith('circular dependency'));
    expect(cyclic).toHaveLength(1);
    // The path must close: first node repeated at the end, so a reader can see
    // the loop rather than a bare set of names.
    const path = cyclic[0].replace('circular dependency: ', '').split(' -> ');
    expect(path[0]).toBe(path[path.length - 1]);
    expect(path.length).toBeGreaterThan(1);
  });

  it('reports every problem, not just the first', () => {
    const problems = validateGraph({ a: ['a', 'ghost', 'ghost'] });
    expect(problems.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// The committed manifest
// ---------------------------------------------------------------------------

describe('the committed manifest', () => {
  it('is internally sound', () => {
    // The failure message carries the problems, so a red run names the defect
    // rather than only its count.
    expect(validateManifest()).toEqual([]);
  });

  it('agrees with the independently-restated rules', () => {
    // Guards against the in-file reimplementation above drifting from the
    // production validator: both must reach the same verdict on the same graph.
    expect(validateGraph(STORE_DEPENDENCIES as unknown as Graph)).toEqual(validateManifest());
  });

  it('is acyclic', () => {
    expect(findCycle()).toBeNull();
    expect(validateNoCycles()).toBe(true);
  });

  it('declares every store exactly once, with a non-empty vocabulary', () => {
    expect(STORE_NAMES.length).toBeGreaterThan(0);
    expect(new Set(STORE_NAMES).size).toBe(STORE_NAMES.length);
  });
});

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

describe('getStoreInitializationOrder', () => {
  it('covers every declared store exactly once', () => {
    const order = getStoreInitializationOrder();
    expect(order).toHaveLength(STORE_NAMES.length);
    expect(new Set(order)).toEqual(new Set<string>(STORE_NAMES));
  });

  it('places every dependency before its dependent', () => {
    const order = getStoreInitializationOrder();
    const index = new Map(order.map((name, i) => [name, i]));
    const violations: string[] = [];
    for (const store of STORE_NAMES) {
      for (const dep of STORE_DEPENDENCIES[store] as readonly string[]) {
        if (index.get(dep)! > index.get(store)!) {
          violations.push(`${dep} (${index.get(dep)}) must precede ${store} (${index.get(store)})`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('is stable across calls', () => {
    expect(getStoreInitializationOrder()).toEqual(getStoreInitializationOrder());
  });
});

describe('topologicalSort', () => {
  it('drains the whole graph, leaving nothing cyclic', () => {
    const { order, cyclic } = topologicalSort();
    expect(cyclic).toEqual([]);
    expect(order).toHaveLength(STORE_NAMES.length);
  });
});

describe('getTransitiveDependencies', () => {
  it('closes over indirect edges', () => {
    // match-store -> session-store -> backlog-store -> selection-cursor
    const deps = getTransitiveDependencies('match-store');
    expect(deps).toContain('session-store');
    expect(deps).toContain('backlog-store');
    expect(deps).toContain('selection-cursor');
  });

  it('returns nothing for a leaf', () => {
    expect(getTransitiveDependencies('selection-cursor')).toEqual([]);
  });

  it('never includes the store itself (the graph is acyclic)', () => {
    for (const store of STORE_NAMES) {
      expect(getTransitiveDependencies(store)).not.toContain(store);
    }
  });
});

describe('getStoreDependents', () => {
  it('is the exact inverse of the declared edges', () => {
    for (const candidate of STORE_NAMES) {
      const expected = STORE_NAMES.filter((s) =>
        (STORE_DEPENDENCIES[s] as readonly string[]).includes(candidate),
      );
      expect(getStoreDependents(candidate).sort()).toEqual([...expected].sort());
    }
  });

  it('returns an empty list for a name nothing depends on', () => {
    expect(getStoreDependents('not-a-store')).toEqual([]);
  });
});

describe('generateDependencyGraph', () => {
  it('emits one DOT edge per declared edge, and nothing more', () => {
    const dot = generateDependencyGraph();
    const emitted = dot
      .split('\n')
      .filter((line) => line.includes('->'))
      .map((line) => line.trim());
    const declared = STORE_NAMES.flatMap((store) =>
      (STORE_DEPENDENCIES[store] as readonly string[]).map(
        (dep) => `"${store}" -> "${dep}";`,
      ),
    );
    expect(emitted.sort()).toEqual(declared.sort());
  });

  it('names every declared store somewhere in the output', () => {
    const dot = generateDependencyGraph();
    const missing = STORE_NAMES.filter((s: StoreName) => !dot.includes(`"${s}"`));
    expect(missing).toEqual([]);
  });
});
