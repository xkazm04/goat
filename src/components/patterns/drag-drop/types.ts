/**
 * Drag-Drop Pattern Library Types
 *
 * Shared types for drag-drop interactions across the application.
 * These types provide a consistent interface for drag operations,
 * velocity tracking, and physics-based animations.
 */

// =============================================================================
// Core Drag Types
// =============================================================================

export interface Vector2D {
  x: number;
  y: number;
}

export interface DragPosition {
  x: number;
  y: number;
  time: number;
}

export interface DragVelocity extends Vector2D {
  speed: number;
  direction: number; // Radians
}

export interface DragData<T = unknown> {
  id: string;
  type: string;
  payload: T;
  sourcePosition?: number;
  metadata?: Record<string, unknown>;
}

export interface DropZoneData {
  id: string;
  position: number;
  accepts: string[];
  isOccupied: boolean;
  occupiedBy?: string;
}

// =============================================================================
// Physics & Animation Types
// =============================================================================

export interface GravityWell {
  position: number;
  radius: number;
  strength: number;
  priority?: number;
  active?: boolean;
}

export interface MagneticConfig {
  radius: number;
  strength: number;
  priority?: number;
  minStrength?: number;
  maxStrength?: number;
}

export interface PhysicsConfig {
  friction: number;
  mass: number;
  springStiffness: number;
  springDamping: number;
}

export interface InertiaConfig {
  damping: number;
  stiffness: number;
  restDelta?: number;
  restSpeed?: number;
}

// =============================================================================
// Drag State Types
// =============================================================================

export type DragPhase = 'idle' | 'dragging' | 'snapping' | 'settling';

export interface DragState {
  phase: DragPhase;
  activeId: string | null;
  overId: string | null;
  velocity: DragVelocity;
  position: Vector2D;
  startPosition: Vector2D;
  previewPosition: number | null;
  isDragging: boolean;
  isSnapping: boolean;
}

export interface DragResult {
  success: boolean;
  action: 'assign' | 'move' | 'swap' | 'remove' | 'cancel';
  sourceId: string;
  targetId?: string;
  sourcePosition?: number;
  targetPosition?: number;
  error?: string;
}

// =============================================================================
// Gesture Types
// =============================================================================

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type SwipeAction = 'quick-assign' | 'remove' | 'preview' | 'custom';

export interface SwipeConfig {
  threshold: number;
  direction: SwipeDirection[];
  actions: Record<SwipeDirection, SwipeAction>;
  enabled?: boolean;
}

export interface SwipeIndicator {
  direction: SwipeDirection | null;
  progress: number;
  action: SwipeAction | null;
  color?: string;
}

export interface GestureState {
  isLongPress: boolean;
  isSwiping: boolean;
  swipeDirection: SwipeDirection | null;
  swipeProgress: number;
  longPressDuration: number;
}

// =============================================================================
// Overlay Types
// =============================================================================

export interface DragOverlayConfig {
  showTrail: boolean;
  showGlow: boolean;
  showVelocityIndicator: boolean;
  showSnapPreview: boolean;
  trailLength: number;
  trailLifetime: number;
}

export interface TrailPoint extends DragPosition {
  opacity: number;
}

// =============================================================================
// Accessibility Types
// =============================================================================

export interface DragAnnouncement {
  onDragStart: (id: string, position?: number) => string;
  onDragOver: (id: string, overId: string | null) => string;
  onDragEnd: (id: string, targetId: string | null, success: boolean) => string;
  onDragCancel: (id: string) => string;
}

export interface KeyboardDragConfig {
  startKeys: string[];
  cancelKeys: string[];
  moveKeys: {
    up: string[];
    down: string[];
    left: string[];
    right: string[];
  };
  confirmKeys: string[];
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface DraggableProps<T = unknown> {
  id: string;
  data: DragData<T>;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;

  // Physics
  enableInertia?: boolean;
  inertiaConfig?: InertiaConfig;

  // Gestures
  enableSwipe?: boolean;
  swipeConfig?: SwipeConfig;
  enableLongPress?: boolean;
  longPressDelay?: number;

  // Callbacks
  onDragStart?: () => void;
  onDragEnd?: (result: DragResult) => void;
  onSwipe?: (direction: SwipeDirection, action: SwipeAction) => void;
  onLongPress?: () => void;
}

export interface DroppableProps {
  id: string;
  position: number;
  accepts: string[];
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;

  // Visual
  showHighlight?: boolean;
  highlightColor?: string;

  // Magnetic physics
  enableMagnetic?: boolean;
  magneticConfig?: MagneticConfig;

  // State
  isOccupied?: boolean;
  occupiedBy?: string;

  // Callbacks
  onDrop?: (data: DragData) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

export interface DragOverlayProps {
  activeItem: DragData | null;
  velocity: DragVelocity;
  config?: Partial<DragOverlayConfig>;
  children?: React.ReactNode;
  renderItem?: (data: DragData) => React.ReactNode;
}

// =============================================================================
// Hook Return Types
// =============================================================================

export interface UseVelocityTrackingReturn {
  velocity: DragVelocity;
  updatePosition: (position: Vector2D) => void;
  reset: () => void;
}

export interface UseGravityWellsReturn {
  activeWell: GravityWell | null;
  checkPosition: (position: Vector2D) => GravityWell | null;
  getStrength: (position: Vector2D) => number;
  wells: GravityWell[];
}

export interface UseMagneticSnapReturn {
  isInRange: boolean;
  strength: number;
  targetPosition: Vector2D | null;
  calculateSnap: (position: Vector2D) => Vector2D;
}

export interface UseDragStateReturn {
  state: DragState;
  startDrag: (id: string, position: Vector2D) => void;
  updateDrag: (position: Vector2D, velocity: DragVelocity) => void;
  endDrag: (result: DragResult) => void;
  cancelDrag: () => void;
  setPreviewPosition: (position: number | null) => void;
}

// =============================================================================
// Context Types
// =============================================================================

export interface DragContextValue {
  state: DragState;
  config: {
    physics: PhysicsConfig;
    overlay: DragOverlayConfig;
    accessibility: DragAnnouncement;
  };
  registerDropZone: (zone: DropZoneData) => void;
  unregisterDropZone: (id: string) => void;
  getDropZones: () => DropZoneData[];
}
