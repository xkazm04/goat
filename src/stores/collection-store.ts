import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ListCollection,
  CollectionStats,
  ListCollectionWithStats,
  CollectionTreeNode,
} from '@/types/collection';
import { createLogger } from '@/lib/logger';

const collectionLogger = createLogger('collection-store');

interface CollectionStoreState {
  // Core state
  collections: ListCollection[];
  collectionStats: Record<string, CollectionStats>;

  // UI state
  selectedCollectionId: string | null;
  expandedCollectionIds: Set<string>;
  isLoading: boolean;
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

  // Build tree structure
  collections.forEach((collection) => {
    const node = nodeMap.get(collection.id)!;

    if (collection.parentId) {
      const parent = nodeMap.get(collection.parentId);
      if (parent) {
        node.depth = parent.depth + 1;
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

  return roots;
}

const initialState = {
  collections: [],
  collectionStats: {},
  selectedCollectionId: null,
  expandedCollectionIds: new Set<string>(),
  isLoading: false,
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
        return buildTree(get().collections, get().expandedCollectionIds);
      },

      getUserCollections: (userId: string) => {
        return get().collections.filter((c) => c.userId === userId);
      },

      // CRUD Actions
      setCollections: (collections) => {
        collectionLogger.debug(`Setting ${collections.length} collections`);
        set({ collections });
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
          const { [id]: removedStats, ...remainingStats } = state.collectionStats;

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
  useCollectionStore((state) => state.getRootCollections());

export const useSelectedCollection = () =>
  useCollectionStore((state) => {
    if (!state.selectedCollectionId) return null;
    return state.getCollectionById(state.selectedCollectionId);
  });

export const useCollectionTree = () =>
  useCollectionStore((state) => state.getCollectionTree());

export const useCollectionUIState = () =>
  useCollectionStore((state) => ({
    selectedCollectionId: state.selectedCollectionId,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
  }));

export const useCollectionActions = () =>
  useCollectionStore((state) => ({
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
  }));
