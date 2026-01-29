/**
 * Debug Configuration for GOAT Logger System
 *
 * Provides runtime toggles for debug logging via window.__DEBUG_GOAT__
 * Enables zero-overhead logging when disabled - all checks are short-circuited.
 *
 * Usage (browser console):
 *   window.__DEBUG_GOAT__.enable('grid')     // Enable grid category
 *   window.__DEBUG_GOAT__.enableAll()        // Enable all categories
 *   window.__DEBUG_GOAT__.disable('grid')    // Disable grid category
 *   window.__DEBUG_GOAT__.disableAll()       // Disable all (default)
 *   window.__DEBUG_GOAT__.status()           // Show current config
 *   window.__DEBUG_GOAT__.setLevel('warn')   // Set minimum log level
 */

// Log categories for structured debugging
export type LogCategory =
  | 'grid'      // Grid operations (assign, move, swap, clear)
  | 'session'   // Session management (create, load, save, sync)
  | 'dnd'       // Drag and drop events and validation
  | 'validation'// Transfer validation and type guards
  | 'tier'      // Tier list operations
  | 'backlog'   // Backlog groups and items
  | 'match'     // Match orchestration and state
  | 'consensus' // Consensus and activity tracking
  | 'heatmap'   // Heatmap data operations
  | 'list'      // List CRUD operations
  | 'api'       // API client operations
  | '*';        // Wildcard - enables all categories

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DebugConfig {
  enabled: boolean;
  level: LogLevel;
  categories: Set<LogCategory>;
  timestamps: boolean;
}

// Internal config state
const debugConfig: DebugConfig = {
  enabled: false, // Disabled by default - must be explicitly enabled
  level: 'debug',
  categories: new Set(),
  timestamps: true,
};

// Log level priority for filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if a category should log at the given level.
 * This is the hot path - optimized for fast rejection.
 */
export function shouldLog(category: LogCategory, level: LogLevel): boolean {
  // Fast path: if disabled globally, return false immediately
  if (!debugConfig.enabled) return false;

  // Check log level
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[debugConfig.level]) {
    return false;
  }

  // Check category (wildcard '*' enables all)
  if (debugConfig.categories.has('*')) return true;
  return debugConfig.categories.has(category);
}

/**
 * Get current debug configuration (immutable copy)
 */
export function getDebugConfig(): Readonly<DebugConfig> {
  return {
    ...debugConfig,
    categories: new Set(debugConfig.categories),
  };
}

/**
 * Format a timestamp for log output
 */
export function formatTimestamp(): string {
  if (!debugConfig.timestamps) return '';
  const now = new Date();
  return `[${now.toISOString().slice(11, 23)}]`;
}

/**
 * Debug API exposed on window.__DEBUG_GOAT__
 */
export interface DebugAPI {
  /** Enable logging for a specific category */
  enable: (category: LogCategory) => void;
  /** Disable logging for a specific category */
  disable: (category: LogCategory) => void;
  /** Enable all categories (wildcard) */
  enableAll: () => void;
  /** Disable all logging */
  disableAll: () => void;
  /** Toggle a category on/off */
  toggle: (category: LogCategory) => boolean;
  /** Set minimum log level */
  setLevel: (level: LogLevel) => void;
  /** Enable/disable timestamps */
  setTimestamps: (enabled: boolean) => void;
  /** Show current configuration status */
  status: () => void;
  /** List available categories */
  categories: () => LogCategory[];
  /** Check if a category is enabled */
  isEnabled: (category: LogCategory) => boolean;
}

// All available categories (excluding wildcard for listing)
const ALL_CATEGORIES: LogCategory[] = [
  'grid',
  'session',
  'dnd',
  'validation',
  'tier',
  'backlog',
  'match',
  'consensus',
  'heatmap',
  'list',
  'api',
];

/**
 * Create the debug API for window exposure
 */
