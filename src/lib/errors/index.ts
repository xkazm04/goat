/**
 * Unified Error Handling Framework
 *
 * Exports all error types, classes, and utilities for consistent
 * error handling across the GOAT application.
 */

// Types
export type {
  ErrorCategory,
  ErrorCode,
  ErrorSeverity,
  ErrorDetails,
  ErrorResponse,
} from './types';

export {
  ERROR_MESSAGES,
  CATEGORY_TO_STATUS,
  STATUS_TO_CATEGORY,
  getCategoryFromStatus,
  getStatusFromCategory,
} from './types';

// Error Classes
export {
  GoatError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  NetworkError,
  ServerError,
} from './GoatError';

// Factory Functions
export {
  fromUnknown,
  fromHttpResponse,
  isGoatError,
  isRetriable,
} from './GoatError';

// API Error Handler
export {
  withErrorHandler,
  fromSupabaseError,
  assertRequired,
  assertValid,
  parseBody,
  successResponse,
  createdResponse,
  noContentResponse,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from './api-error-handler';

// Error Boundary Components
export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  AsyncBoundary,
  QueryErrorBoundary,
} from './ErrorBoundary';

// Error Notification Store
export {
  useErrorNotificationStore,
  useErrorNotifications,
  useErrorNotificationEmitter,
  useErrorHistory,
  emitErrorNotification,
  clearAllErrorNotifications,
  getErrorNotificationCount,
} from './error-notification-store';

export type { ErrorNotification } from './error-notification-store';

// Error Notification Components
export {
  ErrorNotificationToastContainer,
  InlineErrorDisplay,
} from './ErrorNotificationToast';

// Error Analytics (server-compatible)
export {
  getErrorAnalytics,
  trackError,
  getErrorMetrics,
  subscribeToErrors,
} from './error-analytics';

export type { ErrorEvent, ErrorMetrics, ErrorAnalyticsConfig } from './error-analytics';

// Error Analytics Hooks (client-only)
export { useErrorMetrics, useRecentErrors } from './error-analytics-hooks';
