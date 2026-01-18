/**
 * Store Logger Utility
 *
 * A toggleable logging system for store operations that can be disabled in production.
 * Uses namespaced loggers for easy filtering and debugging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  namespaces: Set<string>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: LoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  level: 'debug',
  namespaces: new Set(['*']),
};

function shouldLog(namespace: string, level: LogLevel): boolean {
  if (!config.enabled) return false;
  if (LOG_LEVELS[level] < LOG_LEVELS[config.level]) return false;
  if (config.namespaces.has('*')) return true;
  return config.namespaces.has(namespace);
}

function formatPrefix(namespace: string, emoji?: string): string {
  const prefix = emoji ? `${emoji} ` : '';
  return `${prefix}[${namespace}]`;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
}

/**
 * Creates a namespaced logger instance.
 * @param namespace - The namespace for this logger (e.g., 'grid-store', 'session-store')
 * @param emoji - Optional emoji prefix for visual distinction in console
 */
export function createLogger(namespace: string, emoji?: string): Logger {
  const prefix = formatPrefix(namespace, emoji);

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog(namespace, 'debug')) {
        console.log(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLog(namespace, 'info')) {
        console.log(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLog(namespace, 'warn')) {
        console.warn(prefix, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (shouldLog(namespace, 'error')) {
        console.error(prefix, ...args);
      }
    },
    log: (...args: unknown[]) => {
      if (shouldLog(namespace, 'info')) {
        console.log(prefix, ...args);
      }
    },
  };
}

/**
 * Configure the logger globally.
 */
export const loggerConfig = {
  /** Enable or disable all logging */
  setEnabled(enabled: boolean): void {
    config.enabled = enabled;
  },

  /** Set minimum log level */
  setLevel(level: LogLevel): void {
    config.level = level;
  },

  /** Enable specific namespaces (use '*' for all) */
  setNamespaces(namespaces: string[]): void {
    config.namespaces = new Set(namespaces);
  },

  /** Add a namespace to enabled list */
  enableNamespace(namespace: string): void {
    config.namespaces.add(namespace);
  },

  /** Remove a namespace from enabled list */
  disableNamespace(namespace: string): void {
    config.namespaces.delete(namespace);
  },

  /** Check if logging is enabled */
  isEnabled(): boolean {
    return config.enabled;
  },
};

// Pre-configured loggers for stores
export const storeLoggers = {
  grid: createLogger('grid-store', '🔄'),
  session: createLogger('session-store', '💾'),
  backlog: createLogger('backlog-store', '📦'),
  match: createLogger('match-store', '🎯'),
  comparison: createLogger('comparison-store', '⚖️'),
  tier: createLogger('tier-store', '📊'),
  activity: createLogger('activity-store', '📈'),
  heatmap: createLogger('heatmap-store', '🗺️'),
  consensus: createLogger('consensus-store', '🤝'),
  wikiImage: createLogger('wiki-image-store', '🖼️'),
  validation: createLogger('validation-store', '✅'),
  list: createLogger('list-store', '📋'),
};

// Convenience exports for direct import
export const gridLogger = storeLoggers.grid;
export const sessionLogger = storeLoggers.session;
export const backlogLogger = storeLoggers.backlog;
export const matchLogger = storeLoggers.match;
export const tierLogger = storeLoggers.tier;
export const activityLogger = storeLoggers.activity;
export const heatmapLogger = storeLoggers.heatmap;
export const consensusLogger = storeLoggers.consensus;
export const wikiImageLogger = storeLoggers.wikiImage;
export const validationLogger = storeLoggers.validation;
export const listLogger = storeLoggers.list;
