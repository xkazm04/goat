/**
 * Validation Notification Store
 *
 * Dedicated store for managing validation error notifications.
 * Extracted from match-store to follow single-responsibility principle.
 *
 * Responsibilities:
 * - Manage notification state (active notifications)
 * - Handle auto-dismissal timers
 * - Provide notification emit/dismiss actions
 *
 * Usage:
 * - Other stores emit to this via emitValidationError()
 * - UI components subscribe to notifications for display
 */

import { create } from 'zustand';
import { validationLogger } from '@/lib/logger';
import {
  ValidationErrorCode,
  getValidationNotification,
} from '@/lib/validation';

// Re-export for backwards compatibility
export type { ValidationErrorCode as TransferValidationErrorCode } from '@/lib/validation';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation error notification state
 */
export interface ValidationNotification {
  id: string;
  errorCode: ValidationErrorCode;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: number;
}

interface ValidationNotificationStoreState {
  // Notification state
  notifications: ValidationNotification[];

  // Internal: Timer IDs for notification auto-dismissal (not exposed to selectors)
  _notificationTimers: Map<string, ReturnType<typeof setTimeout>>;

  // Actions
  /**
   * Emit a validation error notification
   * Automatically sets up auto-dismissal timer based on severity
   */
  emitValidationError: (errorCode: ValidationErrorCode) => void;

  /**
   * Dismiss a specific notification by ID
   * Clears the associated timer if it exists
   */
  dismissNotification: (id: string) => void;

  /**
   * Clear all notifications
   * Clears all pending timers
   */
  clearAllNotifications: () => void;

  /**
   * Get all active notifications (for UI consumption)
   */
  getNotifications: () => ValidationNotification[];
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useValidationNotificationStore = create<ValidationNotificationStoreState>((set, get) => ({
  // Initial state
  notifications: [],
  _notificationTimers: new Map(),

  // Emit a validation error notification
  emitValidationError: (errorCode) => {
    const notification = getValidationNotification(errorCode);
    const newNotification: ValidationNotification = {
      id: `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      errorCode,
      ...notification,
      timestamp: Date.now(),
    };

    // Determine auto-dismiss delay based on severity
    // Errors stay longer (8s) for users to read
    // Warnings/info auto-dismiss faster (5s)
    const dismissDelay = notification.severity === 'error' ? 8000 : 5000;

    // Create timer and store its ID for cleanup
    const timerId = setTimeout(() => {
      get().dismissNotification(newNotification.id);
    }, dismissDelay);

    // Store the timer ID in the map
    const { _notificationTimers } = get();
    _notificationTimers.set(newNotification.id, timerId);

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    validationLogger.debug(`Validation notification emitted: [${errorCode}] ${notification.title}`);
  },

  // Dismiss a specific notification
  dismissNotification: (id) => {
    // Clear the timer to prevent stale dismissals
    const { _notificationTimers } = get();
    const timerId = _notificationTimers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      _notificationTimers.delete(id);
    }

    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  // Clear all notifications
  clearAllNotifications: () => {
    // Clear all pending timers to prevent memory leaks
    const { _notificationTimers } = get();
    _notificationTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    _notificationTimers.clear();

    set({ notifications: [] });
  },

  // Get all active notifications
  getNotifications: () => {
    return get().notifications;
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook for components that need to display notifications
 * Returns notifications array and dismiss function
 */
export const useValidationNotifications = () =>
  useValidationNotificationStore((state) => ({
    notifications: state.notifications,
    dismissNotification: state.dismissNotification,
    clearAll: state.clearAllNotifications,
  }));

/**
 * Hook for stores/services that need to emit notifications
 * Returns only the emit function for minimal subscription
 */
export const useValidationNotificationEmitter = () =>
  useValidationNotificationStore((state) => ({
    emitValidationError: state.emitValidationError,
  }));
