// @vitest-environment jsdom
/**
 * collection-store — selector stability and tree shape.
 *
 * zustand 5 reads selectors through useSyncExternalStore, which re-renders a
 * component whenever the selected snapshot is not `Object.is`-equal to the
 * previous one. A selector that builds a fresh object or array on every call
 * therefore never settles: React re-renders, the selector returns another new
 * reference, React re-renders again, until it throws "Maximum update depth
 * exceeded". Three live consumers (CollectionSidebar, CollectionsDashboard,
 * QuickCollectionSwitcher on /my-collections) read the selectors under test.
 *
 * Negative control (recorded 2026-09-05, scan-sweep backlog-content-management):
 * against the pre-fix selectors — plain object literals and a `buildTree()` call
 * inside the selector — the three "renders once" cases below failed with
 * "Maximum update depth exceeded" thrown from React; they went green once the
 * object selectors were wrapped in useShallow and the tree became a memoised
 * derivation keyed on its inputs.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  useCollectionActions,
  useCollectionStore,
  useCollectionTree,
  useCollectionUIState,
} from './collection-store';

import type { ListCollection } from '@/types/collection';

function collection(id: string, parentId: string | null, order: number): ListCollection {
  return {
    id,
    name: id,
    parentId,
    order,
    listIds: [],
    userId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as ListCollection;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  useCollectionStore.getState().resetStore();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mountCounting(Hook: () => unknown): { renders: () => number } {
  let renders = 0;
  function Probe() {
    renders += 1;
    Hook();
    return null;
  }
  act(() => root.render(<Probe />));
  return { renders: () => renders };
}

describe('collection-store selectors settle under useSyncExternalStore', () => {
  it('useCollectionActions renders once', () => {
    const { renders } = mountCounting(() => useCollectionActions());
    expect(renders()).toBe(1);
  });

  it('useCollectionUIState renders once and re-renders once per relevant change', () => {
    const { renders } = mountCounting(() => useCollectionUIState());
    expect(renders()).toBe(1);
    act(() => useCollectionStore.getState().setIsLoading(true));
    expect(renders()).toBe(2);
    // An unrelated write must not re-render a shallow-equal projection.
    act(() => useCollectionStore.getState().setCollectionStats('x', {
      listCount: 0, totalItems: 0, completedLists: 0, lastActivity: null,
    }));
    expect(renders()).toBe(2);
  });

  it('useCollectionTree renders once and returns a stable reference for unchanged inputs', () => {
    act(() => useCollectionStore.getState().setCollections([
      collection('a', null, 0),
      collection('b', 'a', 0),
    ]));
    let seen: unknown[] = [];
    const { renders } = mountCounting(() => { seen.push(useCollectionTree()); });
    expect(renders()).toBe(1);
    act(() => useCollectionStore.getState().setIsSyncing(true));
    // Same inputs (collections, expanded set) -> same tree reference -> no re-render.
    expect(renders()).toBe(1);
    act(() => useCollectionStore.getState().toggleCollectionExpanded('a'));
    expect(renders()).toBe(2);
    expect(seen[0]).not.toBe(seen[1]);
    seen = [];
  });
});

describe('buildTree depth', () => {
  it('assigns depth from the parent chain regardless of array order', () => {
    // Child listed BEFORE its parent: the pre-fix single pass read the parent's
    // depth while it was still 0, so the grandchild landed at depth 1.
    useCollectionStore.getState().setCollections([
      collection('grandchild', 'child', 0),
      collection('child', 'root', 0),
      collection('root', null, 0),
    ]);
    const tree = useCollectionStore.getState().getCollectionTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
    expect(tree[0].children[0].children[0].depth).toBe(2);
  });
});
