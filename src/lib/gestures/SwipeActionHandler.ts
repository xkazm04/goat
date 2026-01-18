/**
 * SwipeActionHandler
 * Maps swipe gestures to application actions with configurable bindings
 * Supports quick-assign, remove, preview, and custom actions
 */

import { GestureData, GestureType } from "./GestureRecognizer";

/**
 * Available swipe actions
 */
export type SwipeAction =
  | "quick-assign"
  | "remove"
  | "preview"
  | "expand"
  | "collapse"
  | "navigate-next"
  | "navigate-prev"
  | "favorite"
  | "compare"
  | "dismiss"
  | "custom";

/**
 * Action context - provides data needed to execute action
 */
export interface ActionContext {
  /** Item being acted upon */
  itemId: string;
  /** Item title for display */
  itemTitle?: string;
  /** Current position in grid (if applicable) */
  currentPosition?: number;
  /** Target position for assignment */
  targetPosition?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Action result
 */
export interface ActionResult {
  /** Whether action was successful */
  success: boolean;
  /** Action that was performed */
  action: SwipeAction;
  /** Context of the action */
  context: ActionContext;
  /** Optional message */
  message?: string;
  /** Whether to trigger haptic feedback */
  triggerHaptic?: boolean;
  /** Haptic intensity */
  hapticIntensity?: "light" | "medium" | "heavy";
}

/**
 * Swipe action binding configuration
 */
export interface SwipeActionBinding {
  /** Direction that triggers this action */
  direction: "left" | "right" | "up" | "down";
  /** Action to perform */
  action: SwipeAction;
  /** Minimum velocity required (optional) */
  minVelocity?: number;
  /** Whether this binding is enabled */
  enabled: boolean;
  /** Custom handler for 'custom' action type */
  customHandler?: (gesture: GestureData, context: ActionContext) => ActionResult;
  /** Description for tutorial/settings UI */
  description: string;
  /** Icon name for UI */
  icon?: string;
}

/**
 * Action handler function type
 */
export type ActionHandler = (
  context: ActionContext
) => ActionResult | Promise<ActionResult>;

/**
 * SwipeActionHandler configuration
 */
export interface SwipeActionHandlerConfig {
  /** Swipe bindings for backlog items */
  backlogBindings: SwipeActionBinding[];
  /** Swipe bindings for grid items */
  gridBindings: SwipeActionBinding[];
  /** Whether flick gestures should also trigger actions */
  flickTriggersAction: boolean;
  /** Confirmation required before destructive actions */
  confirmDestructive: boolean;
  /** Enable haptic feedback */
  enableHaptics: boolean;
}

/**
 * Default backlog item bindings
 * Swipe right = quick assign, swipe left = preview
 */
export const DEFAULT_BACKLOG_BINDINGS: SwipeActionBinding[] = [
  {
    direction: "right",
    action: "quick-assign",
    enabled: true,
    description: "Quick assign to next empty position",
    icon: "plus-circle",
  },
  {
    direction: "left",
    action: "preview",
    enabled: true,
    description: "Show item details",
    icon: "eye",
  },
  {
    direction: "up",
    action: "favorite",
    enabled: false,
    description: "Add to favorites",
    icon: "star",
  },
  {
    direction: "down",
    action: "dismiss",
    enabled: false,
    description: "Dismiss from suggestions",
    icon: "x-circle",
  },
];

/**
 * Default grid item bindings
 * Swipe left = remove, swipe right = compare
 */
export const DEFAULT_GRID_BINDINGS: SwipeActionBinding[] = [
  {
    direction: "left",
    action: "remove",
    enabled: true,
    description: "Remove from ranking",
    icon: "trash",
  },
  {
    direction: "right",
    action: "compare",
    enabled: true,
    description: "Compare with another item",
    icon: "git-compare",
  },
  {
    direction: "up",
    action: "navigate-prev",
    enabled: false,
    description: "Move to previous position",
    icon: "arrow-up",
  },
  {
    direction: "down",
    action: "navigate-next",
    enabled: false,
    description: "Move to next position",
    icon: "arrow-down",
  },
];

/**
 * Default configuration
 */
export const DEFAULT_SWIPE_ACTION_CONFIG: SwipeActionHandlerConfig = {
  backlogBindings: DEFAULT_BACKLOG_BINDINGS,
  gridBindings: DEFAULT_GRID_BINDINGS,
  flickTriggersAction: true,
  confirmDestructive: false,
  enableHaptics: true,
};

/**
 * SwipeActionHandler Class
 * Manages swipe-to-action mappings and execution
 */
export class SwipeActionHandler {
  private config: SwipeActionHandlerConfig;
  private actionHandlers: Map<SwipeAction, ActionHandler> = new Map();
  private nextPositionProvider: (() => number | null) | null = null;

  constructor(config: Partial<SwipeActionHandlerConfig> = {}) {
    this.config = {
      ...DEFAULT_SWIPE_ACTION_CONFIG,
      ...config,
      backlogBindings: config.backlogBindings || [...DEFAULT_BACKLOG_BINDINGS],
      gridBindings: config.gridBindings || [...DEFAULT_GRID_BINDINGS],
    };
  }

  /**
   * Set handler for an action type
   */
  setActionHandler(action: SwipeAction, handler: ActionHandler): void {
    this.actionHandlers.set(action, handler);
  }

