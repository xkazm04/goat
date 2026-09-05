import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { createLogger } from '@/lib/logger';

import type {
  ListCollection,
  CollectionStats,
  ListCollectionWithStats,
  CollectionTreeNode,
} from '@/types/collection';

const collectionLogger = createLogger('collection-store');

interface CollectionStoreState {
  // Core state
  collections: ListCollection[];
  collectionStats: Record<string, CollectionStats>;

  // UI state
  selectedCollectionId: string | null;
  expandedCollectionIds: Set<string>;
  isLoading: boolean;
  hasLoaded: boolean;
  isSyncing: boolean;

  // Computed getters
  getRootCollections: () => ListCollection[];
  getChildCollections: (parentId: string) => ListCollection[];
  getCollectionById: (id: string) => ListCollection | null;
  getCollectionWithStats: (id: string) => ListCollectionWithStats | null;
  getCollectionTree: () => CollectionTreeNode[];
  getUserCollections: (userId: string) => ListCollection[];

  // Actions - CRUD
  setCollections: (collections: ListCollection[]) => void;
  addCollection: (collection: ListCollection) => void;
  updateCollection: (id: string, updates: Partial<ListCollection>) => void;
  removeCollection: (id: string) => void;

  // Actions - Stats
  setCollectionStats: (id: string, stats: CollectionStats) => void;
  setAllStats: (stats: Record<string, CollectionStats>) => void;

