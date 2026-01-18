/**
 * GestureRecognizer
 * Unified gesture detection system with state machine for clean disambiguation
 * Handles swipes, long-press, pinch, and momentum-based flicking
 */

/**
 * Supported gesture types
 */
export type GestureType =
  | "none"
  | "tap"
  | "double-tap"
  | "long-press"
  | "swipe-left"
  | "swipe-right"
  | "swipe-up"
  | "swipe-down"
  | "pinch-in"
  | "pinch-out"
  | "flick"
  | "drag"
  | "scroll";

/**
 * Gesture state machine states
 */
export type GestureState =
  | "idle"
  | "touch-start"
  | "possible-tap"
  | "possible-long-press"
  | "dragging"
  | "swiping"
  | "pinching"
  | "scrolling";

/**
 * Touch point data
 */
export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Velocity data
 */
export interface Velocity {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

/**
 * Recognized gesture data
 */
export interface GestureData {
  type: GestureType;
  state: GestureState;
  startPoint: TouchPoint;
  currentPoint: TouchPoint;
  endPoint?: TouchPoint;
  velocity: Velocity;
  distance: number;
  direction: "left" | "right" | "up" | "down" | null;
  duration: number;
  scale?: number;
  touches: TouchPoint[];
  isMultiTouch: boolean;
}

/**
 * Gesture recognizer configuration
 */
export interface GestureConfig {
  /** Minimum distance for swipe recognition (px) */
  swipeMinDistance: number;
  /** Maximum duration for swipe recognition (ms) */
  swipeMaxDuration: number;
  /** Minimum velocity for flick recognition (px/ms) */
  flickMinVelocity: number;
  /** Long press delay (ms) */
  longPressDelay: number;
  /** Double tap window (ms) */
  doubleTapDelay: number;
  /** Minimum distance for drag vs tap (px) */
  dragThreshold: number;
  /** Minimum scale change for pinch */
  pinchMinScale: number;
  /** Enable scroll disambiguation */
  enableScrollDisambiguation: boolean;
  /** Horizontal swipe angle tolerance (degrees from horizontal) */
  horizontalTolerance: number;
  /** Vertical swipe angle tolerance (degrees from vertical) */
  verticalTolerance: number;
}

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  swipeMinDistance: 50,
  swipeMaxDuration: 500,
  flickMinVelocity: 0.5,
  longPressDelay: 400,
  doubleTapDelay: 300,
  dragThreshold: 10,
  pinchMinScale: 0.1,
  enableScrollDisambiguation: true,
  horizontalTolerance: 30,
  verticalTolerance: 30,
};

/**
 * Gesture event callbacks
 */
