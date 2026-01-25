/**
 * Filter Builder Store
 * Zustand store for visual filter builder with drag-and-drop
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  FilterConfig,
  FilterCondition,
  FilterGroup,
  FilterCombinator,
  FilterValueType,
  FilterOperator,
  FilterPreset,
} from '@/lib/filters/types';
import { EMPTY_FILTER_CONFIG } from '@/lib/filters/constants';

/**
 * Node types in the filter tree
 */
export type FilterNodeType = 'condition' | 'group';

/**
 * Filter tree node - unified representation for drag-and-drop
 */
export interface FilterTreeNode {
  id: string;
  type: FilterNodeType;
  parentId: string | null;
  order: number;
  // For conditions
  condition?: FilterCondition;
  // For groups
  group?: Omit<FilterGroup, 'conditions' | 'groups'>;
  children?: string[]; // Child node IDs
}

/**
 * Drag data for dnd-kit
 */
export interface FilterDragData {
  type: FilterNodeType;
  nodeId: string;
  parentId: string | null;
}

/**
 * Drop zone data
 */
export interface FilterDropData {
  type: 'zone';
  parentId: string | null;
  index: number;
}

/**
 * Saved filter configuration
 */
export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  config: FilterConfig;
  createdAt: Date;
  updatedAt: Date;
  shareCode?: string;
}

/**
 * Filter builder state
 */
interface FilterBuilderState {
  // Tree structure
  nodes: Record<string, FilterTreeNode>;
  rootNodeIds: string[];
  rootCombinator: FilterCombinator;

  // Drag state
  activeNodeId: string | null;
  overNodeId: string | null;
  dragOperation: 'move' | 'reorder' | null;

  // UI state
  expandedGroups: Set<string>;
  selectedNodeId: string | null;
  isPreviewOpen: boolean;

  // Saved filters
  savedFilters: SavedFilter[];
  activeFilterId: string | null;

  // Undo/redo
  history: Array<{ nodes: Record<string, FilterTreeNode>; rootNodeIds: string[]; rootCombinator: FilterCombinator }>;
  historyIndex: number;
}

/**
 * Filter builder actions
 */
interface FilterBuilderActions {
  // Node management
  addCondition: (parentId: string | null, condition?: Partial<FilterCondition>) => string;
  addGroup: (parentId: string | null, combinator?: FilterCombinator) => string;
  updateCondition: (nodeId: string, updates: Partial<FilterCondition>) => void;
  updateGroupCombinator: (nodeId: string, combinator: FilterCombinator) => void;
  removeNode: (nodeId: string) => void;
  toggleNodeEnabled: (nodeId: string) => void;

  // Drag-and-drop
  setActiveNode: (nodeId: string | null) => void;
  setOverNode: (nodeId: string | null) => void;
  moveNode: (nodeId: string, newParentId: string | null, newIndex: number) => void;

