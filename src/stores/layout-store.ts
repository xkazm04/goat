/**
 * Layout Store
 * Zustand store for adaptive responsive layout state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Breakpoint,
  LayoutPreset,
  LayoutPresetConfig,
  SidebarPosition,
  PanelState,
  PanelConfig,
  PipConfig,
  LayoutDimensions,
  ResizeEvent,
  LayoutState,
  LayoutActions,
  LAYOUT_STORAGE_KEYS,
} from '@/lib/layout/types';

/**
 * Default dimensions
 */
const DEFAULT_DIMENSIONS: LayoutDimensions = {
  viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
  viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  contentWidth: 0,
  contentHeight: 0,
  sidebarWidth: 320,
  sidebarHeight: 0,
  headerHeight: 64,
  footerHeight: 48,
};

/**
 * Default PiP configuration
 */
const DEFAULT_PIP_CONFIG: PipConfig = {
  enabled: false,
  position: { x: 20, y: 20 },
  size: { width: 280, height: 200 },
  isDocked: true,
  dockPosition: 'bottom-right',
  opacity: 0.95,
  showControls: true,
};

/**
 * Default panel configuration
 */
function createDefaultPanelConfig(id: string): PanelConfig {
  return {
    id,
    position: 'left',
    state: 'expanded',
    width: 320,
    minWidth: 200,
    maxWidth: 600,
    height: 0,
    minHeight: 200,
    maxHeight: 1000,
    isResizable: true,
    isDraggable: false,
    showHandle: true,
    zIndex: 10,
  };
}

/**
 * Initial state
 */
const initialState: LayoutState = {
  currentBreakpoint: 'desktop',
  currentPreset: 'browse',
  sidebarPosition: 'left',
  sidebarState: 'expanded',
  sidebarWidth: 320,
  panelConfigs: new Map<string, PanelConfig>(),
  pipConfig: DEFAULT_PIP_CONFIG,
  dimensions: DEFAULT_DIMENSIONS,
  isTransitioning: false,
  gestureEnabled: false,
  customPresets: [],
};

/**
 * Layout store type
 */
type LayoutStore = LayoutState & LayoutActions;

/**
 * Create layout store with persistence
 */
