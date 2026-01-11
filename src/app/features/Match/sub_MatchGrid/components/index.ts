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
export { GridSection } from './GridSection';
export { MatchGridHeader } from './MatchGridHeader';

// Drag components
export { DragOverlayContent, DragTrail, CursorGlow, SnapPreviewGrid } from './DragComponents';
export { InertiaDraggable, useDragVelocity } from './InertiaDraggable';

// Physics components
export { PhysicsGridSlot } from './PhysicsGridSlot';
export { PhysicsDragOverlay, PhysicsTrail, GravityWellConnector } from './PhysicsDragOverlay';
export { SwapAnimation } from './SwapAnimation';

// Drop zone components
export { DropZoneHighlightProvider, useDropZoneHighlight } from './DropZoneHighlightContext';
export { DropZoneConnectors } from './DropZoneConnectors';
