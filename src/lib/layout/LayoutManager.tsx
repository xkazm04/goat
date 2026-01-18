'use client';

/**
 * LayoutManager
 * Central layout state control and context provider
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useLayoutStore } from '@/stores/layout-store';
import {
  BREAKPOINTS,
  getBreakpointFromWidth,
  LAYOUT_PRESETS,
  SIDEBAR_CONSTRAINTS,
  getRecommendedPreset,
  isTouchDevice,
} from './constants';
import type {
  Breakpoint,
  LayoutPreset,
  LayoutPresetConfig,
  SidebarPosition,
  PanelState,
  GestureType,
  LayoutDimensions,
  PipConfig,
  PanelConfig,
} from './types';

/**
 * Layout context value
 */
interface LayoutContextValue {
  // State
  breakpoint: Breakpoint;
  preset: LayoutPreset;
  sidebarPosition: SidebarPosition;
  sidebarState: PanelState;
  sidebarWidth: number;
  dimensions: LayoutDimensions;
  isTransitioning: boolean;
  gestureEnabled: boolean;
  isTouchDevice: boolean;

  // Computed
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isUltrawide: boolean;
  isSidebarExpanded: boolean;
  isSidebarVisible: boolean;
  gridColumns: number;

  // Actions
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setPreset: (preset: LayoutPreset) => void;
  applyPreset: (config: LayoutPresetConfig) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarState: (state: PanelState) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setGestureEnabled: (enabled: boolean) => void;
  handleGesture: (gesture: GestureType) => void;

  // PiP
  pipConfig: PipConfig;
  setPipEnabled: (enabled: boolean) => void;
  setPipPosition: (x: number, y: number) => void;
  dockPip: (position: PipConfig['dockPosition']) => void;

  // Panels
  getPanelConfig: (id: string) => PanelConfig | undefined;
  setPanelConfig: (id: string, config: Partial<PanelConfig>) => void;
  collapsePanel: (id: string) => void;
  expandPanel: (id: string) => void;
  togglePanel: (id: string) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

/**
 * Hook to use layout context
 */
export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

/**
 * Layout Provider Props
 */
interface LayoutProviderProps {
  children: ReactNode;
  defaultPreset?: LayoutPreset;
  enableGestures?: boolean;
}

/**
 * LayoutProvider Component
 */
export function LayoutProvider({
  children,
  defaultPreset,
  enableGestures = true,
}: LayoutProviderProps) {
  const store = useLayoutStore();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isTouchRef = useRef(false);

  // Detect touch device on mount
  useEffect(() => {
    isTouchRef.current = isTouchDevice();
    store.setGestureEnabled(enableGestures && isTouchRef.current);
  }, [enableGestures, store]);

  // Handle resize with ResizeObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const newBreakpoint = getBreakpointFromWidth(width);

      // Update dimensions
      store.updateDimensions({
        viewportWidth: width,
        viewportHeight: height,
      });

      // Update breakpoint if changed
      if (newBreakpoint !== store.currentBreakpoint) {
        store.setBreakpoint(newBreakpoint);

        // Auto-apply recommended preset on major breakpoint change
        if (store.currentPreset !== 'custom') {
          const recommended = getRecommendedPreset(newBreakpoint);
          if (recommended !== store.currentPreset) {
            store.setPreset(recommended);
          }
        }
      }
    };

    // Initial detection
    handleResize();

    // Set up ResizeObserver on body
    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(document.body);

