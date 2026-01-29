/**
 * DragResultHandler - Unified Result and Error Handling
 *
 * Provides consistent handling of drag operation results across the application.
 * Integrates with the validation notification system for user feedback.
 */

import type { DragOperationResult, DragContext } from './types';
import type { ValidationErrorCode } from '@/lib/validation';
import { getValidationNotification } from '@/lib/validation';
import { dndLogger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Notification data for UI display
 */
export interface DragNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
  /** Duration in milliseconds (0 = persist until dismissed) */
  duration?: number;
}

/**
 * Callback for showing notifications
 */
export type NotificationCallback = (notification: DragNotification) => void;

/**
 * Callback for emitting validation errors to stores
 */
export type ValidationErrorEmitter = (errorCode: ValidationErrorCode) => void;

/**
 * Configuration for DragResultHandler
 */
export interface DragResultHandlerConfig {
  /** Show success notifications */
  showSuccessNotifications?: boolean;
  /** Show error notifications */
  showErrorNotifications?: boolean;
  /** Default notification duration (ms) */
  defaultDuration?: number;
  /** Custom notification callback */
  onNotification?: NotificationCallback;
  /** Custom validation error emitter */
  onValidationError?: ValidationErrorEmitter;
}

// ============================================================================
// DragResultHandler Class
// ============================================================================

/**
 * Handles results from drag operations and provides user feedback
 */
export class DragResultHandler {
  private config: Required<DragResultHandlerConfig>;

  constructor(config: DragResultHandlerConfig = {}) {
    this.config = {
      showSuccessNotifications: config.showSuccessNotifications ?? false,
      showErrorNotifications: config.showErrorNotifications ?? true,
      defaultDuration: config.defaultDuration ?? 3000,
      onNotification: config.onNotification ?? (() => {}),
      onValidationError: config.onValidationError ?? (() => {}),
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<DragResultHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Handle a drag operation result
   */
  handle(result: DragOperationResult, context: DragContext): void {
    if (result.success) {
      this.handleSuccess(result, context);
    } else {
      this.handleError(result, context);
    }
  }

  /**
   * Handle successful operation
   */
  private handleSuccess(result: DragOperationResult, context: DragContext): void {
    dndLogger.debug('Drag operation succeeded', {
      operationType: result.operationType,
      action: result.action,
      metadata: result.metadata,
    });

    if (this.config.showSuccessNotifications) {
      const notification = this.createSuccessNotification(result, context);
      if (notification) {
        this.config.onNotification(notification);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private handleError(result: DragOperationResult, context: DragContext): void {
    dndLogger.warn('Drag operation failed', {
      operationType: result.operationType,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      source: context.source,
      target: context.target,
    });

    // Emit validation error if error code is available
    if (result.errorCode) {
      this.config.onValidationError(result.errorCode);
    }

    if (this.config.showErrorNotifications) {
      const notification = this.createErrorNotification(result, context);
      this.config.onNotification(notification);
    }
  }

  /**
   * Create a success notification
   */
  private createSuccessNotification(
    result: DragOperationResult,
    context: DragContext
  ): DragNotification | null {
    const { operationType, action, metadata } = result;

    // Build notification based on operation type
    switch (operationType) {
      case 'assign':
        return {
          type: 'success',
          title: 'Item Placed',
          description: `Added to position ${(metadata?.toPosition ?? 0) + 1}`,
          duration: this.config.defaultDuration,
        };

      case 'move':
        return {
          type: 'success',
          title: 'Item Moved',
          description: `Moved from position ${(metadata?.fromPosition ?? 0) + 1} to ${(metadata?.toPosition ?? 0) + 1}`,
          duration: this.config.defaultDuration,
        };

      case 'swap':
        return {
          type: 'success',
          title: 'Items Swapped',
          description: `Swapped positions ${(metadata?.fromPosition ?? 0) + 1} and ${(metadata?.toPosition ?? 0) + 1}`,
          duration: this.config.defaultDuration,
        };

      case 'tier-assign':
        return {
          type: 'success',
          title: 'Added to Tier',
          description: `Item added to tier ${metadata?.toTierId || 'unknown'}`,
          duration: this.config.defaultDuration,
        };

      case 'tier-transfer':
        return {
          type: 'success',
          title: 'Tier Changed',
          description: `Moved from tier ${metadata?.fromTierId} to ${metadata?.toTierId}`,
          duration: this.config.defaultDuration,
        };

      default:
        return null;
    }
  }

  /**
   * Create an error notification
   */
  private createErrorNotification(
    result: DragOperationResult,
    context: DragContext
  ): DragNotification {
    const { errorCode, errorMessage } = result;

    // Use validation notification helper if we have an error code
    if (errorCode) {
      const validationNotification = getValidationNotification(errorCode);
      return {
        type: validationNotification.severity === 'info' ? 'info' : 'error',
        title: validationNotification.title,
        description: validationNotification.description,
        duration: this.config.defaultDuration,
      };
    }

    // Fallback for unknown errors
    return {
      type: 'error',
      title: 'Operation Failed',
      description: errorMessage || 'An unexpected error occurred',
      duration: this.config.defaultDuration,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let handlerInstance: DragResultHandler | null = null;

/**
 * Get the global DragResultHandler instance
 */
export function getDragResultHandler(config?: DragResultHandlerConfig): DragResultHandler {
  if (!handlerInstance) {
    handlerInstance = new DragResultHandler(config);
  } else if (config) {
    handlerInstance.setConfig(config);
  }
  return handlerInstance;
}

/**
 * Reset the global handler instance (useful for testing)
 */
export function resetDragResultHandler(): void {
  handlerInstance = null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple notification callback that logs to console
 */
export function createConsoleNotificationCallback(): NotificationCallback {
  return (notification) => {
    const prefix = notification.type === 'error' ? '❌' : notification.type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} ${notification.title}: ${notification.description}`);
  };
}

/**
 * Connect the result handler to a notification store
 */
export function connectToNotificationStore(
  handler: DragResultHandler,
  emitError: ValidationErrorEmitter
): void {
  handler.setConfig({
    onValidationError: emitError,
  });
}