  // UI state
  toggleGroupExpanded: (groupId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setPreviewOpen: (open: boolean) => void;

  // Conversion
  toFilterConfig: () => FilterConfig;
  fromFilterConfig: (config: FilterConfig) => void;

  // Root combinator
  setRootCombinator: (combinator: FilterCombinator) => void;

  // Saved filters
  saveFilter: (name: string, description?: string) => string;
  loadFilter: (filterId: string) => void;
  deleteFilter: (filterId: string) => void;
  updateFilter: (filterId: string, updates: Partial<SavedFilter>) => void;
  duplicateFilter: (filterId: string) => string;

  // Share
  generateShareCode: () => string;
  loadFromShareCode: (code: string) => boolean;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Reset
  clearAll: () => void;
  reset: () => void;
}

type FilterBuilderStore = FilterBuilderState & FilterBuilderActions;

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default condition
 */
function createDefaultCondition(overrides?: Partial<FilterCondition>): FilterCondition {
  return {
    id: generateId('cond'),
    field: 'title',
    operator: 'contains',
    value: '',
    valueType: 'string',
    enabled: true,
    ...overrides,
  };
}

/**
 * Initial state
 */
const initialState: FilterBuilderState = {
  nodes: {},
  rootNodeIds: [],
  rootCombinator: 'AND',
  activeNodeId: null,
  overNodeId: null,
  dragOperation: null,
  expandedGroups: new Set<string>(),
  selectedNodeId: null,
  isPreviewOpen: false,
  savedFilters: [],
  activeFilterId: null,
  history: [],
  historyIndex: -1,
};

/**
 * Create filter builder store
 */
export const useFilterBuilderStore = create<FilterBuilderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Node management
      addCondition: (parentId, conditionOverrides) => {
        const id = generateId('cond');
        const condition = createDefaultCondition({ id, ...conditionOverrides });

        set((state) => {
          const newNode: FilterTreeNode = {
            id,
            type: 'condition',
            parentId,
            order: parentId
              ? (state.nodes[parentId]?.children?.length ?? 0)
              : state.rootNodeIds.length,
            condition,
          };

          const newNodes = { ...state.nodes, [id]: newNode };
          let newRootNodeIds = [...state.rootNodeIds];

          if (parentId && state.nodes[parentId]) {
            // Add to parent group
            const parent = state.nodes[parentId];
            newNodes[parentId] = {
              ...parent,
              children: [...(parent.children || []), id],
            };
          } else {
            // Add to root
            newRootNodeIds = [...newRootNodeIds, id];
          }

          return {
            nodes: newNodes,
            rootNodeIds: newRootNodeIds,
          };
        });

        get().pushHistory();
        return id;
      },

      addGroup: (parentId, combinator = 'AND') => {
        const id = generateId('group');

        set((state) => {
          const newNode: FilterTreeNode = {
            id,
            type: 'group',
            parentId,
            order: parentId
              ? (state.nodes[parentId]?.children?.length ?? 0)
              : state.rootNodeIds.length,
            group: {
              id,
              combinator,
              enabled: true,
            },
            children: [],
          };

          const newNodes = { ...state.nodes, [id]: newNode };
          let newRootNodeIds = [...state.rootNodeIds];
          const newExpandedGroups = new Set(state.expandedGroups);
          newExpandedGroups.add(id);

          if (parentId && state.nodes[parentId]) {
            const parent = state.nodes[parentId];
            newNodes[parentId] = {
              ...parent,
              children: [...(parent.children || []), id],
            };
          } else {
            newRootNodeIds = [...newRootNodeIds, id];
          }

          return {
            nodes: newNodes,
            rootNodeIds: newRootNodeIds,
            expandedGroups: newExpandedGroups,
          };
        });

        get().pushHistory();
        return id;
      },

      updateCondition: (nodeId, updates) => {
        set((state) => {
          const node = state.nodes[nodeId];
          if (!node || node.type !== 'condition') return state;

          return {
            nodes: {
              ...state.nodes,
              [nodeId]: {
                ...node,
                condition: {
                  ...node.condition!,
                  ...updates,
                },
              },
            },
          };
        });
        get().pushHistory();
      },

      updateGroupCombinator: (nodeId, combinator) => {
        set((state) => {
          const node = state.nodes[nodeId];
          if (!node || node.type !== 'group') return state;

          return {
            nodes: {
              ...state.nodes,
              [nodeId]: {
                ...node,
                group: {
                  ...node.group!,
                  combinator,
                },
              },
            },
          };
        });
        get().pushHistory();
      },

