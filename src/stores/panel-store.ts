/**
 * Panel Store
 * Zustand store for managing multi-panel collection interface state.
 * Handles panel creation, layout, persistence, and presets.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Panel filter state
 */
export interface PanelFilter {
  searchTerm: string;
  selectedGroupIds: string[];
  sortBy: 'name' | 'date' | 'popularity' | 'ranking';
  sortOrder: 'asc' | 'desc';
}

/**
 * Panel configuration
 */
export interface PanelConfig {
  id: string;
  title: string;
  category?: string;
  subcategory?: string;
  filter: PanelFilter;
  viewMode: 'grid' | 'list';
  isMinimized: boolean;
  isFloating: boolean;
  floatingPosition?: { x: number; y: number };
  floatingSize?: { width: number; height: number };
  order: number;
  color?: string;
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  id: string;
  name: string;
  direction: 'horizontal' | 'vertical';
  panelIds: string[];
  sizes: number[];
  isDefault?: boolean;
}

/**
 * Preset configuration
 */
export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  layout: LayoutConfig;
  panels: Omit<PanelConfig, 'id'>[];
}

/**
 * Panel store state
 */
export interface PanelState {
  /** All panels */
  panels: Record<string, PanelConfig>;
  /** Active layout */
  activeLayout: LayoutConfig;
  /** Saved layouts */
  savedLayouts: LayoutConfig[];
  /** Active panel ID (for keyboard focus) */
  activePanelId: string | null;
  /** Maximum panels allowed */
  maxPanels: number;
  /** Whether panel dock is visible */
  isDockVisible: boolean;
  /** Panel being dragged */
  draggingPanelId: string | null;
}

/**
 * Panel store actions
 */
export interface PanelActions {
  // Panel management
  addPanel: (config?: Partial<PanelConfig>) => string;
  removePanel: (panelId: string) => void;
  updatePanel: (panelId: string, updates: Partial<PanelConfig>) => void;
  duplicatePanel: (panelId: string) => string;

  // Panel state
  setActivePanel: (panelId: string | null) => void;
  minimizePanel: (panelId: string) => void;
  maximizePanel: (panelId: string) => void;
  togglePanelFloat: (panelId: string) => void;

  // Panel filtering
  setPanelFilter: (panelId: string, filter: Partial<PanelFilter>) => void;
  setPanelViewMode: (panelId: string, mode: 'grid' | 'list') => void;

  // Layout management
  setLayout: (layout: Partial<LayoutConfig>) => void;
  setLayoutDirection: (direction: 'horizontal' | 'vertical') => void;
  setLayoutSizes: (sizes: number[]) => void;
  reorderPanels: (panelIds: string[]) => void;

  // Saved layouts
  saveCurrentLayout: (name: string) => void;
  loadLayout: (layoutId: string) => void;
  deleteLayout: (layoutId: string) => void;

  // Presets
  applyPreset: (presetId: string) => void;

  // Dock
  toggleDock: () => void;

  // Drag state
  setDraggingPanel: (panelId: string | null) => void;

  // Reset
  reset: () => void;
}

/**
 * Default panel filter
 */
const DEFAULT_FILTER: PanelFilter = {
  searchTerm: '',
  selectedGroupIds: [],
  sortBy: 'name',
  sortOrder: 'asc',
};

/**
 * Create a new panel config
 */
function createPanelConfig(
  id: string,
  order: number,
  overrides?: Partial<PanelConfig>
): PanelConfig {
  return {
    id,
    title: `Panel ${order + 1}`,
    filter: { ...DEFAULT_FILTER },
    viewMode: 'grid',
    isMinimized: false,
    isFloating: false,
    order,
    ...overrides,
  };
}

/**
 * Generate unique panel ID
 */