  // Actions - UI
  setSelectedCollection: (id: string | null) => void;
  toggleCollectionExpanded: (id: string) => void;
  setCollectionExpanded: (id: string, expanded: boolean) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setIsLoading: (loading: boolean) => void;
  setHasLoaded: (loaded: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;

  // Actions - List management within collections
  addListToCollection: (collectionId: string, listId: string) => void;
  removeListFromCollection: (collectionId: string, listId: string) => void;
  moveListBetweenCollections: (
    listId: string,
    fromCollectionId: string,
    toCollectionId: string
  ) => void;

  // Actions - Reordering
  reorderCollections: (orderedIds: string[]) => void;
  moveCollection: (id: string, newParentId: string | null) => void;

  // Actions - Reset
  resetStore: () => void;
}

// Helper to build tree from flat collections
function buildTree(
  collections: ListCollection[],
  expandedIds: Set<string>
): CollectionTreeNode[] {
  const nodeMap = new Map<string, CollectionTreeNode>();
  const roots: CollectionTreeNode[] = [];

  // Create nodes for all collections
  collections.forEach((collection) => {
    nodeMap.set(collection.id, {
      collection,
      children: [],
      depth: 0,
      isExpanded: expandedIds.has(collection.id),
    });
  });

  // Link children to parents. Depth is NOT assigned here: a child that appears
  // in the array before its parent would read the parent's depth while it is
  // still 0, so a grandchild listed first landed at depth 1. Depth is a
  // property of the linked tree and is assigned once the links exist.
  collections.forEach((collection) => {
    const node = nodeMap.get(collection.id)!;

    if (collection.parentId) {
      const parent = nodeMap.get(collection.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Sort by order
  const sortByOrder = (a: CollectionTreeNode, b: CollectionTreeNode) =>
    a.collection.order - b.collection.order;

  roots.sort(sortByOrder);
  nodeMap.forEach((node) => node.children.sort(sortByOrder));

  const assignDepth = (nodes: CollectionTreeNode[], depth: number) => {
    for (const node of nodes) {
      node.depth = depth;
      assignDepth(node.children, depth + 1);
    }
  };
  assignDepth(roots, 0);

  return roots;
}

// `getCollectionTree` is read through a zustand selector. zustand 5 re-renders a
// consumer whenever the selected snapshot is not Object.is-equal to the last
// one, so a selector that rebuilt the tree on every call never settled and
// React threw "Maximum update depth exceeded" (see collection-store.test.tsx).
// The tree is a pure derivation of (collections, expandedCollectionIds); cache
// the last result keyed on those two references and rebuild only when one of
// them is replaced.
let _treeInputs: { collections: ListCollection[]; expanded: Set<string> } | null = null;
let _treeResult: CollectionTreeNode[] = [];
function memoisedTree(collections: ListCollection[], expanded: Set<string>): CollectionTreeNode[] {
  if (_treeInputs && _treeInputs.collections === collections && _treeInputs.expanded === expanded) {
    return _treeResult;
  }
  _treeInputs = { collections, expanded };
  _treeResult = buildTree(collections, expanded);
  return _treeResult;
}

const initialState = {
  collections: [],
  collectionStats: {},
  selectedCollectionId: null,
  expandedCollectionIds: new Set<string>(),
  isLoading: false,
  hasLoaded: false,
  isSyncing: false,
};

export const useCollectionStore = create<CollectionStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Computed getters
      getRootCollections: () => {
        return get().collections.filter((c) => !c.parentId);
      },

      getChildCollections: (parentId: string) => {
        return get().collections.filter((c) => c.parentId === parentId);
      },

      getCollectionById: (id: string) => {
        return get().collections.find((c) => c.id === id) || null;
      },

      getCollectionWithStats: (id: string) => {
        const collection = get().getCollectionById(id);
        if (!collection) return null;

        const stats = get().collectionStats[id] || {
          listCount: collection.listIds.length,
          totalItems: 0,
          completedLists: 0,
          lastActivity: null,
        };

        return { ...collection, stats };
      },

      getCollectionTree: () => {
        return memoisedTree(get().collections, get().expandedCollectionIds);
      },

      getUserCollections: (userId: string) => {
        return get().collections.filter((c) => c.userId === userId);
      },

      // CRUD Actions
      setCollections: (collections) => {
        collectionLogger.debug(`Setting ${collections.length} collections`);
        set({ collections, hasLoaded: true });
      },

      addCollection: (collection) => {
        collectionLogger.debug(`Adding collection: ${collection.name}`);
        set((state) => ({
          collections: [...state.collections, collection],
        }));
      },

      updateCollection: (id, updates) => {
        collectionLogger.debug(`Updating collection ${id}`, updates);
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      removeCollection: (id) => {
        collectionLogger.debug(`Removing collection ${id}`);
        set((state) => {
          // Remove collection and update children to have no parent
          const updated = state.collections
            .filter((c) => c.id !== id)
            .map((c) => (c.parentId === id ? { ...c, parentId: null } : c));

          // Clean up stats
          const { [id]: _removedStats, ...remainingStats } = state.collectionStats;

          // Clear selection if removed
          const selectedId =
            state.selectedCollectionId === id ? null : state.selectedCollectionId;

          // Remove from expanded
          const expandedIds = new Set(state.expandedCollectionIds);
          expandedIds.delete(id);

          return {
            collections: updated,
            collectionStats: remainingStats,
            selectedCollectionId: selectedId,
            expandedCollectionIds: expandedIds,
          };
        });
      },

      // Stats Actions
      setCollectionStats: (id, stats) => {
        set((state) => ({
          collectionStats: {
            ...state.collectionStats,
            [id]: stats,
          },
        }));
      },

      setAllStats: (stats) => {
        set({ collectionStats: stats });
      },

      // UI Actions
      setSelectedCollection: (id) => {
        set({ selectedCollectionId: id });
      },

      toggleCollectionExpanded: (id) => {
        set((state) => {
          const expandedIds = new Set(state.expandedCollectionIds);
          if (expandedIds.has(id)) {
            expandedIds.delete(id);
          } else {
            expandedIds.add(id);
          }
          return { expandedCollectionIds: expandedIds };
        });
      },

      setCollectionExpanded: (id, expanded) => {
        set((state) => {
          const expandedIds = new Set(state.expandedCollectionIds);
          if (expanded) {
            expandedIds.add(id);
          } else {
            expandedIds.delete(id);
          }
          return { expandedCollectionIds: expandedIds };
        });
      },

      expandAll: () => {
        set((state) => ({
          expandedCollectionIds: new Set(state.collections.map((c) => c.id)),
        }));
      },

      collapseAll: () => {
        set({ expandedCollectionIds: new Set() });
      },

      setIsLoading: (isLoading) => {
        set({ isLoading });
      },

      setHasLoaded: (hasLoaded) => {
        set({ hasLoaded });
      },

      setIsSyncing: (isSyncing) => {
        set({ isSyncing });
      },

      // List management within collections
      addListToCollection: (collectionId, listId) => {
        collectionLogger.debug(
          `Adding list ${listId} to collection ${collectionId}`
        );
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  listIds: c.listIds.includes(listId)
                    ? c.listIds
                    : [...c.listIds, listId],
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      removeListFromCollection: (collectionId, listId) => {
        collectionLogger.debug(
          `Removing list ${listId} from collection ${collectionId}`
        );
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  listIds: c.listIds.filter((id) => id !== listId),
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      moveListBetweenCollections: (listId, fromCollectionId, toCollectionId) => {
        collectionLogger.debug(
          `Moving list ${listId} from ${fromCollectionId} to ${toCollectionId}`
        );
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id === fromCollectionId) {
              return {
                ...c,
                listIds: c.listIds.filter((id) => id !== listId),
                updatedAt: new Date().toISOString(),
              };
            }
            if (c.id === toCollectionId) {
              return {
                ...c,
                listIds: c.listIds.includes(listId)
                  ? c.listIds
                  : [...c.listIds, listId],
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          }),
        }));
      },

      // Reordering
      reorderCollections: (orderedIds) => {
        collectionLogger.debug('Reordering collections');
        set((state) => ({
          collections: state.collections.map((c) => ({
            ...c,
            order: orderedIds.indexOf(c.id),
          })),
        }));
      },

      moveCollection: (id, newParentId) => {
        collectionLogger.debug(
          `Moving collection ${id} to parent ${newParentId}`
        );
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id
              ? { ...c, parentId: newParentId, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },

      // Reset
      resetStore: () => {
        collectionLogger.debug('Resetting collection store');
        set({
          ...initialState,
          hasLoaded: false,
          expandedCollectionIds: new Set(),
        });
      },
    }),
    {
      name: 'collection-store',
      partialize: (state) => ({
        collections: state.collections,
        selectedCollectionId: state.selectedCollectionId,
        // Convert Set to Array for JSON serialization
        expandedCollectionIds: Array.from(state.expandedCollectionIds),
      }),
      // Rehydrate Set from Array
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.expandedCollectionIds = new Set(
            state.expandedCollectionIds as unknown as string[]
          );
        }
      },
    }
  )
);

