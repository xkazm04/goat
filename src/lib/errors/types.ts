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
    title: 'Almost there!',
    description: 'Looks like a required field is empty. Fill it in and you\'re good to go.',
    severity: 'error',
  },
  VALIDATION_INVALID_FORMAT: {
    title: 'Quick fix needed',
    description: 'The format doesn\'t look quite right. Double-check your input and try again.',
    severity: 'error',
  },
  VALIDATION_OUT_OF_RANGE: {
    title: 'Number\'s a bit off',
    description: 'That value is outside the allowed range. Adjust it and try again.',
    severity: 'error',
  },
  VALIDATION_INVALID_TYPE: {
    title: 'Wrong input type',
    description: 'We expected a different kind of input here. Check the field and try again.',
    severity: 'error',
  },
  VALIDATION_CONSTRAINT_VIOLATION: {
    title: 'Hmm, that didn\'t work',
    description: 'Your input doesn\'t meet the requirements. Review the highlighted fields and try again.',
    severity: 'error',
  },

  // Authentication errors
  AUTH_NOT_AUTHENTICATED: {
    title: 'Let\'s get you signed in',
    description: 'Sign in to save your rankings, share lists, and pick up where you left off.',
    severity: 'warning',
  },
  AUTH_SESSION_EXPIRED: {
    title: 'Session timed out',
    description: 'You\'ve been away for a while. Sign in again to continue — your progress is safe.',
    severity: 'warning',
  },
  AUTH_INVALID_TOKEN: {
    title: 'Credentials issue',
    description: 'Something\'s off with your login. Try signing in again — it usually fixes this.',
    severity: 'error',
  },

  // Authorization errors
  AUTH_FORBIDDEN: {
    title: 'Can\'t access this',
    description: 'You don\'t have permission for this action. If this seems wrong, try signing out and back in.',
    severity: 'error',
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    title: 'Need more access',
    description: 'This feature requires additional permissions. Contact the list owner if you need access.',
    severity: 'warning',
  },
  AUTH_PREMIUM_REQUIRED: {
    title: 'Premium feature',
    description: 'This is a premium feature. Upgrade to unlock it and supercharge your rankings.',
    severity: 'info',
  },

  // Not found errors
  NOT_FOUND_RESOURCE: {
    title: 'Can\'t find that',
    description: 'Whatever you\'re looking for has moved or been removed. Try heading back to the home page.',
    severity: 'warning',
  },
  NOT_FOUND_USER: {
    title: 'User not found',
    description: 'We couldn\'t find that user. They may have changed their profile or left the platform.',
    severity: 'warning',
  },
  NOT_FOUND_LIST: {
    title: 'List has vanished',
    description: 'This list may have been deleted by its creator. Check your own lists or browse featured rankings.',
    severity: 'warning',
  },
  NOT_FOUND_ITEM: {
    title: 'Item missing',
    description: 'This item seems to have disappeared. Try refreshing — it might just be a hiccup.',
    severity: 'warning',
  },
  NOT_FOUND_GROUP: {
    title: 'Category not found',
    description: 'This category doesn\'t exist anymore. Head back and try a different one.',
    severity: 'warning',
  },

  // Conflict errors
  CONFLICT_DUPLICATE: {
    title: 'Already exists',
    description: 'Something with that name is already here. Try a different name to keep things unique.',
    severity: 'warning',
  },
  CONFLICT_VERSION_MISMATCH: {
    title: 'Someone else made changes',
    description: 'This was updated while you were editing. Refresh to see the latest version, then make your changes.',
    severity: 'warning',
  },
  CONFLICT_CONCURRENT_MODIFICATION: {
    title: 'Hold on a sec',
    description: 'Another update is still saving. Give it a moment, then try again.',
    severity: 'warning',
  },

  // Rate limit errors
  RATE_LIMIT_EXCEEDED: {
    title: 'Whoa, slow down!',
    description: 'You\'re doing things faster than we can keep up. Take a breather and try again in a few seconds.',
    severity: 'warning',
  },
  RATE_LIMIT_QUOTA_EXCEEDED: {
    title: 'Daily limit reached',
    description: 'You\'ve hit your usage limit for now. It\'ll reset soon — come back a little later.',
    severity: 'warning',
  },

  // Server errors
  SERVER_INTERNAL_ERROR: {
    title: 'Our bad!',
    description: 'Something went wrong on our end. Your progress is safe locally — hit retry and we\'ll sort it out.',
    severity: 'error',
  },
  SERVER_DATABASE_ERROR: {
    title: 'Couldn\'t save right now',
    description: 'Your ranking couldn\'t be saved to the cloud, but your progress is safe locally and will sync when the issue clears up.',
    severity: 'error',
  },
  SERVER_EXTERNAL_SERVICE_ERROR: {
    title: 'External service hiccup',
    description: 'A service we rely on is having issues. This usually resolves itself — try again in a minute.',
    severity: 'error',
  },
  SERVER_CONFIGURATION_ERROR: {
    title: 'Setup issue',
    description: 'There\'s a configuration problem on our side. We\'re likely already aware — try again shortly.',
    severity: 'error',
  },

  // Network errors
  NETWORK_OFFLINE: {
    title: 'You\'re offline',
    description: 'No worries — your rankings are saved locally. They\'ll sync automatically when you\'re back online.',
    severity: 'warning',
  },
  NETWORK_TIMEOUT: {
    title: 'Taking too long',
    description: 'The connection is slow right now. Your work is saved locally — try again when your connection improves.',
    severity: 'warning',
  },
  NETWORK_CONNECTION_REFUSED: {
    title: 'Can\'t reach our servers',
    description: 'We\'re having trouble connecting. Check your internet, or try again in a moment — your progress is safe.',
    severity: 'error',
  },

  // Client errors
  CLIENT_UNKNOWN_ERROR: {
    title: 'Something unexpected happened',
    description: 'We hit a snag we didn\'t anticipate. Try refreshing the page — your ranking progress is saved locally.',
    severity: 'error',
  },
  CLIENT_INVALID_STATE: {
    title: 'Things got out of sync',
    description: 'The app got into an unexpected state. A quick page refresh should fix this — your data is safe.',
    severity: 'error',
  },
  CLIENT_STORAGE_ERROR: {
    title: 'Can\'t save locally',
    description: 'Your browser storage is full or restricted. Try clearing some space or check your privacy settings.',
    severity: 'warning',
  },

  // Grid/Match specific
  GRID_SOURCE_NOT_FOUND: {
    title: 'Item disappeared',
    description: 'That item isn\'t available anymore. Try refreshing the collection to see updated items.',
    severity: 'error',
  },
  GRID_SOURCE_ALREADY_USED: {
    title: 'Already ranked!',
    description: 'This one\'s already on your grid. Remove it from its current spot first if you want to move it.',
    severity: 'warning',
  },
  GRID_TARGET_INVALID: {
    title: 'Oops, missed the target',
    description: 'Couldn\'t place it there. Try dropping it directly onto a grid slot.',
    severity: 'error',
  },
  GRID_TARGET_OCCUPIED: {
    title: 'Spot\'s taken',
    description: 'That slot has an item in it. Drop directly on the item to swap, or pick an empty slot.',
    severity: 'info',
  },
  GRID_OUT_OF_BOUNDS: {
    title: 'Off the grid',
    description: 'That spot is beyond your list size. Try a position within your Top N range.',
    severity: 'warning',
  },
  GRID_NOT_INITIALIZED: {
    title: 'Grid is loading...',
    description: 'The ranking grid is still setting up. Just a moment and you\'ll be ready to rank!',
    severity: 'warning',
  },
  GRID_ITEM_LOCKED: {
    title: 'Item is busy',
    description: 'This item is mid-move. Wait for it to settle, then try again.',
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