  /**
   * Set provider for next available position (for quick-assign)
   */
  setNextPositionProvider(provider: () => number | null): void {
    this.nextPositionProvider = provider;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SwipeActionHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update a specific binding
   */
  updateBinding(
    type: "backlog" | "grid",
    direction: SwipeActionBinding["direction"],
    updates: Partial<SwipeActionBinding>
  ): void {
    const bindings =
      type === "backlog" ? this.config.backlogBindings : this.config.gridBindings;

    const index = bindings.findIndex((b) => b.direction === direction);
    if (index >= 0) {
      bindings[index] = { ...bindings[index], ...updates };
    }
  }

  /**
   * Get bindings for a context type
   */
  getBindings(type: "backlog" | "grid"): SwipeActionBinding[] {
    return type === "backlog"
      ? this.config.backlogBindings
      : this.config.gridBindings;
  }

  /**
   * Get enabled bindings only
   */
  getEnabledBindings(type: "backlog" | "grid"): SwipeActionBinding[] {
    return this.getBindings(type).filter((b) => b.enabled);
  }

  /**
   * Process a gesture and determine action
   */
  processGesture(
    gesture: GestureData,
    contextType: "backlog" | "grid",
    context: ActionContext
  ): SwipeActionBinding | null {
    // Check if gesture is a valid swipe or flick
    const isSwipe = gesture.type.startsWith("swipe-");
    const isFlick = gesture.type === "flick" && this.config.flickTriggersAction;

    if (!isSwipe && !isFlick) {
      return null;
    }

    // Get direction
    const direction = gesture.direction;
    if (!direction) {
      return null;
    }

    // Find matching binding
    const bindings = this.getEnabledBindings(contextType);
    const binding = bindings.find((b) => {
      if (b.direction !== direction) return false;
      if (b.minVelocity && gesture.velocity.magnitude < b.minVelocity) return false;
      return true;
    });

    return binding || null;
  }

  /**
   * Execute an action
   */
  async executeAction(
    binding: SwipeActionBinding,
    gesture: GestureData,
    context: ActionContext
  ): Promise<ActionResult> {
    const { action, customHandler } = binding;

    // Handle custom actions
    if (action === "custom" && customHandler) {
      return customHandler(gesture, context);
    }

    // Get registered handler
    const handler = this.actionHandlers.get(action);
    if (!handler) {
      // Return default result for unhandled actions
      return this.getDefaultResult(action, context);
    }

    try {
      const result = await handler(context);
      return {
        ...result,
        triggerHaptic: this.config.enableHaptics,
        hapticIntensity: this.getHapticIntensity(action),
      };
    } catch (error) {
      return {
        success: false,
        action,
        context,
        message: error instanceof Error ? error.message : "Action failed",
      };
    }
  }

  /**
   * Process gesture and execute action in one call
   */
  async handleGesture(
    gesture: GestureData,
    contextType: "backlog" | "grid",
    context: ActionContext
  ): Promise<ActionResult | null> {
    const binding = this.processGesture(gesture, contextType, context);
    if (!binding) {
      return null;
    }

    // Special handling for quick-assign
    if (binding.action === "quick-assign" && this.nextPositionProvider) {
      const nextPosition = this.nextPositionProvider();
      if (nextPosition !== null) {
        context.targetPosition = nextPosition;
      }
    }

    return this.executeAction(binding, gesture, context);
  }

  /**
   * Get default result for unhandled actions
   */
  private getDefaultResult(action: SwipeAction, context: ActionContext): ActionResult {
    return {
      success: false,
      action,
      context,
      message: `No handler registered for action: ${action}`,
      triggerHaptic: false,
    };
  }

  /**
   * Get haptic intensity based on action type
   */
  private getHapticIntensity(action: SwipeAction): "light" | "medium" | "heavy" {
    switch (action) {
      case "quick-assign":
        return "medium";
      case "remove":
        return "heavy";
      case "preview":
      case "compare":
        return "light";
      case "navigate-next":
      case "navigate-prev":
        return "light";
      default:
        return "medium";
    }
  }

  /**
   * Check if action requires confirmation
   */
  isDestructiveAction(action: SwipeAction): boolean {
    return action === "remove" || action === "dismiss";
  }

  /**
   * Should confirm before executing
   */
  shouldConfirm(action: SwipeAction): boolean {
    return this.config.confirmDestructive && this.isDestructiveAction(action);
  }

  /**
   * Get action description for UI
   */
  getActionDescription(action: SwipeAction): string {
    const descriptions: Record<SwipeAction, string> = {
      "quick-assign": "Assign to next available position",
      remove: "Remove from ranking",
      preview: "View item details",
      expand: "Expand item",
      collapse: "Collapse item",
      "navigate-next": "Move to next position",
      "navigate-prev": "Move to previous position",
      favorite: "Add to favorites",
      compare: "Compare items",
      dismiss: "Dismiss item",
      custom: "Custom action",
    };
    return descriptions[action];
  }

  /**
   * Get visual indicator for swipe direction
   */
  getSwipeIndicator(
    direction: "left" | "right" | "up" | "down",
    contextType: "backlog" | "grid"
  ): { action: SwipeAction; icon: string; color: string } | null {
    const binding = this.getBindings(contextType).find(
      (b) => b.direction === direction && b.enabled
    );

    if (!binding) return null;

    const colors: Record<SwipeAction, string> = {
      "quick-assign": "#22c55e", // green
      remove: "#ef4444", // red
      preview: "#3b82f6", // blue
      expand: "#8b5cf6", // purple
      collapse: "#6b7280", // gray
      "navigate-next": "#06b6d4", // cyan
      "navigate-prev": "#06b6d4", // cyan
      favorite: "#f59e0b", // amber
      compare: "#10b981", // emerald
      dismiss: "#ef4444", // red
      custom: "#6366f1", // indigo
    };

    return {
      action: binding.action,
      icon: binding.icon || "chevron-right",
      color: colors[binding.action],
    };
  }
}

/**
 * Factory function
 */
export function createSwipeActionHandler(
  config?: Partial<SwipeActionHandlerConfig>
): SwipeActionHandler {
  return new SwipeActionHandler(config);
}

export default SwipeActionHandler;
