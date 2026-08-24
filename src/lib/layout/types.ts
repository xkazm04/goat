/**
 * Adaptive Responsive Layout Types
 * Type definitions for the layout management system
 */

/**
 * Breakpoint names
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

/**
 * Sidebar position options
 */
export type SidebarPosition = 'left' | 'right' | 'bottom' | 'floating';

/**
 * Panel collapse state
 */
export type PanelState = 'expanded' | 'collapsed' | 'minimized' | 'hidden';

/**
 * Layout preset names
 */
export type LayoutPreset = 'focus' | 'browse' | 'compare' | 'mobile' | 'custom';

/**
 * Gesture types
 */
export type GestureType =
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch-in'
  | 'pinch-out'
  | 'tap'
  | 'double-tap'
  | 'long-press';

/**
 * Breakpoint configuration
 */
export interface BreakpointConfig {
  name: Breakpoint;
  minWidth: number;
  maxWidth: number;
  columns: number;
  sidebarWidth: number;
  panelMinHeight: number;
}

/**
 * Panel configuration
 */
export interface PanelConfig {
  id: string;
  position: SidebarPosition;
  state: PanelState;
  width: number;
  minWidth: number;
  maxWidth: number;
  height: number;
  minHeight: number;
  maxHeight: number;
  isResizable: boolean;
  isDraggable: boolean;
  showHandle: boolean;
  zIndex: number;
}

/**
 * Layout preset configuration
 */
export interface LayoutPresetConfig {
  id: LayoutPreset;
  name: string;
  description: string;
  icon?: string;
  sidebarPosition: SidebarPosition;
  sidebarState: PanelState;
  sidebarWidth: number;
  gridColumns: number;
  showHeader: boolean;
  showFooter: boolean;
  pipEnabled: boolean;
  compactMode: boolean;
}

/**
 * Gesture configuration
 */
export interface GestureConfig {
  gesture: GestureType;
  action: string;
  enabled: boolean;
  threshold?: number;
}

/**
 * Resize event data
 */
export interface ResizeEvent {
  panelId: string;
  direction: 'horizontal' | 'vertical';
  delta: number;
  newSize: number;
  clientX: number;
  clientY: number;
}

/**
 * Layout dimensions
 */
export interface LayoutDimensions {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  sidebarWidth: number;
  sidebarHeight: number;
  headerHeight: number;
  footerHeight: number;
}

/**
 * Picture-in-Picture configuration
 */
export interface PipConfig {
  enabled: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isDocked: boolean;
  dockPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  showControls: boolean;
}

/**
 * Dock edge for detachable windows
 */
export type DockEdge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Detached window configuration
 */
export interface DetachedWindowConfig {
  id: string;
  title: string;
  /** Source panel this was detached from (e.g. 'collection-browser', 'item-detail') */
  sourcePanel: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  zIndex: number;
  opacity: number;
  /** Whether the window is docked to a viewport edge */
  isDocked: boolean;
  dockEdge: DockEdge | null;
  /** Whether the window is minimized to a taskbar-like strip */
  isMinimized: boolean;
  /** Whether the window is maximized to fill the viewport */
  isMaximized: boolean;
  /** Stored position/size before maximize, for restore */
  preMaximize: { position: { x: number; y: number }; size: { width: number; height: number } } | null;
}

/**
 * Layout state
 */
export interface LayoutState {
  currentBreakpoint: Breakpoint;
  currentPreset: LayoutPreset;
  sidebarPosition: SidebarPosition;
  sidebarState: PanelState;
  sidebarWidth: number;
  panelConfigs: Map<string, PanelConfig>;
  pipConfig: PipConfig;
  dimensions: LayoutDimensions;
  isTransitioning: boolean;
  gestureEnabled: boolean;
  customPresets: LayoutPresetConfig[];
  /** Multi-window workspace: detached floating windows */
  detachedWindows: Map<string, DetachedWindowConfig>;
  /** Tracks which window is currently focused (topmost) */
  activeWindowId: string | null;
  /** Global counter for z-index stacking */
  nextWindowZIndex: number;
}

/**
 * Layout actions
 */
export interface LayoutActions {
  // Breakpoint
  setBreakpoint: (breakpoint: Breakpoint) => void;
  detectBreakpoint: () => void;

  // Preset
  setPreset: (preset: LayoutPreset) => void;
  applyPreset: (config: LayoutPresetConfig) => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;

  // Sidebar
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarState: (state: PanelState) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  // Panel
  setPanelConfig: (id: string, config: Partial<PanelConfig>) => void;
  collapsePanel: (id: string) => void;
  expandPanel: (id: string) => void;
  togglePanel: (id: string) => void;

  // Resize
  startResize: (panelId: string) => void;
  updateResize: (event: ResizeEvent) => void;
  endResize: () => void;

  // PiP
  setPipEnabled: (enabled: boolean) => void;
  setPipPosition: (x: number, y: number) => void;
  setPipSize: (width: number, height: number) => void;
  dockPip: (position: PipConfig['dockPosition']) => void;

  // Gestures
  setGestureEnabled: (enabled: boolean) => void;
  handleGesture: (gesture: GestureType) => void;

  // Dimensions
  updateDimensions: (dimensions: Partial<LayoutDimensions>) => void;

  // Detached Windows (Multi-Window Workspace)
  detachWindow: (config: Omit<DetachedWindowConfig, 'zIndex'>) => void;
  attachWindow: (id: string) => void;
  updateWindow: (id: string, config: Partial<DetachedWindowConfig>) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  dockWindow: (id: string, edge: DockEdge) => void;
  undockWindow: (id: string) => void;
  closeAllWindows: () => void;
  arrangeWindows: (arrangement: 'cascade' | 'tile-horizontal' | 'tile-vertical') => void;

  // Reset
  reset: () => void;
}

/**
 * Storage keys
 */
export const LAYOUT_STORAGE_KEYS = {
  STATE: 'goat_layout_state',
  PRESETS: 'goat_layout_presets',
  PREFERENCES: 'goat_layout_preferences',
} as const;
