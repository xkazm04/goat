/**
 * Adaptive Responsive Layout Constants
 * Configuration values for the layout management system
 */

import type {
  Breakpoint,
  BreakpointConfig,
  LayoutPreset,
  LayoutPresetConfig,
  GestureConfig,
  GestureType,
  PipConfig,
} from './types';

/**
 * Breakpoint configurations
 */
export const BREAKPOINTS: Record<Breakpoint, BreakpointConfig> = {
  mobile: {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 639,
    columns: 2,
    sidebarWidth: 0, // Full width overlay on mobile
    panelMinHeight: 200,
  },
  tablet: {
    name: 'tablet',
    minWidth: 640,
    maxWidth: 1023,
    columns: 3,
    sidebarWidth: 280,
    panelMinHeight: 300,
  },
  desktop: {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1535,
    columns: 5,
    sidebarWidth: 320,
    panelMinHeight: 400,
  },
  ultrawide: {
    name: 'ultrawide',
    minWidth: 1536,
    maxWidth: Infinity,
    columns: 6,
    sidebarWidth: 400,
    panelMinHeight: 500,
  },
};

/**
 * Get breakpoint from window width
 */
export function getBreakpointFromWidth(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet.minWidth) return 'mobile';
  if (width < BREAKPOINTS.desktop.minWidth) return 'tablet';
  if (width < BREAKPOINTS.ultrawide.minWidth) return 'desktop';
  return 'ultrawide';
}

/**
 * Layout preset configurations
 */
export const LAYOUT_PRESETS: Record<LayoutPreset, LayoutPresetConfig> = {
  focus: {
    id: 'focus',
    name: 'Focus Mode',
    description: 'Minimal UI for concentrated ranking',
    icon: '🎯',
    sidebarPosition: 'right',
    sidebarState: 'collapsed',
    sidebarWidth: 280,
    gridColumns: 5,
    showHeader: false,
    showFooter: false,
    pipEnabled: true,
    compactMode: true,
  },
  browse: {
    id: 'browse',
    name: 'Browse Mode',
    description: 'Explore and discover items',
    icon: '📚',
    sidebarPosition: 'left',
    sidebarState: 'expanded',
    sidebarWidth: 360,
    gridColumns: 4,
    showHeader: true,
    showFooter: true,
    pipEnabled: false,
    compactMode: false,
  },
  compare: {
    id: 'compare',
    name: 'Compare Mode',
    description: 'Side-by-side comparison workflow',
    icon: '⚖️',
    sidebarPosition: 'left',
    sidebarState: 'expanded',
    sidebarWidth: 400,
    gridColumns: 3,
    showHeader: true,
    showFooter: false,
    pipEnabled: true,
    compactMode: false,
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile Mode',
    description: 'Optimized for touch devices',
    icon: '📱',
    sidebarPosition: 'bottom',
    sidebarState: 'collapsed',
    sidebarWidth: 0,
    gridColumns: 2,
    showHeader: true,
    showFooter: false,
    pipEnabled: false,
    compactMode: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Your personalized layout',
    icon: '⚙️',
    sidebarPosition: 'left',
    sidebarState: 'expanded',
    sidebarWidth: 320,
    gridColumns: 5,
    showHeader: true,
    showFooter: true,
    pipEnabled: false,
    compactMode: false,
  },
};

/**
 * Default gesture configurations
 */
export const DEFAULT_GESTURES: GestureConfig[] = [
  { gesture: 'swipe-left', action: 'collapseSidebar', enabled: true, threshold: 50 },
  { gesture: 'swipe-right', action: 'expandSidebar', enabled: true, threshold: 50 },
  { gesture: 'swipe-up', action: 'scrollUp', enabled: true, threshold: 30 },
  { gesture: 'swipe-down', action: 'scrollDown', enabled: true, threshold: 30 },
  { gesture: 'pinch-in', action: 'zoomOut', enabled: true, threshold: 0.8 },
  { gesture: 'pinch-out', action: 'zoomIn', enabled: true, threshold: 1.2 },
  { gesture: 'double-tap', action: 'toggleSidebar', enabled: true },
  { gesture: 'long-press', action: 'showQuickActions', enabled: true, threshold: 500 },
];

/**
 * Default PiP configuration
 */
export const DEFAULT_PIP_CONFIG: PipConfig = {
  enabled: false,
  position: { x: 20, y: 20 },
  size: { width: 280, height: 200 },
  isDocked: true,
  dockPosition: 'bottom-right',
  opacity: 0.95,
  showControls: true,
};

/**
 * Sidebar width constraints
 */
export const SIDEBAR_CONSTRAINTS = {
  minWidth: 200,
  maxWidth: 600,
  defaultWidth: 320,
  collapseThreshold: 280,
  snapPoints: [200, 280, 320, 400, 500],
} as const;

/**
 * Animation configurations
 */
export const LAYOUT_ANIMATIONS = {
  sidebar: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 1,
  },
  panel: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 35,
    mass: 0.8,
  },
  pip: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 40,
    mass: 0.6,
  },
  transition: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const,
  },
};

/**
 * Z-index layers
 */
export const LAYOUT_Z_INDEX = {
  base: 0,
  sidebar: 10,
  panel: 20,
  overlay: 30,
  pip: 40,
  modal: 50,
  tooltip: 60,
} as const;

/**
 * Touch gesture thresholds
 */
export const GESTURE_THRESHOLDS = {
  swipeMinDistance: 50,
  swipeMaxDuration: 300,
  pinchMinScale: 0.1,
  longPressDelay: 500,
  doubleTapDelay: 300,
  velocityThreshold: 0.5,
} as const;

/**
 * CSS custom properties for layout
 */
export const LAYOUT_CSS_VARS = {
  sidebarWidth: '--layout-sidebar-width',
  headerHeight: '--layout-header-height',
  footerHeight: '--layout-footer-height',
  gridColumns: '--layout-grid-columns',
  panelGap: '--layout-panel-gap',
  transitionDuration: '--layout-transition-duration',
} as const;

/**
 * Get recommended preset for breakpoint
 */
export function getRecommendedPreset(breakpoint: Breakpoint): LayoutPreset {
  switch (breakpoint) {
    case 'mobile':
      return 'mobile';
    case 'tablet':
      return 'browse';
    case 'desktop':
      return 'browse';
    case 'ultrawide':
      return 'compare';
    default:
      return 'browse';
  }
}

/**
 * Check if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}