      removeNode: (nodeId) => {
        set((state) => {
          const node = state.nodes[nodeId];
          if (!node) return state;

          // Collect all descendant IDs to remove
          const idsToRemove = new Set<string>([nodeId]);
          const collectDescendants = (id: string) => {
            const n = state.nodes[id];
            if (n?.children) {
              for (const childId of n.children) {
                idsToRemove.add(childId);
                collectDescendants(childId);
              }
            }
          };
          collectDescendants(nodeId);

          // Remove from nodes
          const newNodes = { ...state.nodes };
          Array.from(idsToRemove).forEach((id) => {
            delete newNodes[id];
          });

          // Remove from parent or root
          let newRootNodeIds = state.rootNodeIds;
          if (node.parentId && newNodes[node.parentId]) {
            const parent = newNodes[node.parentId];
            newNodes[node.parentId] = {
              ...parent,
              children: parent.children?.filter((id) => id !== nodeId),
            };
          } else {
            newRootNodeIds = state.rootNodeIds.filter((id) => id !== nodeId);
          }

          // Update expanded groups
          const newExpandedGroups = new Set(state.expandedGroups);
          Array.from(idsToRemove).forEach((id) => {
            newExpandedGroups.delete(id);
          });

          return {
            nodes: newNodes,
            rootNodeIds: newRootNodeIds,
            expandedGroups: newExpandedGroups,
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          };
        });
        get().pushHistory();
      },

      toggleNodeEnabled: (nodeId) => {
        set((state) => {
          const node = state.nodes[nodeId];
          if (!node) return state;

          if (node.type === 'condition') {
            return {
              nodes: {
                ...state.nodes,
                [nodeId]: {
                  ...node,
                  condition: {
                    ...node.condition!,
                    enabled: !node.condition!.enabled,
                  },
                },
              },
            };
          } else {
            return {
              nodes: {
                ...state.nodes,
                [nodeId]: {
                  ...node,
                  group: {
                    ...node.group!,
                    enabled: !node.group!.enabled,
                  },
                },
              },
            };
          }
        });
      },

      // Drag-and-drop
      setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
      setOverNode: (nodeId) => set({ overNodeId: nodeId }),

      moveNode: (nodeId, newParentId, newIndex) => {
        set((state) => {
          const node = state.nodes[nodeId];
          if (!node) return state;

          // Prevent moving a group into itself or its descendants
          if (newParentId) {
            let checkId: string | null = newParentId;
            while (checkId) {
              if (checkId === nodeId) return state;
              checkId = state.nodes[checkId]?.parentId ?? null;
            }
          }

          const newNodes = { ...state.nodes };
          let newRootNodeIds = [...state.rootNodeIds];

          // Remove from old parent
          if (node.parentId && newNodes[node.parentId]) {
            const oldParent = newNodes[node.parentId];
            newNodes[node.parentId] = {
              ...oldParent,
              children: oldParent.children?.filter((id) => id !== nodeId),
            };
          } else {
            newRootNodeIds = newRootNodeIds.filter((id) => id !== nodeId);
          }

          // Add to new parent
          if (newParentId && newNodes[newParentId]) {
            const newParent = newNodes[newParentId];
            const children = [...(newParent.children || [])];
            children.splice(newIndex, 0, nodeId);
            newNodes[newParentId] = {
              ...newParent,
              children,
            };
          } else {
            newRootNodeIds.splice(newIndex, 0, nodeId);
          }

          // Update node's parent reference
          newNodes[nodeId] = {
            ...node,
            parentId: newParentId,
            order: newIndex,
          };

          return {
            nodes: newNodes,
            rootNodeIds: newRootNodeIds,
          };
        });
        get().pushHistory();
      },