    // Also listen to window resize for viewport changes
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserverRef.current?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [store]);

  // Apply default preset on mount
  useEffect(() => {
    if (defaultPreset && !store.currentPreset) {
      store.setPreset(defaultPreset);
    }
  }, [defaultPreset, store]);

  // Gesture handler
  const handleGesture = useCallback(
    (gesture: GestureType) => {
      if (!store.gestureEnabled) return;

      switch (gesture) {
        case 'swipe-left':
          if (store.sidebarPosition === 'right') {
            store.setSidebarState('expanded');
          } else {
            store.setSidebarState('collapsed');
          }
          break;
        case 'swipe-right':
          if (store.sidebarPosition === 'left') {
            store.setSidebarState('expanded');
          } else {
            store.setSidebarState('collapsed');
          }
          break;
        case 'double-tap':
          store.toggleSidebar();
          break;
        case 'pinch-in':
          // Could zoom out grid
          break;
        case 'pinch-out':
          // Could zoom in grid
          break;
        default:
          break;
      }
    },
    [store]
  );

  // Computed values
  const computed = useMemo(
    () => ({
      isMobile: store.currentBreakpoint === 'mobile',
      isTablet: store.currentBreakpoint === 'tablet',
      isDesktop: store.currentBreakpoint === 'desktop',
      isUltrawide: store.currentBreakpoint === 'ultrawide',
      isSidebarExpanded: store.sidebarState === 'expanded',
      isSidebarVisible:
        store.sidebarState === 'expanded' || store.sidebarState === 'collapsed',
      gridColumns: BREAKPOINTS[store.currentBreakpoint].columns,
    }),
    [store.currentBreakpoint, store.sidebarState]
  );

  // Context value
  const value = useMemo<LayoutContextValue>(
    () => ({
      // State
      breakpoint: store.currentBreakpoint,
      preset: store.currentPreset,
      sidebarPosition: store.sidebarPosition,
      sidebarState: store.sidebarState,
      sidebarWidth: store.sidebarWidth,
      dimensions: store.dimensions,
      isTransitioning: store.isTransitioning,
      gestureEnabled: store.gestureEnabled,
      isTouchDevice: isTouchRef.current,

      // Computed
      ...computed,

      // Actions
      setBreakpoint: store.setBreakpoint,
      setPreset: store.setPreset,
      applyPreset: store.applyPreset,
      setSidebarPosition: store.setSidebarPosition,
      setSidebarState: store.setSidebarState,
      toggleSidebar: store.toggleSidebar,
      setSidebarWidth: store.setSidebarWidth,
      setGestureEnabled: store.setGestureEnabled,
      handleGesture,

      // PiP
      pipConfig: store.pipConfig,
      setPipEnabled: store.setPipEnabled,
      setPipPosition: store.setPipPosition,
      dockPip: store.dockPip,

      // Panels
      getPanelConfig: (id: string) => store.panelConfigs.get(id),
      setPanelConfig: store.setPanelConfig,
      collapsePanel: store.collapsePanel,
      expandPanel: store.expandPanel,
      togglePanel: store.togglePanel,
    }),
    [store, computed, handleGesture]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

/**
 * Convenience hooks for specific layout properties
 */
export function useBreakpoint(): Breakpoint {
  return useLayout().breakpoint;
}

export function useIsMobile(): boolean {
  return useLayout().isMobile;
}

export function useIsDesktop(): boolean {
  return useLayout().isDesktop || useLayout().isUltrawide;
}

export function useSidebarState(): {
  position: SidebarPosition;
  state: PanelState;
  width: number;
  isExpanded: boolean;
  isVisible: boolean;
  toggle: () => void;
  setWidth: (width: number) => void;
} {
  const layout = useLayout();
  return {
    position: layout.sidebarPosition,
    state: layout.sidebarState,
    width: layout.sidebarWidth,
    isExpanded: layout.isSidebarExpanded,
    isVisible: layout.isSidebarVisible,
    toggle: layout.toggleSidebar,
    setWidth: layout.setSidebarWidth,
  };
}

export function useLayoutPreset(): {
  current: LayoutPreset;
  config: LayoutPresetConfig;
  setPreset: (preset: LayoutPreset) => void;
  applyPreset: (config: LayoutPresetConfig) => void;
} {
  const layout = useLayout();
  return {
    current: layout.preset,
    config: LAYOUT_PRESETS[layout.preset],
    setPreset: layout.setPreset,
    applyPreset: layout.applyPreset,
  };
}

export function usePictureInPicture(): {
  config: PipConfig;
  setEnabled: (enabled: boolean) => void;
  setPosition: (x: number, y: number) => void;
  dock: (position: PipConfig['dockPosition']) => void;
} {
  const layout = useLayout();
  return {
    config: layout.pipConfig,
    setEnabled: layout.setPipEnabled,
    setPosition: layout.setPipPosition,
    dock: layout.dockPip,
  };
}
