/**
 * Match Grid Components Exports
 *
 * Centralized exports for match grid UI components including
 * physics-enhanced components.
 */

// Core view components
// PodiumView, GoatView, MountRushmoreView are lazy-loaded via React.lazy in GridRenderer
export { ViewSwitcher } from './ViewSwitcher';
export type { ViewMode } from './ViewSwitcher';
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
//
// `DragStateManager` (a full React drag-state context provider, 424 lines) was
// exported here and rendered by nothing. This line was its only reference.
// Drag state in this feature has ONE owner: SimpleMatchGrid, whose named
// `resetDragState` reaper is called from every drag exit. A third
// implementation, src/hooks/use-drag-sync.ts, had no reference at all.
// Both deleted 2026-08-24.
export {
  AnimationController,
  useAnimations,
  useOptionalAnimations,
  useIsBouncing,
  useHasCelebration,
  useSwapAnimation,
} from './AnimationController';

// Grid rendering components
export { GridRenderer, ViewSelector, MemoizedPositionSlot } from './GridRenderer';
export { TierSection } from './TierSection';

