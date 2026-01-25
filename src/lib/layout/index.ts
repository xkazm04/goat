/**
 * Adaptive Responsive Layout System
 * Module exports for layout management
 */

// Types
export type {
  Breakpoint,
  SidebarPosition,
  PanelState,
  LayoutPreset,
  GestureType,
  BreakpointConfig,
  PanelConfig,
  LayoutPresetConfig,
  GestureConfig,
  ResizeEvent,
  LayoutDimensions,
  PipConfig,
  LayoutState,
  LayoutActions,
} from './types';

export { LAYOUT_STORAGE_KEYS } from './types';

// Container Query Types
export type {
  ContainerBreakpoint,
  ContainerBreakpointConfig,
  ContainerDimensions,
  ContainerContextValue,
  ContainerProviderProps,
} from './ContainerProvider';

// Constants
export {
  BREAKPOINTS,
  getBreakpointFromWidth,
  LAYOUT_PRESETS,
  DEFAULT_GESTURES,
  DEFAULT_PIP_CONFIG,
  SIDEBAR_CONSTRAINTS,
  LAYOUT_ANIMATIONS,
  LAYOUT_Z_INDEX,
  GESTURE_THRESHOLDS,
  LAYOUT_CSS_VARS,
  getRecommendedPreset,
  isTouchDevice,
} from './constants';

// LayoutManager
export {
  LayoutProvider,
  useLayout,
  useBreakpoint,
  useIsMobile,
  useIsDesktop,
  useSidebarState,
  useLayoutPreset,
  usePictureInPicture,
} from './LayoutManager';

// ResponsiveContainer
export {
  ResponsiveContainer,
  ResponsiveShow,
  ResponsiveHide,
  ResponsiveGrid,
  ResponsiveStack,
} from './components/ResponsiveContainer';

// CollapsiblePanel
export {
  CollapsiblePanel,
  Sidebar,
} from './components/CollapsiblePanel';

// ResizableHandle
export {
  ResizableHandle,
  ResizablePanel,
  SidebarResizeHandle,
} from './components/ResizableHandle';

// LayoutPresetSelector
export {
  LayoutPresetSelector,
  PresetPreview,
  QuickLayoutSwitcher,
} from './components/LayoutPresetSelector';

// TouchGestureHandler
export {
  TouchGestureHandler,
  useGesture,
} from './components/TouchGestureHandler';

// PictureInPicture
export {
  PictureInPicture,
  PipToggleButton,
  usePip,
} from './components/PictureInPicture';

// ContainerProvider (Container Queries)
export {
  ContainerProvider,
  useContainer,
  useContainerSafe,
  withContainer,
  CONTAINER_BREAKPOINTS,
  getContainerBreakpointFromWidth,
} from './ContainerProvider';

// Responsive Utilities
export {
  fluidTypography,
  fluidContainer,
  fluidTypeScale,
  fluidContainerTypeScale,
  fluidSpacing,
  resolveResponsiveValue,
  responsiveCSSVars,
  containerQueryClasses,
  responsiveGridCols,
  responsiveGap,
  DynamicBreakpoints,
  defaultBreakpoints,
  cssUtils,
  supportsContainerQueries,
  featureSupport,
} from './responsive-utils';

export type {
  FluidTypographyConfig,
  ResponsiveValue,
} from './responsive-utils';
