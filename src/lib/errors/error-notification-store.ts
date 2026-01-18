/**
 * Error Notification Store
 *
 * Unified notification system for all application errors.
 * Extends the validation notification pattern to handle all error types.
 *
 * Features:
 * - Auto-dismissal based on severity
 * - Error deduplication
 * - Retry action support
 * - Error history for analytics
 */

import { create } from 'zustand';
import { GoatError, fromUnknown, isGoatError } from './GoatError';
import type { ErrorCode, ErrorSeverity } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ErrorNotification {
  /** Unique notification ID */
  id: string;
  /** Error code for tracking */
  code: ErrorCode;
  /** Trace ID for debugging */
  traceId: string;
  /** Display title */
  title: string;
  /** Display description */
  description: string;
  /** Severity level */
  severity: ErrorSeverity;
  /** Timestamp when created */
  timestamp: number;
  /** Whether error is retriable */
  retriable: boolean;
  /** Optional retry action */
  onRetry?: () => void;
  /** Optional dismiss action */
  onDismiss?: () => void;
  /** Source component/feature */
  source?: string;
}

interface ErrorNotificationState {
  /** Active notifications */
  notifications: ErrorNotification[];

  /** Error history for analytics (limited to last 100) */
  errorHistory: Array<{
    code: ErrorCode;
    traceId: string;
    timestamp: number;
    source?: string;
  }>;

  /** Timer map for auto-dismissal */
  _timers: Map<string, ReturnType<typeof setTimeout>>;

  // Actions
  /** Emit an error notification */
  emitError: (
    error: unknown,
    options?: {
      source?: string;
      onRetry?: () => void;
      onDismiss?: () => void;
    }
  ) => string;

  /** Emit a GoatError directly */
  emitGoatError: (
    error: GoatError,
    options?: {
      source?: string;
      onRetry?: () => void;
      onDismiss?: () => void;
    }
  ) => string;

  /** Dismiss a notification by ID */
  dismiss: (id: string) => void;

  /** Clear all notifications */
  clearAll: () => void;

  /** Get notification by ID */
  getNotification: (id: string) => ErrorNotification | undefined;

  /** Get error history */
  getErrorHistory: () => ErrorNotificationState['errorHistory'];

  /** Clear error history */
  clearErrorHistory: () => void;
}

// ============================================================================
// Auto-dismiss durations (ms)
// ============================================================================

const DISMISS_DELAYS: Record<ErrorSeverity, number> = {
  error: 10000, // Errors stay longer
  warning: 6000,
  info: 4000,
};

// ============================================================================
// Deduplication window (ms)
// ============================================================================

const DEDUP_WINDOW = 2000; // Suppress duplicate errors within 2s

// ============================================================================
// Store Implementation
// ============================================================================

export const useErrorNotificationStore = create<ErrorNotificationState>((set, get) => ({
  notifications: [],
  errorHistory: [],
  _timers: new Map(),

  emitError: (error, options) => {
    const goatError = isGoatError(error) ? error : fromUnknown(error);
    return get().emitGoatError(goatError, options);
  },

  emitGoatError: (error, options) => {
    const notification = error.toNotification();
    const now = Date.now();

    // Check for duplicate errors (same code within dedup window)
    const existingNotifications = get().notifications;
    const isDuplicate = existingNotifications.some(
      (n) =>
        n.code === error.code &&
        now - n.timestamp < DEDUP_WINDOW
    );

    if (isDuplicate) {
      console.log(`📢 Suppressed duplicate error notification: ${error.code}`);
      return existingNotifications.find((n) => n.code === error.code)?.id || '';
    }

    const id = `error-${now}-${Math.random().toString(36).substr(2, 9)}`;

    const newNotification: ErrorNotification = {
      id,
      code: error.code,
      traceId: error.traceId,
      title: notification.title,
      description: notification.description,
      severity: notification.severity,
      timestamp: now,
      retriable: error.isRetriable(),
      onRetry: options?.onRetry,
      onDismiss: options?.onDismiss,
      source: options?.source,
    };

    // Set up auto-dismiss timer
    const delay = DISMISS_DELAYS[notification.severity];
    const timer = setTimeout(() => {
      get().dismiss(id);
    }, delay);

    const { _timers } = get();
    _timers.set(id, timer);

    // Add to history (limited to last 100)
    const newHistory = [
      ...get().errorHistory,
      {
        code: error.code,
        traceId: error.traceId,
        timestamp: now,
        source: options?.source,
      },
    ].slice(-100);

    set((state) => ({
      notifications: [...state.notifications, newNotification],
      errorHistory: newHistory,
    }));

    // Log the error
    console.log(
      `📢 Error notification: [${error.code}] ${notification.title}`,
      {
        traceId: error.traceId,
        source: options?.source,
      }
    );

    return id;
  },

  dismiss: (id) => {
    // Clear timer
    const { _timers } = get();
    const timer = _timers.get(id);
    if (timer) {
      clearTimeout(timer);
      _timers.delete(id);
    }

    // Get notification before removing (for callback)
    const notification = get().notifications.find((n) => n.id === id);

    // Remove notification
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));

    // Call dismiss callback
    notification?.onDismiss?.();
  },

  clearAll: () => {
    // Clear all timers
    const { _timers } = get();
    _timers.forEach((timer) => clearTimeout(timer));
    _timers.clear();

    set({ notifications: [] });
  },

  getNotification: (id) => {
    return get().notifications.find((n) => n.id === id);
  },

  getErrorHistory: () => {
    return get().errorHistory;
  },

  clearErrorHistory: () => {
    set({ errorHistory: [] });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook for components that display notifications
 */
export const useErrorNotifications = () =>
  useErrorNotificationStore((state) => ({
    notifications: state.notifications,
    dismiss: state.dismiss,
    clearAll: state.clearAll,
  }));

/**
 * Hook for components that emit notifications
 */
export const useErrorNotificationEmitter = () =>
  useErrorNotificationStore((state) => ({
    emitError: state.emitError,
    emitGoatError: state.emitGoatError,
  }));

/**
 * Hook for error analytics
 */
export const useErrorHistory = () =>
  useErrorNotificationStore((state) => ({
    errorHistory: state.errorHistory,
    clearErrorHistory: state.clearErrorHistory,
  }));

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Emit an error notification (non-hook version for stores/services)
 */
export function emitErrorNotification(
  error: unknown,
  options?: {
    source?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
  }
): string {
  return useErrorNotificationStore.getState().emitError(error, options);
}

/**
 * Dismiss all notifications (non-hook version)
 */
export function clearAllErrorNotifications(): void {
  useErrorNotificationStore.getState().clearAll();
}

/**
 * Get current error notification count
 */
export function getErrorNotificationCount(): number {
  return useErrorNotificationStore.getState().notifications.length;
}