// Selector hooks for performance
export const useCollections = () =>
  useCollectionStore((state) => state.collections);

export const useRootCollections = () =>
  useCollectionStore(useShallow((state) => state.getRootCollections()));

export const useSelectedCollection = () =>
  useCollectionStore((state) => {
    if (!state.selectedCollectionId) return null;
    return state.getCollectionById(state.selectedCollectionId);
  });

export const useCollectionTree = () =>
  useCollectionStore((state) => state.getCollectionTree());

// Object- and array-valued selectors go through useShallow: without it every
// store write produced a fresh object, the snapshot never compared equal, and
// the three consumers on /my-collections re-rendered until React threw.
export const useCollectionUIState = () =>
  useCollectionStore(useShallow((state) => ({
    selectedCollectionId: state.selectedCollectionId,
    isLoading: state.isLoading,
    hasLoaded: state.hasLoaded,
    isSyncing: state.isSyncing,
  })));

export const useCollectionActions = () =>
  useCollectionStore(useShallow((state) => ({
    setCollections: state.setCollections,
    addCollection: state.addCollection,
    updateCollection: state.updateCollection,
    removeCollection: state.removeCollection,
    setSelectedCollection: state.setSelectedCollection,
    toggleCollectionExpanded: state.toggleCollectionExpanded,
    addListToCollection: state.addListToCollection,
    removeListFromCollection: state.removeListFromCollection,
    moveListBetweenCollections: state.moveListBetweenCollections,
    reorderCollections: state.reorderCollections,
    moveCollection: state.moveCollection,
  })));