export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Breakpoint
      setBreakpoint: (breakpoint: Breakpoint) => {
        set({ currentBreakpoint: breakpoint });
      },

      detectBreakpoint: () => {
        if (typeof window === 'undefined') return;
        const width = window.innerWidth;
        let breakpoint: Breakpoint = 'desktop';

        if (width < 640) {
          breakpoint = 'mobile';
        } else if (width < 1024) {
          breakpoint = 'tablet';
        } else if (width < 1536) {
          breakpoint = 'desktop';
        } else {
          breakpoint = 'ultrawide';
        }

        set({ currentBreakpoint: breakpoint });
      },

      // Preset
      setPreset: (preset: LayoutPreset) => {
        set({ currentPreset: preset });
      },

      applyPreset: (config: LayoutPresetConfig) => {
        set({
          currentPreset: config.id,
          sidebarPosition: config.sidebarPosition,
          sidebarState: config.sidebarState,
          sidebarWidth: config.sidebarWidth,
        });
      },

      saveCustomPreset: (name: string) => {
        const state = get();
        const customPreset: LayoutPresetConfig = {
          id: 'custom',
          name,
          description: `Custom layout: ${name}`,
          sidebarPosition: state.sidebarPosition,
          sidebarState: state.sidebarState,
          sidebarWidth: state.sidebarWidth,
          gridColumns: 5,
          showHeader: true,
          showFooter: true,
          pipEnabled: state.pipConfig.enabled,
          compactMode: false,
        };

        set((s) => ({
          customPresets: [...s.customPresets, customPreset],
        }));
      },

      deleteCustomPreset: (id: string) => {
        set((s) => ({
          customPresets: s.customPresets.filter((p) => p.id !== id),
        }));
      },

      // Sidebar
      setSidebarPosition: (position: SidebarPosition) => {
        set({ sidebarPosition: position, currentPreset: 'custom' });
      },

      setSidebarState: (state: PanelState) => {
        set({ sidebarState: state });
      },

      toggleSidebar: () => {
        const current = get().sidebarState;
        const next = current === 'expanded' ? 'collapsed' : 'expanded';
        set({ sidebarState: next });
      },

      setSidebarWidth: (width: number) => {
        const clampedWidth = Math.max(200, Math.min(600, width));
        set({ sidebarWidth: clampedWidth, currentPreset: 'custom' });
      },

      // Panel
      setPanelConfig: (id: string, config: Partial<PanelConfig>) => {
        const panelConfigs = new Map(get().panelConfigs);
        const existing = panelConfigs.get(id) || createDefaultPanelConfig(id);
        panelConfigs.set(id, { ...existing, ...config });
        set({ panelConfigs });
      },

      collapsePanel: (id: string) => {
        const panelConfigs = new Map(get().panelConfigs);
        const existing = panelConfigs.get(id);
        if (existing) {
          panelConfigs.set(id, { ...existing, state: 'collapsed' });
          set({ panelConfigs });
        }
      },

      expandPanel: (id: string) => {
        const panelConfigs = new Map(get().panelConfigs);
        const existing = panelConfigs.get(id);
        if (existing) {
          panelConfigs.set(id, { ...existing, state: 'expanded' });
          set({ panelConfigs });
        }
      },

      togglePanel: (id: string) => {
        const panelConfigs = new Map(get().panelConfigs);
        const existing = panelConfigs.get(id);
        if (existing) {
          const nextState =
            existing.state === 'expanded' ? 'collapsed' : 'expanded';
          panelConfigs.set(id, { ...existing, state: nextState });
          set({ panelConfigs });
        }
      },

      // Resize
      startResize: (_panelId: string) => {
        set({ isTransitioning: true });
      },

      updateResize: (event: ResizeEvent) => {
        const panelConfigs = new Map(get().panelConfigs);
        const existing = panelConfigs.get(event.panelId);
        if (existing) {
          const newConfig = { ...existing };
          if (event.direction === 'horizontal') {
            newConfig.width = Math.max(
              existing.minWidth,
              Math.min(existing.maxWidth, event.newSize)
            );
          } else {
            newConfig.height = Math.max(
              existing.minHeight,
              Math.min(existing.maxHeight, event.newSize)
            );
          }
          panelConfigs.set(event.panelId, newConfig);
          set({ panelConfigs });
        }
      },

      endResize: () => {
        set({ isTransitioning: false });
      },

      // PiP
      setPipEnabled: (enabled: boolean) => {
        set((s) => ({
          pipConfig: { ...s.pipConfig, enabled },
        }));
      },

      setPipPosition: (x: number, y: number) => {
        set((s) => ({
          pipConfig: { ...s.pipConfig, position: { x, y }, isDocked: false },
        }));
      },

      setPipSize: (width: number, height: number) => {
        set((s) => ({
          pipConfig: { ...s.pipConfig, size: { width, height } },
        }));
      },

      dockPip: (position: PipConfig['dockPosition']) => {
        set((s) => ({
          pipConfig: { ...s.pipConfig, isDocked: true, dockPosition: position },
        }));
      },

      // Gestures
      setGestureEnabled: (enabled: boolean) => {
        set({ gestureEnabled: enabled });
      },

      handleGesture: (_gesture) => {
        // Gesture handling is done in LayoutManager
      },

      // Dimensions
      updateDimensions: (dimensions: Partial<LayoutDimensions>) => {
        set((s) => ({
          dimensions: { ...s.dimensions, ...dimensions },
        }));
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'goat_layout_state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentPreset: state.currentPreset,
        sidebarPosition: state.sidebarPosition,
        sidebarState: state.sidebarState,
        sidebarWidth: state.sidebarWidth,
        pipConfig: state.pipConfig,
        gestureEnabled: state.gestureEnabled,
        customPresets: state.customPresets,
      }),
      // Custom serialization for Map
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LayoutState>;
        return {
          ...currentState,
          ...persisted,
          panelConfigs: new Map(), // Maps don't persist well, recreate empty
          dimensions: currentState.dimensions, // Don't persist dimensions
        };
      },
    }
  )
);

/**
 * Selectors
 */
export const useCurrentBreakpoint = () =>
  useLayoutStore((state) => state.currentBreakpoint);

export const useCurrentPreset = () =>
  useLayoutStore((state) => state.currentPreset);

export const useSidebarPosition = () =>
  useLayoutStore((state) => state.sidebarPosition);

export const useSidebarState = () =>
  useLayoutStore((state) => state.sidebarState);

export const useSidebarWidth = () =>
  useLayoutStore((state) => state.sidebarWidth);

export const usePipConfig = () => useLayoutStore((state) => state.pipConfig);

export const useLayoutDimensions = () =>
  useLayoutStore((state) => state.dimensions);

export const useIsTransitioning = () =>
  useLayoutStore((state) => state.isTransitioning);

export const useGestureEnabled = () =>
  useLayoutStore((state) => state.gestureEnabled);