      // UI state
      toggleGroupExpanded: (groupId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedGroups);
          if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
          } else {
            newExpanded.add(groupId);
          }
          return { expandedGroups: newExpanded };
        });
      },

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
      setPreviewOpen: (open) => set({ isPreviewOpen: open }),

      // Root combinator
      setRootCombinator: (combinator) => {
        set({ rootCombinator: combinator });
        get().pushHistory();
      },

      // Conversion to FilterConfig
      toFilterConfig: () => {
        const state = get();

        const buildConditions = (nodeIds: string[]): FilterCondition[] => {
          return nodeIds
            .map((id) => state.nodes[id])
            .filter((n): n is FilterTreeNode => n?.type === 'condition' && !!n.condition)
            .map((n) => n.condition!);
        };

        const buildGroup = (nodeId: string): FilterGroup | null => {
          const node = state.nodes[nodeId];
          if (!node || node.type !== 'group' || !node.group) return null;

          const childConditions: FilterCondition[] = [];
          const childGroups: FilterGroup[] = [];

          for (const childId of node.children || []) {
            const child = state.nodes[childId];
            if (!child) continue;

            if (child.type === 'condition' && child.condition) {
              childConditions.push(child.condition);
            } else if (child.type === 'group') {
              const group = buildGroup(childId);
              if (group) childGroups.push(group);
            }
          }

          return {
            id: node.group.id,
            combinator: node.group.combinator,
            enabled: node.group.enabled,
            conditions: childConditions,
            groups: childGroups,
          };
        };

        // Build root level
        const rootConditions: FilterCondition[] = [];
        const rootGroups: FilterGroup[] = [];

        for (const nodeId of state.rootNodeIds) {
          const node = state.nodes[nodeId];
          if (!node) continue;

          if (node.type === 'condition' && node.condition) {
            rootConditions.push(node.condition);
          } else if (node.type === 'group') {
            const group = buildGroup(nodeId);
            if (group) rootGroups.push(group);
          }
        }

        return {
          rootCombinator: state.rootCombinator,
          conditions: rootConditions,
          groups: rootGroups,
        };
      },

      // Load from FilterConfig
      fromFilterConfig: (config) => {
        const newNodes: Record<string, FilterTreeNode> = {};
        const newRootNodeIds: string[] = [];
        const newExpandedGroups = new Set<string>();

        const processCondition = (cond: FilterCondition, parentId: string | null, order: number): string => {
          const id = cond.id || generateId('cond');
          newNodes[id] = {
            id,
            type: 'condition',
            parentId,
            order,
            condition: { ...cond, id },
          };
          return id;
        };

        const processGroup = (group: FilterGroup, parentId: string | null, order: number): string => {
          const id = group.id || generateId('group');
          const childIds: string[] = [];

          // Process conditions
          group.conditions.forEach((cond, i) => {
            childIds.push(processCondition(cond, id, i));
          });

          // Process nested groups
          group.groups.forEach((g, i) => {
            childIds.push(processGroup(g, id, group.conditions.length + i));
          });

          newNodes[id] = {
            id,
            type: 'group',
            parentId,
            order,
            group: {
              id,
              combinator: group.combinator,
              enabled: group.enabled,
            },
            children: childIds,
          };

          newExpandedGroups.add(id);
          return id;
        };

        // Process root conditions
        config.conditions.forEach((cond, i) => {
          newRootNodeIds.push(processCondition(cond, null, i));
        });

        // Process root groups
        config.groups.forEach((group, i) => {
          newRootNodeIds.push(processGroup(group, null, config.conditions.length + i));
        });

        set({
          nodes: newNodes,
          rootNodeIds: newRootNodeIds,
          rootCombinator: config.rootCombinator,
          expandedGroups: newExpandedGroups,
          history: [],
          historyIndex: -1,
        });
      },

      // Saved filters
      saveFilter: (name, description) => {
        const id = generateId('filter');
        const config = get().toFilterConfig();

        const savedFilter: SavedFilter = {
          id,
          name,
          description,
          config,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          savedFilters: [...state.savedFilters, savedFilter],
          activeFilterId: id,
        }));

        return id;
      },

      loadFilter: (filterId) => {
        const state = get();
        const filter = state.savedFilters.find((f) => f.id === filterId);
        if (!filter) return;

        get().fromFilterConfig(filter.config);
        set({ activeFilterId: filterId });
      },

      deleteFilter: (filterId) => {
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== filterId),
          activeFilterId: state.activeFilterId === filterId ? null : state.activeFilterId,
        }));
      },

      updateFilter: (filterId, updates) => {
        set((state) => ({
          savedFilters: state.savedFilters.map((f) =>
            f.id === filterId ? { ...f, ...updates, updatedAt: new Date() } : f
          ),
        }));
      },

      duplicateFilter: (filterId) => {
        const state = get();
        const filter = state.savedFilters.find((f) => f.id === filterId);
        if (!filter) return '';

        const id = generateId('filter');
        const duplicate: SavedFilter = {
          ...filter,
          id,
          name: `${filter.name} (Copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          shareCode: undefined,
        };

        set((state) => ({
          savedFilters: [...state.savedFilters, duplicate],
        }));

        return id;
      },

      // Share
      generateShareCode: () => {
        const config = get().toFilterConfig();
        try {
          return btoa(JSON.stringify(config));
        } catch {
          return '';
        }
      },

      loadFromShareCode: (code) => {
        try {
          const config = JSON.parse(atob(code)) as FilterConfig;
          get().fromFilterConfig(config);
          return true;
        } catch {
          return false;
        }
      },

      // Undo/redo
      pushHistory: () => {
        set((state) => {
          const snapshot = {
            nodes: JSON.parse(JSON.stringify(state.nodes)),
            rootNodeIds: [...state.rootNodeIds],
            rootCombinator: state.rootCombinator,
          };

          // Trim future history if we're not at the end
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(snapshot);

          // Limit history size
          if (newHistory.length > 50) {
            newHistory.shift();
          }

          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        set((state) => {
          if (state.historyIndex <= 0) return state;

          const newIndex = state.historyIndex - 1;
          const snapshot = state.history[newIndex];

          return {
            nodes: snapshot.nodes,
            rootNodeIds: snapshot.rootNodeIds,
            rootCombinator: snapshot.rootCombinator,
            historyIndex: newIndex,
          };
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state;

          const newIndex = state.historyIndex + 1;
          const snapshot = state.history[newIndex];

          return {
            nodes: snapshot.nodes,
            rootNodeIds: snapshot.rootNodeIds,
            rootCombinator: snapshot.rootCombinator,
            historyIndex: newIndex,
          };
        });
      },

      // Reset
      clearAll: () => {
        set({
          nodes: {},
          rootNodeIds: [],
          rootCombinator: 'AND',
          expandedGroups: new Set(),
          selectedNodeId: null,
          activeFilterId: null,
        });
        get().pushHistory();
      },

      reset: () => {
        set({
          ...initialState,
          savedFilters: get().savedFilters,
          expandedGroups: new Set(),
        });
      },
    }),
    {
      name: 'filter-builder-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedFilters: state.savedFilters,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<FilterBuilderState>;
        return {
          ...currentState,
          savedFilters: (persisted.savedFilters || []).map((f) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
          })),
        };
      },
    }
  )
);

/**
 * Selectors
 */
export const useFilterBuilderNodes = () => useFilterBuilderStore((state) => state.nodes);
export const useFilterBuilderRootIds = () => useFilterBuilderStore((state) => state.rootNodeIds);
export const useFilterBuilderRootCombinator = () => useFilterBuilderStore((state) => state.rootCombinator);
export const useFilterBuilderActiveNode = () => useFilterBuilderStore((state) => state.activeNodeId);
export const useFilterBuilderSelectedNode = () => useFilterBuilderStore((state) => state.selectedNodeId);
export const useFilterBuilderExpandedGroups = () => useFilterBuilderStore((state) => state.expandedGroups);
export const useFilterBuilderSavedFilters = () => useFilterBuilderStore((state) => state.savedFilters);
export const useFilterBuilderActiveFilterId = () => useFilterBuilderStore((state) => state.activeFilterId);

export const useCanUndo = () => useFilterBuilderStore((state) => state.historyIndex > 0);
export const useCanRedo = () => useFilterBuilderStore((state) => state.historyIndex < state.history.length - 1);

export const useFilterBuilderNodeCount = () =>
  useFilterBuilderStore((state) => Object.keys(state.nodes).length);

export const useFilterBuilderConditionCount = () =>
  useFilterBuilderStore((state) =>
    Object.values(state.nodes).filter((n) => n.type === 'condition').length
  );
