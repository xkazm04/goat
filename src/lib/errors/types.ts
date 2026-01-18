/**
 * Error Types - Unified Error Handling Framework
 *
 * Defines the error type hierarchy and codes for the GOAT application.
 * All errors should derive from GoatError for consistent handling.
 */

// ============================================================================
// Error Categories
// ============================================================================

/**
 * High-level error categories for classification
 */
export type ErrorCategory =
  | 'validation'    // Client-side validation errors (400)
  | 'authentication' // Auth errors (401)
  | 'authorization' // Permission errors (403)
  | 'not_found'     // Resource not found (404)
  | 'conflict'      // Resource conflicts (409)
  | 'rate_limit'    // Rate limiting (429)
  | 'server'        // Internal server errors (500)
  | 'network'       // Network/connectivity errors
  | 'client';       // General client-side errors

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Unified error codes across the application
 * Format: CATEGORY_SPECIFIC_ERROR
 */
export type ErrorCode =
  // Validation errors (400)
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  | 'VALIDATION_OUT_OF_RANGE'
  | 'VALIDATION_INVALID_TYPE'
  | 'VALIDATION_CONSTRAINT_VIOLATION'

  // Authentication errors (401)
  | 'AUTH_NOT_AUTHENTICATED'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_INVALID_TOKEN'

  // Authorization errors (403)
  | 'AUTH_FORBIDDEN'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  | 'AUTH_PREMIUM_REQUIRED'

  // Not found errors (404)
  | 'NOT_FOUND_RESOURCE'
  | 'NOT_FOUND_USER'
  | 'NOT_FOUND_LIST'
  | 'NOT_FOUND_ITEM'
  | 'NOT_FOUND_GROUP'

  // Conflict errors (409)
  | 'CONFLICT_DUPLICATE'
  | 'CONFLICT_VERSION_MISMATCH'
  | 'CONFLICT_CONCURRENT_MODIFICATION'

  // Rate limit errors (429)
  | 'RATE_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_QUOTA_EXCEEDED'

  // Server errors (500)
  | 'SERVER_INTERNAL_ERROR'
  | 'SERVER_DATABASE_ERROR'
  | 'SERVER_EXTERNAL_SERVICE_ERROR'
  | 'SERVER_CONFIGURATION_ERROR'

  // Network errors
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_CONNECTION_REFUSED'

  // Client errors
  | 'CLIENT_UNKNOWN_ERROR'
  | 'CLIENT_INVALID_STATE'
  | 'CLIENT_STORAGE_ERROR'

  // Grid/Match specific (re-using validation codes)
  | 'GRID_SOURCE_NOT_FOUND'
  | 'GRID_SOURCE_ALREADY_USED'
  | 'GRID_TARGET_INVALID'
  | 'GRID_TARGET_OCCUPIED'
  | 'GRID_OUT_OF_BOUNDS'
  | 'GRID_NOT_INITIALIZED'
  | 'GRID_ITEM_LOCKED';

// ============================================================================
// Error Severity
// ============================================================================

/**
 * Error severity levels for notification display
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

// ============================================================================
// Error Details
// ============================================================================

/**
 * Structured error details for debugging and analytics
 */
export interface ErrorDetails {
  /** Unique trace ID for this error instance */
  traceId?: string;
  /** Timestamp when error occurred */
  timestamp?: string;
  /** Request path that caused the error */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Field-level validation errors */
  fieldErrors?: Record<string, string[]>;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Stack trace (development only) */
  stack?: string;
}

// ============================================================================
// Error Response
// ============================================================================

/**
 * Standardized error response structure for API responses
 */