function generatePanelId(): string {
  return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Default layout
 */
const DEFAULT_LAYOUT: LayoutConfig = {
  id: 'default',
  name: 'Default',
  direction: 'horizontal',
  panelIds: [],
  sizes: [],
  isDefault: true,
};

/**
 * Initial state
 */
const initialState: PanelState = {
  panels: {},
  activeLayout: { ...DEFAULT_LAYOUT },
  savedLayouts: [],
  activePanelId: null,
  maxPanels: 6,
  isDockVisible: true,
  draggingPanelId: null,
};

/**
 * Panel store
 */
export const usePanelStore = create<PanelState & PanelActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Panel management
      addPanel: (config) => {
        const state = get();
        const panelCount = Object.keys(state.panels).length;

        if (panelCount >= state.maxPanels) {
          console.warn(`Maximum panels (${state.maxPanels}) reached`);
          return '';
        }

        const id = generatePanelId();
        const newPanel = createPanelConfig(id, panelCount, config);

        set((state) => {
          state.panels[id] = newPanel;
          state.activeLayout.panelIds.push(id);
          // Distribute sizes evenly
          const newSize = 100 / (state.activeLayout.panelIds.length);
          state.activeLayout.sizes = state.activeLayout.panelIds.map(() => newSize);
          state.activePanelId = id;
        });

        return id;
      },

      removePanel: (panelId) => {
        set((state) => {
          delete state.panels[panelId];
          const index = state.activeLayout.panelIds.indexOf(panelId);
          if (index > -1) {
            state.activeLayout.panelIds.splice(index, 1);
            state.activeLayout.sizes.splice(index, 1);
            // Normalize sizes
            if (state.activeLayout.sizes.length > 0) {
              const total = state.activeLayout.sizes.reduce((a, b) => a + b, 0);
              state.activeLayout.sizes = state.activeLayout.sizes.map((s) => (s / total) * 100);
            }
          }
          if (state.activePanelId === panelId) {
            state.activePanelId = state.activeLayout.panelIds[0] || null;
          }
        });
      },

      updatePanel: (panelId, updates) => {
        set((state) => {
          if (state.panels[panelId]) {
            Object.assign(state.panels[panelId], updates);
          }
        });
      },

      duplicatePanel: (panelId) => {
        const state = get();
        const source = state.panels[panelId];
        if (!source) return '';

        const { id: _id, order: _order, ...rest } = source;
        return state.addPanel({
          ...rest,
          title: `${source.title} (Copy)`,
        });
      },

      // Panel state
      setActivePanel: (panelId) => {
        set((state) => {
          state.activePanelId = panelId;
        });
      },

      minimizePanel: (panelId) => {
        set((state) => {
          if (state.panels[panelId]) {
            state.panels[panelId].isMinimized = true;
          }
        });
      },

      maximizePanel: (panelId) => {
        set((state) => {
          if (state.panels[panelId]) {
            state.panels[panelId].isMinimized = false;
          }
        });
      },

      togglePanelFloat: (panelId) => {
        set((state) => {
          if (state.panels[panelId]) {
            const panel = state.panels[panelId];
            panel.isFloating = !panel.isFloating;
            if (panel.isFloating && !panel.floatingPosition) {
              panel.floatingPosition = { x: 100, y: 100 };
              panel.floatingSize = { width: 400, height: 500 };
            }
          }
        });
      },

      // Panel filtering
      setPanelFilter: (panelId, filter) => {
        set((state) => {
          if (state.panels[panelId]) {
            Object.assign(state.panels[panelId].filter, filter);
          }
        });
      },

      setPanelViewMode: (panelId, mode) => {
        set((state) => {
          if (state.panels[panelId]) {
            state.panels[panelId].viewMode = mode;
          }
        });
      },

      // Layout management
      setLayout: (layout) => {
        set((state) => {
          Object.assign(state.activeLayout, layout);
        });
      },

      setLayoutDirection: (direction) => {
        set((state) => {
          state.activeLayout.direction = direction;
        });
      },

      setLayoutSizes: (sizes) => {
        set((state) => {
          state.activeLayout.sizes = sizes;
        });
      },

      reorderPanels: (panelIds) => {
        set((state) => {
          state.activeLayout.panelIds = panelIds;
          // Update panel orders
          panelIds.forEach((id, index) => {
            if (state.panels[id]) {
              state.panels[id].order = index;
            }
          });
        });
      },

      // Saved layouts
      saveCurrentLayout: (name) => {
        const state = get();
        const layoutId = `layout-${Date.now()}`;
        const layout: LayoutConfig = {
          ...state.activeLayout,
          id: layoutId,
          name,
          isDefault: false,
        };

        set((state) => {
          state.savedLayouts.push(layout);
        });
      },

      loadLayout: (layoutId) => {
        const state = get();
        const layout = state.savedLayouts.find((l) => l.id === layoutId);
        if (layout) {
          set((state) => {
            state.activeLayout = { ...layout };
          });
        }
      },

      deleteLayout: (layoutId) => {
        set((state) => {
          state.savedLayouts = state.savedLayouts.filter((l) => l.id !== layoutId);
        });
      },

      // Presets (implemented in presets.ts, called from there)
      applyPreset: (presetId) => {
        // This will be overridden by preset application logic
        console.log('Apply preset:', presetId);
      },

      // Dock
      toggleDock: () => {
        set((state) => {
          state.isDockVisible = !state.isDockVisible;
        });
      },

      // Drag state
      setDraggingPanel: (panelId) => {
        set((state) => {
          state.draggingPanelId = panelId;
        });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'goat-panel-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panels: state.panels,
        activeLayout: state.activeLayout,
        savedLayouts: state.savedLayouts,
        isDockVisible: state.isDockVisible,
      }),
    }
  )
);

/**
 * Selectors
 */
export const usePanels = () => usePanelStore((state) => state.panels);
export const useActiveLayout = () => usePanelStore((state) => state.activeLayout);
export const useActivePanelId = () => usePanelStore((state) => state.activePanelId);
export const useSavedLayouts = () => usePanelStore((state) => state.savedLayouts);
export const useIsDockVisible = () => usePanelStore((state) => state.isDockVisible);

export const usePanel = (panelId: string) =>
  usePanelStore((state) => state.panels[panelId]);

export const usePanelList = () =>
  usePanelStore((state) =>
    state.activeLayout.panelIds
      .map((id) => state.panels[id])
      .filter(Boolean)
      .sort((a, b) => a.order - b.order)
  );

export const useFloatingPanels = () =>
  usePanelStore((state) =>
    Object.values(state.panels).filter((p) => p.isFloating)
  );

export const useDockedPanels = () =>
  usePanelStore((state) =>
    state.activeLayout.panelIds
      .map((id) => state.panels[id])
      .filter((p) => p && !p.isFloating)
  );

export default usePanelStore;
