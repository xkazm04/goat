/**
 * Match Grid Components Exports
 *
 * Centralized exports for match grid UI components including
 * physics-enhanced components.
 */

// Core view components
export { ViewSwitcher } from './ViewSwitcher';
export type { ViewMode } from './ViewSwitcher';
export { PodiumView } from './PodiumView';
export { GoatView } from './GoatView';
export { MountRushmoreView } from './MountRushmoreView';
export { TierListView } from './TierListView';
export { TierRow, UnrankedPool } from './TierRow';
export { TierConfigurator } from './TierConfigurator';
export { GridSection } from './GridSection';
export { MatchGridHeader } from './MatchGridHeader';

// Drag components
export { SimpleDragOverlay } from './SimpleDragOverlay';
export { PortalDragOverlay } from './PortalDragOverlay';
export { DragOverlayContent, DragTrail, CursorGlow } from './DragComponents';

// Physics components
export { PhysicsGridSlot } from './PhysicsGridSlot';
export { PhysicsDragOverlay, PhysicsTrail, GravityWellConnector } from './PhysicsDragOverlay';
export { SwapAnimation } from './SwapAnimation';

// Drop zone components
export { DropZoneHighlightProvider, useDropZoneHighlight } from './DropZoneHighlightContext';
export { DropZoneConnectors } from './DropZoneConnectors';

// State management components
export { DragStateManager, useDragState, useOptionalDragState } from './DragStateManager';
export {
  AnimationController,
  useAnimations,
  useOptionalAnimations,
  useIsBouncing,
  useHasCelebration,
  useSwapAnimation,
} from './AnimationController';

// Grid rendering components
export { GridRenderer, MemoizedPositionSlot } from './GridRenderer';
export { TierSection } from './TierSection';