export interface GestureCallbacks {
  onGestureStart?: (gesture: GestureData) => void;
  onGestureMove?: (gesture: GestureData) => void;
  onGestureEnd?: (gesture: GestureData) => void;
  onTap?: (gesture: GestureData) => void;
  onDoubleTap?: (gesture: GestureData) => void;
  onLongPress?: (gesture: GestureData) => void;
  onSwipe?: (gesture: GestureData) => void;
  onFlick?: (gesture: GestureData) => void;
  onPinch?: (gesture: GestureData) => void;
  onDrag?: (gesture: GestureData) => void;
  onScroll?: (gesture: GestureData) => void;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(p1: TouchPoint, p2: TouchPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate velocity from two points
 */
function calculateVelocity(p1: TouchPoint, p2: TouchPoint): Velocity {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dt = Math.max(p2.timestamp - p1.timestamp, 1);
  const vx = dx / dt;
  const vy = dy / dt;
  const magnitude = Math.sqrt(vx * vx + vy * vy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return { x: vx, y: vy, magnitude, angle };
}

/**
 * Determine swipe direction from angle
 */
function getDirectionFromAngle(
  angle: number,
  horizontalTolerance: number,
  verticalTolerance: number
): "left" | "right" | "up" | "down" | null {
  const absAngle = Math.abs(angle);

  // Right: -horizontalTolerance to +horizontalTolerance
  if (absAngle <= horizontalTolerance) {
    return "right";
  }
  // Left: 180-horizontalTolerance to 180 or -180 to -(180-horizontalTolerance)
  if (absAngle >= 180 - horizontalTolerance) {
    return "left";
  }
  // Up: -90 ± verticalTolerance
  if (angle <= -(90 - verticalTolerance) && angle >= -(90 + verticalTolerance)) {
    return "up";
  }
  // Down: 90 ± verticalTolerance
  if (angle >= 90 - verticalTolerance && angle <= 90 + verticalTolerance) {
    return "down";
  }

  return null;
}

/**
 * Calculate pinch scale from two touch points
 */
function calculatePinchScale(
  startTouches: TouchPoint[],
  currentTouches: TouchPoint[]
): number {
  if (startTouches.length < 2 || currentTouches.length < 2) {
    return 1;
  }

  const startDistance = calculateDistance(startTouches[0], startTouches[1]);
  const currentDistance = calculateDistance(currentTouches[0], currentTouches[1]);

  if (startDistance === 0) return 1;
  return currentDistance / startDistance;
}

/**
 * Create touch point from touch event
 */
function touchToPoint(touch: Touch): TouchPoint {
  return {
    id: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now(),
  };
}

/**
 * GestureRecognizer Class
 * State machine-based gesture recognition
 */
export class GestureRecognizer {
  private config: GestureConfig;
  private callbacks: GestureCallbacks;
  private state: GestureState = "idle";
  private startTouches: TouchPoint[] = [];
  private currentTouches: TouchPoint[] = [];
  private velocityHistory: Velocity[] = [];
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTapTime: number = 0;
  private lastTapPoint: TouchPoint | null = null;
  private isLongPressTriggered: boolean = false;

  constructor(config: Partial<GestureConfig> = {}, callbacks: GestureCallbacks = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: GestureCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current gesture state
   */
  getState(): GestureState {
    return this.state;
  }

  /**
   * Reset recognizer state
   */
  reset(): void {
    this.state = "idle";
    this.startTouches = [];
    this.currentTouches = [];
    this.velocityHistory = [];
    this.isLongPressTriggered = false;
    this.clearLongPressTimer();
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event: TouchEvent): void {
    const touches = Array.from(event.touches).map(touchToPoint);
    this.startTouches = touches;
    this.currentTouches = touches;
    this.velocityHistory = [];
    this.isLongPressTriggered = false;

    this.state = "touch-start";

    // Check for double tap
    if (touches.length === 1) {
      const now = Date.now();
      if (
        this.lastTapPoint &&
        now - this.lastTapTime < this.config.doubleTapDelay &&
        calculateDistance(touches[0], this.lastTapPoint) < this.config.dragThreshold
      ) {
        this.state = "idle";
        const gesture = this.buildGestureData("double-tap");
        this.callbacks.onDoubleTap?.(gesture);
        this.lastTapTime = 0;
        this.lastTapPoint = null;
        return;
      }

      // Start long press timer
      this.startLongPressTimer();
      this.state = "possible-tap";
    } else if (touches.length >= 2) {
      this.state = "pinching";
      this.clearLongPressTimer();
    }

    const gesture = this.buildGestureData("none");
    this.callbacks.onGestureStart?.(gesture);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event: TouchEvent): void {
    const touches = Array.from(event.touches).map(touchToPoint);
    const prevTouches = this.currentTouches;
    this.currentTouches = touches;

    // Calculate velocity
    if (prevTouches.length > 0 && touches.length > 0) {
      const velocity = calculateVelocity(prevTouches[0], touches[0]);
      this.velocityHistory.push(velocity);
      if (this.velocityHistory.length > 5) {
        this.velocityHistory.shift();
      }
    }

    // State transitions based on movement
    const distance = this.startTouches.length > 0 && touches.length > 0
      ? calculateDistance(this.startTouches[0], touches[0])
      : 0;

    switch (this.state) {
      case "touch-start":
      case "possible-tap":
      case "possible-long-press":
        if (distance > this.config.dragThreshold) {
          this.clearLongPressTimer();

          // Determine if this is a drag, swipe, or scroll
          const velocity = this.getAverageVelocity();
          const direction = getDirectionFromAngle(
            velocity.angle,
            this.config.horizontalTolerance,
            this.config.verticalTolerance
          );

          if (
            this.config.enableScrollDisambiguation &&
            (direction === "up" || direction === "down") &&
            Math.abs(velocity.y) > Math.abs(velocity.x) * 2
          ) {
            this.state = "scrolling";
          } else {
            this.state = "swiping";
          }
        }
        break;

      case "pinching":
        const gesture = this.buildGestureData("pinch-in"); // Will be corrected in buildGestureData
        this.callbacks.onGestureMove?.(gesture);
        this.callbacks.onPinch?.(gesture);
        break;

      case "swiping":
      case "dragging":
        const swipeGesture = this.buildGestureData("drag");
        this.callbacks.onGestureMove?.(swipeGesture);
        this.callbacks.onDrag?.(swipeGesture);
        break;

      case "scrolling":
        const scrollGesture = this.buildGestureData("scroll");
        this.callbacks.onGestureMove?.(scrollGesture);
        this.callbacks.onScroll?.(scrollGesture);
        break;
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event: TouchEvent): void {
    const touches = Array.from(event.touches).map(touchToPoint);
    const changedTouches = Array.from(event.changedTouches).map(touchToPoint);

    // Update end point
    const endPoint = changedTouches[0] || this.currentTouches[0];

    // Calculate final metrics
    const distance = this.startTouches.length > 0 && endPoint
      ? calculateDistance(this.startTouches[0], endPoint)
      : 0;
    const duration = this.startTouches.length > 0 && endPoint
      ? endPoint.timestamp - this.startTouches[0].timestamp
      : 0;
    const velocity = this.getAverageVelocity();

    this.clearLongPressTimer();

    // Determine final gesture type
    let gestureType: GestureType = "none";

    switch (this.state) {
      case "touch-start":
      case "possible-tap":
        if (!this.isLongPressTriggered && distance < this.config.dragThreshold) {
          gestureType = "tap";
          this.lastTapTime = Date.now();
          this.lastTapPoint = endPoint;
        }
        break;

      case "possible-long-press":
        // Long press already triggered
        break;

      case "swiping":
        // Check for swipe vs flick
        if (velocity.magnitude >= this.config.flickMinVelocity) {
          gestureType = "flick";
        } else if (
          distance >= this.config.swipeMinDistance &&
          duration <= this.config.swipeMaxDuration
        ) {
          const direction = getDirectionFromAngle(
            velocity.angle,
            this.config.horizontalTolerance,
            this.config.verticalTolerance
          );
          if (direction) {
            gestureType = `swipe-${direction}` as GestureType;
          }
        }
        break;

      case "pinching":
        const scale = calculatePinchScale(this.startTouches, this.currentTouches);
        gestureType = scale > 1 ? "pinch-out" : "pinch-in";
        break;

      case "dragging":
        gestureType = "drag";
        break;

      case "scrolling":
        gestureType = "scroll";
        break;
    }

    // Build final gesture data
    const gesture = this.buildGestureData(gestureType);
    if (endPoint) {
      gesture.endPoint = endPoint;
    }

    // Trigger appropriate callbacks
    this.callbacks.onGestureEnd?.(gesture);

    switch (gestureType) {
      case "tap":
        this.callbacks.onTap?.(gesture);
        break;
      case "flick":
        this.callbacks.onFlick?.(gesture);
        break;
      case "swipe-left":
      case "swipe-right":
      case "swipe-up":
      case "swipe-down":
        this.callbacks.onSwipe?.(gesture);
        break;
      case "pinch-in":
      case "pinch-out":
        this.callbacks.onPinch?.(gesture);
        break;
      case "drag":
        this.callbacks.onDrag?.(gesture);
        break;
      case "scroll":
        this.callbacks.onScroll?.(gesture);
        break;
    }

    // Reset if no more touches
    if (touches.length === 0) {
      this.reset();
    } else {
      this.currentTouches = touches;
      if (touches.length === 1) {
        this.state = "dragging";
      }
    }
  }

  /**
   * Handle touch cancel
   */
  handleTouchCancel(event: TouchEvent): void {
    this.clearLongPressTimer();
    const gesture = this.buildGestureData("none");
    this.callbacks.onGestureEnd?.(gesture);
    this.reset();
  }

  /**
   * Start long press timer
   */
  private startLongPressTimer(): void {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      if (
        this.state === "touch-start" ||
        this.state === "possible-tap" ||
        this.state === "possible-long-press"
      ) {
        this.state = "possible-long-press";
        this.isLongPressTriggered = true;
        const gesture = this.buildGestureData("long-press");
        this.callbacks.onLongPress?.(gesture);
      }
    }, this.config.longPressDelay);
  }

  /**
   * Clear long press timer
   */
  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Get average velocity from history
   */
  private getAverageVelocity(): Velocity {
    if (this.velocityHistory.length === 0) {
      return { x: 0, y: 0, magnitude: 0, angle: 0 };
    }

    const sum = this.velocityHistory.reduce(
      (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
      { x: 0, y: 0 }
    );

    const avgX = sum.x / this.velocityHistory.length;
    const avgY = sum.y / this.velocityHistory.length;
    const magnitude = Math.sqrt(avgX * avgX + avgY * avgY);
    const angle = Math.atan2(avgY, avgX) * (180 / Math.PI);

    return { x: avgX, y: avgY, magnitude, angle };
  }

  /**
   * Build gesture data object
   */
  private buildGestureData(type: GestureType): GestureData {
    const start = this.startTouches[0] || { id: 0, x: 0, y: 0, timestamp: Date.now() };
    const current = this.currentTouches[0] || start;
    const velocity = this.getAverageVelocity();
    const distance = calculateDistance(start, current);
    const duration = current.timestamp - start.timestamp;
    const direction = getDirectionFromAngle(
      velocity.angle,
      this.config.horizontalTolerance,
      this.config.verticalTolerance
    );

    // Calculate scale for pinch gestures
    let scale: number | undefined;
    if (this.startTouches.length >= 2 && this.currentTouches.length >= 2) {
      scale = calculatePinchScale(this.startTouches, this.currentTouches);
    }

    return {
      type,
      state: this.state,
      startPoint: start,
      currentPoint: current,
      velocity,
      distance,
      direction,
      duration,
      scale,
      touches: this.currentTouches,
      isMultiTouch: this.currentTouches.length > 1,
    };
  }

  /**
   * Create event handlers that can be attached to an element
   */
  getEventHandlers(): {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
    onTouchCancel: (e: TouchEvent) => void;
  } {
    return {
      onTouchStart: this.handleTouchStart.bind(this),
      onTouchMove: this.handleTouchMove.bind(this),
      onTouchEnd: this.handleTouchEnd.bind(this),
      onTouchCancel: this.handleTouchCancel.bind(this),
    };
  }
}

/**
 * Factory function to create a gesture recognizer
 */
export function createGestureRecognizer(
  config?: Partial<GestureConfig>,
  callbacks?: GestureCallbacks
): GestureRecognizer {
  return new GestureRecognizer(config, callbacks);
}

export default GestureRecognizer;
