/**
 * GOAT Logger System
 *
 * A structured, toggleable logging system with runtime debug controls.
 * Provides zero-overhead logging when disabled in production.
 *
 * ## Features
 * - Category-based logging (grid, session, dnd, validation, etc.)
 * - Runtime toggle via window.__DEBUG_GOAT__
 * - Structured log output with timestamps and categories
 * - Multiple log levels (debug, info, warn, error)
 * - Production-safe: disabled by default
 *
 * ## Usage
 * ```ts
 * import { createCategoryLogger } from '@/lib/logger';
 *
 * const logger = createCategoryLogger('grid');
 * logger.debug('Item assigned', { position: 5, item: itemData });
 * logger.warn('Position occupied', { position: 5 });
 * ```
 *
 * ## Runtime Control (browser console)
 * ```js
 * window.__DEBUG_GOAT__.enable('grid')   // Enable grid logs
 * window.__DEBUG_GOAT__.enableAll()      // Enable all logs
 * window.__DEBUG_GOAT__.status()         // Show current config
 * ```
 */

import {
  LogCategory,
  LogLevel,
  shouldLog,
  formatTimestamp,
  initializeDebugAPI,
} from './debug-config';

// Re-export types and utilities
export type { LogCategory, LogLevel, DebugConfig, DebugAPI } from './debug-config';
export { shouldLog, getDebugConfig, initializeDebugAPI } from './debug-config';

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * Category logger interface
 */
export interface CategoryLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  /** Alias for debug */
  log: (message: string, data?: unknown) => void;
}

// Category emoji mapping for visual distinction
const CATEGORY_EMOJI: Record<LogCategory, string> = {
  grid: '🔄',
  session: '💾',
  dnd: '🖐️',
  validation: '✅',
  tier: '📊',
  backlog: '📦',
  match: '🎯',
  consensus: '🤝',
  heatmap: '🗺️',
  list: '📋',
  api: '🌐',
  '*': '⚡',
};

/**
 * Format a log message with category prefix
 */
function formatLogMessage(category: LogCategory, message: string): string {
  const emoji = CATEGORY_EMOJI[category] || '📝';
  const timestamp = formatTimestamp();
  return `${timestamp} ${emoji} [${category}] ${message}`;
}

/**
 * Internal logging function that handles all output
 */
function logInternal(
  category: LogCategory,
  level: LogLevel,
  message: string,
  data?: unknown
): void {
  if (!shouldLog(category, level)) return;

  const formattedMessage = formatLogMessage(category, message);

  // Select console method based on level
  const consoleFn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log;

  if (data !== undefined) {
    // eslint-disable-next-line no-console
    consoleFn(formattedMessage, data);
  } else {
    // eslint-disable-next-line no-console
    consoleFn(formattedMessage);
  }
}

/**
 * Create a category-specific logger instance.
 *
 * @param category - The log category for filtering
 * @returns Logger with debug/info/warn/error methods
 *
 * @example
 * ```ts
 * const gridLogger = createCategoryLogger('grid');
 * gridLogger.debug('Initializing grid', { size: 10 });
 * gridLogger.warn('Position occupied');
 * ```
 */
export function createCategoryLogger(category: LogCategory): CategoryLogger {
  return {
    debug: (message: string, data?: unknown) => logInternal(category, 'debug', message, data),
    info: (message: string, data?: unknown) => logInternal(category, 'info', message, data),
    warn: (message: string, data?: unknown) => logInternal(category, 'warn', message, data),
    error: (message: string, data?: unknown) => logInternal(category, 'error', message, data),
    log: (message: string, data?: unknown) => logInternal(category, 'debug', message, data),
  };
}

// ============================================================================
// Pre-configured Category Loggers
// ============================================================================

/** Grid operations (assign, move, swap, clear) */
export const gridLogger = createCategoryLogger('grid');

/** Session management (create, load, save, sync) */
export const sessionLogger = createCategoryLogger('session');

/** Drag and drop events and validation */
export const dndLogger = createCategoryLogger('dnd');

/** Transfer validation and type guards */
export const validationLogger = createCategoryLogger('validation');

/** Tier list operations */
export const tierLogger = createCategoryLogger('tier');

/** Backlog groups and items */
export const backlogLogger = createCategoryLogger('backlog');

/** Match orchestration and state */
export const matchLogger = createCategoryLogger('match');

/** Consensus and activity tracking */
export const consensusLogger = createCategoryLogger('consensus');

/** Heatmap data operations */
export const heatmapLogger = createCategoryLogger('heatmap');

/** List CRUD operations */
export const listLogger = createCategoryLogger('list');

/** API client operations */
export const apiLogger = createCategoryLogger('api');

// ============================================================================
// Legacy Compatibility Layer
// ============================================================================

/**
 * @deprecated Use createCategoryLogger instead
 * Legacy logger factory for backwards compatibility
 */
export function createLogger(namespace: string, _emoji?: string): CategoryLogger {
  // Map legacy namespaces to categories
  const categoryMap: Record<string, LogCategory> = {
    'grid-store': 'grid',
    'session-store': 'session',
    'backlog-store': 'backlog',
    'match-store': 'match',
    'comparison-store': 'match',
    'tier-store': 'tier',
    'activity-store': 'consensus',
    'heatmap-store': 'heatmap',
    'consensus-store': 'consensus',
    'wiki-image-store': 'api',
    'validation-store': 'validation',
    'list-store': 'list',
  };

  const category = categoryMap[namespace] || 'grid';
  return createCategoryLogger(category);
}

/**
 * @deprecated Use category loggers directly
 * Legacy store loggers object for backwards compatibility
 */
export const storeLoggers = {
  grid: gridLogger,
  session: sessionLogger,
  backlog: backlogLogger,
  match: matchLogger,
  comparison: matchLogger, // Alias to match
  tier: tierLogger,
  activity: consensusLogger,
  heatmap: heatmapLogger,
  consensus: consensusLogger,
  wikiImage: apiLogger,
  validation: validationLogger,
  list: listLogger,
};

/**
 * @deprecated Use initializeDebugAPI instead
 * Legacy config object for backwards compatibility
 */
export const loggerConfig = {
  setEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined' && window.__DEBUG_GOAT__) {
      if (enabled) {
        window.__DEBUG_GOAT__.enableAll();
      } else {
        window.__DEBUG_GOAT__.disableAll();
      }
    }
  },
  setLevel(level: LogLevel): void {
    if (typeof window !== 'undefined' && window.__DEBUG_GOAT__) {
      window.__DEBUG_GOAT__.setLevel(level);
    }
  },
  setNamespaces(_namespaces: string[]): void {
    // Legacy - no-op, use category-based enabling instead
  },
  enableNamespace(_namespace: string): void {
    // Legacy - no-op
  },
  disableNamespace(_namespace: string): void {
    // Legacy - no-op
  },
  isEnabled(): boolean {
    return typeof window !== 'undefined' && !!window.__DEBUG_GOAT__?.isEnabled('*');
  },
};

// Backwards-compatible exports (matching old logger.ts exports)
export const activityLogger = consensusLogger;
export const wikiImageLogger = apiLogger;

// ============================================================================
// Auto-initialize Debug API
// ============================================================================

// Initialize the debug API when this module is loaded (client-side only)
if (typeof window !== 'undefined') {
  initializeDebugAPI();
}