export interface ErrorResponse {
  /** Whether request was successful */
  success: false;
  /** Error category for classification */
  category: ErrorCategory;
  /** Specific error code for tracking */
  code: ErrorCode;
  /** User-friendly error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: ErrorDetails;
}

// ============================================================================
// User-Friendly Messages
// ============================================================================

/**
 * Mapping of error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, { title: string; description: string; severity: ErrorSeverity }> = {
  // Validation errors
  VALIDATION_REQUIRED_FIELD: {
    title: 'Missing Information',
    description: 'Please fill in all required fields.',
    severity: 'error',
  },
  VALIDATION_INVALID_FORMAT: {
    title: 'Invalid Format',
    description: 'Please check the format of your input.',
    severity: 'error',
  },
  VALIDATION_OUT_OF_RANGE: {
    title: 'Value Out of Range',
    description: 'Please enter a value within the allowed range.',
    severity: 'error',
  },
  VALIDATION_INVALID_TYPE: {
    title: 'Invalid Input',
    description: 'The input type is not supported.',
    severity: 'error',
  },
  VALIDATION_CONSTRAINT_VIOLATION: {
    title: 'Invalid Input',
    description: 'Your input does not meet the requirements.',
    severity: 'error',
  },

  // Authentication errors
  AUTH_NOT_AUTHENTICATED: {
    title: 'Sign In Required',
    description: 'Please sign in to continue.',
    severity: 'warning',
  },
  AUTH_SESSION_EXPIRED: {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again.',
    severity: 'warning',
  },
  AUTH_INVALID_TOKEN: {
    title: 'Authentication Error',
    description: 'There was a problem with your credentials. Please sign in again.',
    severity: 'error',
  },

  // Authorization errors
  AUTH_FORBIDDEN: {
    title: 'Access Denied',
    description: 'You do not have permission to perform this action.',
    severity: 'error',
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    title: 'Insufficient Permissions',
    description: 'You need additional permissions to access this feature.',
    severity: 'warning',
  },
  AUTH_PREMIUM_REQUIRED: {
    title: 'Premium Feature',
    description: 'This feature is available for premium users.',
    severity: 'info',
  },

  // Not found errors
  NOT_FOUND_RESOURCE: {
    title: 'Not Found',
    description: 'The requested resource could not be found.',
    severity: 'warning',
  },
  NOT_FOUND_USER: {
    title: 'User Not Found',
    description: 'The user you are looking for does not exist.',
    severity: 'warning',
  },
  NOT_FOUND_LIST: {
    title: 'List Not Found',
    description: 'This list may have been deleted or moved.',
    severity: 'warning',
  },
  NOT_FOUND_ITEM: {
    title: 'Item Not Found',
    description: 'This item could not be found. Try refreshing the page.',
    severity: 'warning',
  },
  NOT_FOUND_GROUP: {
    title: 'Group Not Found',
    description: 'This group could not be found.',
    severity: 'warning',
  },

  // Conflict errors
  CONFLICT_DUPLICATE: {
    title: 'Already Exists',
    description: 'This item already exists. Please use a different name.',
    severity: 'warning',
  },
  CONFLICT_VERSION_MISMATCH: {
    title: 'Update Conflict',
    description: 'This item was modified by someone else. Please refresh and try again.',
    severity: 'warning',
  },
  CONFLICT_CONCURRENT_MODIFICATION: {
    title: 'Concurrent Edit',
    description: 'Another change is in progress. Please wait and try again.',
    severity: 'warning',
  },

  // Rate limit errors
  RATE_LIMIT_EXCEEDED: {
    title: 'Too Many Requests',
    description: 'Please slow down and try again in a moment.',
    severity: 'warning',
  },
  RATE_LIMIT_QUOTA_EXCEEDED: {
    title: 'Quota Exceeded',
    description: 'You have reached your usage limit. Please try again later.',
    severity: 'warning',
  },

  // Server errors
  SERVER_INTERNAL_ERROR: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again.',
    severity: 'error',
  },
  SERVER_DATABASE_ERROR: {
    title: 'Database Error',
    description: 'We are having trouble saving your data. Please try again.',
    severity: 'error',
  },
  SERVER_EXTERNAL_SERVICE_ERROR: {
    title: 'Service Unavailable',
    description: 'An external service is unavailable. Please try again later.',
    severity: 'error',
  },
  SERVER_CONFIGURATION_ERROR: {
    title: 'Configuration Error',
    description: 'There is a problem with the server configuration.',
    severity: 'error',
  },

  // Network errors
  NETWORK_OFFLINE: {
    title: 'You Are Offline',
    description: 'Please check your internet connection and try again.',
    severity: 'warning',
  },
  NETWORK_TIMEOUT: {
    title: 'Request Timed Out',
    description: 'The request took too long. Please try again.',
    severity: 'warning',
  },
  NETWORK_CONNECTION_REFUSED: {
    title: 'Connection Failed',
    description: 'Could not connect to the server. Please try again.',
    severity: 'error',
  },

  // Client errors
  CLIENT_UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    severity: 'error',
  },
  CLIENT_INVALID_STATE: {
    title: 'Invalid State',
    description: 'The application is in an unexpected state. Please refresh the page.',
    severity: 'error',
  },
  CLIENT_STORAGE_ERROR: {
    title: 'Storage Error',
    description: 'Could not save your data locally. Please check your browser settings.',
    severity: 'warning',
  },

  // Grid/Match specific
  GRID_SOURCE_NOT_FOUND: {
    title: 'Item Not Found',
    description: 'The item could not be found. Try refreshing the page.',
    severity: 'error',
  },
  GRID_SOURCE_ALREADY_USED: {
    title: 'Item Already Placed',
    description: 'This item is already on your grid. Remove it first to reposition.',
    severity: 'warning',
  },
  GRID_TARGET_INVALID: {
    title: 'Invalid Position',
    description: 'Could not determine the target position. Please try again.',
    severity: 'error',
  },
  GRID_TARGET_OCCUPIED: {
    title: 'Position Occupied',
    description: 'Drop on an empty slot, or drag directly onto another item to swap.',
    severity: 'info',
  },
  GRID_OUT_OF_BOUNDS: {
    title: 'Out of Range',
    description: 'That position is outside your current grid size.',
    severity: 'warning',
  },
  GRID_NOT_INITIALIZED: {
    title: 'Grid Not Ready',
    description: 'The ranking grid is still loading. Please wait a moment.',
    severity: 'warning',
  },
  GRID_ITEM_LOCKED: {
    title: 'Item In Use',
    description: 'This item is currently being moved. Please wait.',
    severity: 'warning',
  },
};

// ============================================================================
// HTTP Status Code Mapping
// ============================================================================

/**
 * Map error categories to HTTP status codes
 */
export const CATEGORY_TO_STATUS: Record<ErrorCategory, number> = {
  validation: 400,
  authentication: 401,
  authorization: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  server: 500,
  network: 0, // Not applicable for network errors
  client: 400,
};

/**
 * Map HTTP status codes to error categories
 */
export const STATUS_TO_CATEGORY: Record<number, ErrorCategory> = {
  400: 'validation',
  401: 'authentication',
  403: 'authorization',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limit',
  500: 'server',
  502: 'server',
  503: 'server',
  504: 'server',
};

/**
 * Get error category from HTTP status code
 */
export function getCategoryFromStatus(status: number): ErrorCategory {
  if (status >= 200 && status < 300) {
    throw new Error('Cannot get error category for success status');
  }
  return STATUS_TO_CATEGORY[status] || (status >= 500 ? 'server' : 'client');
}

/**
 * Get HTTP status code from error category
 */
export function getStatusFromCategory(category: ErrorCategory): number {
  return CATEGORY_TO_STATUS[category];
}