function createDebugAPI(): DebugAPI {
  return {
    enable: (category: LogCategory) => {
      debugConfig.enabled = true;
      debugConfig.categories.add(category);
      // eslint-disable-next-line no-console
      console.log(`[GOAT Debug] Enabled category: ${category}`);
    },

    disable: (category: LogCategory) => {
      debugConfig.categories.delete(category);
      if (debugConfig.categories.size === 0) {
        debugConfig.enabled = false;
      }
      // eslint-disable-next-line no-console
      console.log(`[GOAT Debug] Disabled category: ${category}`);
    },

    enableAll: () => {
      debugConfig.enabled = true;
      debugConfig.categories.clear();
      debugConfig.categories.add('*');
      // eslint-disable-next-line no-console
      console.log('[GOAT Debug] All categories enabled');
    },

    disableAll: () => {
      debugConfig.enabled = false;
      debugConfig.categories.clear();
      // eslint-disable-next-line no-console
      console.log('[GOAT Debug] All logging disabled');
    },

    toggle: (category: LogCategory) => {
      if (debugConfig.categories.has(category)) {
        debugConfig.categories.delete(category);
        if (debugConfig.categories.size === 0) {
          debugConfig.enabled = false;
        }
        // eslint-disable-next-line no-console
        console.log(`[GOAT Debug] Disabled: ${category}`);
        return false;
      } else {
        debugConfig.enabled = true;
        debugConfig.categories.add(category);
        // eslint-disable-next-line no-console
        console.log(`[GOAT Debug] Enabled: ${category}`);
        return true;
      }
    },

    setLevel: (level: LogLevel) => {
      debugConfig.level = level;
      // eslint-disable-next-line no-console
      console.log(`[GOAT Debug] Log level set to: ${level}`);
    },

    setTimestamps: (enabled: boolean) => {
      debugConfig.timestamps = enabled;
      // eslint-disable-next-line no-console
      console.log(`[GOAT Debug] Timestamps: ${enabled ? 'enabled' : 'disabled'}`);
    },

    status: () => {
      const enabledCategories = debugConfig.categories.has('*')
        ? ['* (all)']
        : Array.from(debugConfig.categories);

      // eslint-disable-next-line no-console
      console.log('%c[GOAT Debug Status]', 'color: #22c55e; font-weight: bold');
      // eslint-disable-next-line no-console
      console.table({
        enabled: debugConfig.enabled,
        level: debugConfig.level,
        timestamps: debugConfig.timestamps,
        categories: enabledCategories.length > 0 ? enabledCategories.join(', ') : '(none)',
      });
    },

    categories: () => {
      // eslint-disable-next-line no-console
      console.log('%c[GOAT Debug] Available categories:', 'color: #22c55e');
      // eslint-disable-next-line no-console
      console.log(ALL_CATEGORIES.join(', '));
      return ALL_CATEGORIES;
    },

    isEnabled: (category: LogCategory) => {
      return shouldLog(category, 'debug');
    },
  };
}

/**
 * Initialize the debug API on the window object.
 * Safe to call multiple times - will only initialize once.
 */
export function initializeDebugAPI(): void {
  if (typeof window === 'undefined') return;

  // Only initialize in development or when explicitly requested
  if (
    process.env.NODE_ENV !== 'development' &&
    !window.__FORCE_DEBUG_GOAT__
  ) {
    return;
  }

  // Avoid re-initialization
  if (window.__DEBUG_GOAT__) return;

  const api = createDebugAPI();
  window.__DEBUG_GOAT__ = api;

  // eslint-disable-next-line no-console
  console.log(
    '%c[GOAT Debug] Debug API initialized. Use window.__DEBUG_GOAT__.status() for help.',
    'color: #22c55e; font-style: italic'
  );
}

// TypeScript declaration for window augmentation
declare global {
  interface Window {
    __DEBUG_GOAT__?: DebugAPI;
    __FORCE_DEBUG_GOAT__?: boolean;
    // Legacy debug flags (will be migrated)
    __GRID_DEBUG__?: boolean;
    __DND_DEBUG__?: boolean;
  }
}
