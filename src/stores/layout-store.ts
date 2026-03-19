/**
 * Layout Store
 * Zustand store for adaptive responsive layout state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BREAKPOINTS, getBreakpointFromWidth } from '@/lib/layout/constants';
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
  DetachedWindowConfig,
  DockEdge,
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
 * Base z-index for detached windows
 */
const WINDOW_BASE_Z_INDEX = 100;

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
  detachedWindows: new Map<string, DetachedWindowConfig>(),
  activeWindowId: null,
  nextWindowZIndex: WINDOW_BASE_Z_INDEX,
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
        // Use centralized breakpoint thresholds from layout/constants.ts
        const breakpoint = getBreakpointFromWidth(window.innerWidth);
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

      // Detached Windows
      detachWindow: (config: Omit<DetachedWindowConfig, 'zIndex'>) => {
        const state = get();
        const nextZ = state.nextWindowZIndex + 1;
        const detachedWindows = new Map(state.detachedWindows);
        detachedWindows.set(config.id, { ...config, zIndex: nextZ });
        set({ detachedWindows, activeWindowId: config.id, nextWindowZIndex: nextZ });
      },

      attachWindow: (id: string) => {
        const detachedWindows = new Map(get().detachedWindows);
        detachedWindows.delete(id);
        const activeWindowId = get().activeWindowId === id ? null : get().activeWindowId;
        set({ detachedWindows, activeWindowId });
      },

      updateWindow: (id: string, config: Partial<DetachedWindowConfig>) => {
        const detachedWindows = new Map(get().detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing) {
          detachedWindows.set(id, { ...existing, ...config });
          set({ detachedWindows });
        }
      },

      focusWindow: (id: string) => {
        const state = get();
        const detachedWindows = new Map(state.detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing) {
          const nextZ = state.nextWindowZIndex + 1;
          detachedWindows.set(id, { ...existing, zIndex: nextZ });
          set({ detachedWindows, activeWindowId: id, nextWindowZIndex: nextZ });
        }
      },

      minimizeWindow: (id: string) => {
        const detachedWindows = new Map(get().detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing) {
          detachedWindows.set(id, { ...existing, isMinimized: true });
          set({ detachedWindows });
        }
      },

      maximizeWindow: (id: string) => {
        const detachedWindows = new Map(get().detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing && !existing.isMaximized) {
          detachedWindows.set(id, {
            ...existing,
            isMaximized: true,
            isMinimized: false,
            preMaximize: { position: existing.position, size: existing.size },
          });
          set({ detachedWindows });
        }
      },

      restoreWindow: (id: string) => {
        const detachedWindows = new Map(get().detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing) {
          if (existing.isMaximized && existing.preMaximize) {
            detachedWindows.set(id, {
              ...existing,
              isMaximized: false,
              isMinimized: false,
              position: existing.preMaximize.position,
              size: existing.preMaximize.size,
              preMaximize: null,
            });
          } else {
            detachedWindows.set(id, { ...existing, isMinimized: false, isMaximized: false });
          }
          set({ detachedWindows });
        }
      },

      dockWindow: (id: string, edge: DockEdge) => {
        const detachedWindows = new Map(get().detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing) {
          detachedWindows.set(id, {
            ...existing,
            isDocked: true,
            dockEdge: edge,
            isMaximized: false,
            isMinimized: false,
            preMaximize: existing.preMaximize || { position: existing.position, size: existing.size },
          });
          set({ detachedWindows });
        }
      },

      undockWindow: (id: string) => {
        const detachedWindows = new Map(get().detachedWindows);
        const existing = detachedWindows.get(id);
        if (existing) {
          const restored = existing.preMaximize || { position: existing.position, size: existing.size };
          detachedWindows.set(id, {
            ...existing,
            isDocked: false,
            dockEdge: null,
            position: restored.position,
            size: restored.size,
            preMaximize: null,
          });
          set({ detachedWindows });
        }
      },

      closeAllWindows: () => {
        set({ detachedWindows: new Map(), activeWindowId: null });
      },

      arrangeWindows: (arrangement: 'cascade' | 'tile-horizontal' | 'tile-vertical') => {
        const state = get();
        const detachedWindows = new Map(state.detachedWindows);
        const windows = Array.from(detachedWindows.values()).filter((w) => !w.isMinimized);
        if (windows.length === 0) return;

        const { viewportWidth, viewportHeight } = state.dimensions;
        const padding = 20;
        const usableW = viewportWidth - padding * 2;
        const usableH = viewportHeight - padding * 2;

        windows.forEach((win, i) => {
          let position = win.position;
          let size = win.size;

          switch (arrangement) {
            case 'cascade': {
              const offset = i * 30;
              position = { x: padding + offset, y: padding + offset };
              size = { width: Math.min(win.size.width, usableW - offset), height: Math.min(win.size.height, usableH - offset) };
              break;
            }
            case 'tile-horizontal': {
              const colWidth = Math.floor(usableW / windows.length);
              position = { x: padding + i * colWidth, y: padding };
              size = { width: colWidth - 4, height: usableH };
              break;
            }
            case 'tile-vertical': {
              const rowHeight = Math.floor(usableH / windows.length);
              position = { x: padding, y: padding + i * rowHeight };
              size = { width: usableW, height: rowHeight - 4 };
              break;
            }
          }

          detachedWindows.set(win.id, {
            ...win,
            position,
            size: {
              width: Math.max(win.minSize.width, Math.min(win.maxSize.width, size.width)),
              height: Math.max(win.minSize.height, Math.min(win.maxSize.height, size.height)),
            },
            isDocked: false,
            dockEdge: null,
            isMaximized: false,
            isMinimized: false,
            preMaximize: null,
          });
        });

        set({ detachedWindows });
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
        // Serialize detached windows as array for persistence
        detachedWindows: Array.from(state.detachedWindows.entries()),
        activeWindowId: state.activeWindowId,
        nextWindowZIndex: state.nextWindowZIndex,
      }),
      // Custom serialization for Map
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LayoutState> & { detachedWindows?: [string, DetachedWindowConfig][] };
        // Restore detached windows from serialized array
        let detachedWindows = new Map<string, DetachedWindowConfig>();
        if (Array.isArray(persisted.detachedWindows)) {
          detachedWindows = new Map(persisted.detachedWindows);
        }
        return {
          ...currentState,
          ...persisted,
          panelConfigs: new Map(), // Maps don't persist well, recreate empty
          detachedWindows,
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

export const useDetachedWindows = () =>
  useLayoutStore((state) => state.detachedWindows);

export const useActiveWindowId = () =>
  useLayoutStore((state) => state.activeWindowId);
