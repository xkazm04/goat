// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as logger from '@/lib/logger';
import * as debugConfig from '@/lib/logger/debug-config';

/**
 * The logger contract (LOG-02 runtime debug toggles, LOG-03 level filtering,
 * LOG-04 category loggers), as a test that RUNS.
 *
 * This replaces scripts/verify-logger.js, a 30-assertion checker that grepped
 * the two source files for exact strings — `export { shouldLog, getDebugConfig,
 * initializeDebugAPI }`, `if (!debugConfig.enabled) return false` — and that no
 * npm script, CI job or hook ever invoked. Two defects in one artifact: a check
 * that runs only when someone remembers it enforces nothing (quality-gates/
 * severity-by-construction), and a check that matches source TEXT is satisfied
 * by a comment quoting the rule and broken by a harmless reformat
 * (operation-assertion-gates: normalise, then match — or better, exercise the
 * behaviour). Measured 2026-09-05: 30/30 passing, 0 executions by any rung
 * since it landed on 2026-01-29.
 *
 * Negative control (recorded 2026-09-05): with `setLevel('warn')` replaced by a
 * no-op in a scratch copy of debug-config, the LOG-03 case below went red.
 */

type DebugWindow = Window & {
  __DEBUG_GOAT__?: debugConfig.DebugAPI;
  __FORCE_DEBUG_GOAT__?: boolean;
};

const w = window as DebugWindow;

describe('logger contract', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    w.__FORCE_DEBUG_GOAT__ = true;
    delete w.__DEBUG_GOAT__;
    debugConfig.initializeDebugAPI();
  });

  afterEach(() => {
    w.__DEBUG_GOAT__?.disableAll();
    w.__DEBUG_GOAT__?.setLevel('debug');
    delete w.__DEBUG_GOAT__;
    delete w.__FORCE_DEBUG_GOAT__;
    vi.restoreAllMocks();
  });

  it('LOG-02: the runtime debug API is installed once, with every documented toggle', () => {
    const api = w.__DEBUG_GOAT__;
    expect(api).toBeDefined();
    for (const fn of ['enable', 'disable', 'enableAll', 'disableAll', 'setLevel', 'status'] as const) {
      expect(typeof api?.[fn]).toBe('function');
    }
    // Re-initialising must not replace the installed object.
    debugConfig.initializeDebugAPI();
    expect(w.__DEBUG_GOAT__).toBe(api);
    // The index re-exports the same door.
    expect(logger.initializeDebugAPI).toBe(debugConfig.initializeDebugAPI);
    expect(logger.shouldLog).toBe(debugConfig.shouldLog);
    expect(logger.getDebugConfig).toBe(debugConfig.getDebugConfig);
  });

  it('LOG-02: logging is off until a category is enabled, and off again after disableAll', () => {
    const api = w.__DEBUG_GOAT__!;
    expect(debugConfig.shouldLog('grid', 'error')).toBe(false);

    api.enable('grid');
    expect(debugConfig.shouldLog('grid', 'debug')).toBe(true);
    expect(debugConfig.shouldLog('session', 'debug')).toBe(false);

    api.enableAll();
    expect(debugConfig.shouldLog('session', 'debug')).toBe(true);
    expect(debugConfig.getDebugConfig().categories.has('*')).toBe(true);

    api.disableAll();
    expect(debugConfig.shouldLog('grid', 'error')).toBe(false);
    expect(debugConfig.getDebugConfig().enabled).toBe(false);
  });

  it('LOG-03: setLevel filters by priority debug < info < warn < error', () => {
    const api = w.__DEBUG_GOAT__!;
    api.enable('grid');
    api.setLevel('warn');
    expect(debugConfig.shouldLog('grid', 'debug')).toBe(false);
    expect(debugConfig.shouldLog('grid', 'info')).toBe(false);
    expect(debugConfig.shouldLog('grid', 'warn')).toBe(true);
    expect(debugConfig.shouldLog('grid', 'error')).toBe(true);
  });

  it('LOG-04: a category logger exists for every category the index promises', () => {
    const categories = [
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
    ] as const;
    for (const c of categories) {
      const l = (logger as Record<string, unknown>)[`${c}Logger`] as logger.CategoryLogger | undefined;
      expect(l, `${c}Logger`).toBeDefined();
      expect(typeof l?.debug).toBe('function');
    }
    expect(typeof logger.createCategoryLogger).toBe('function');
    const custom = logger.createCategoryLogger('cache');
    expect(typeof custom.warn).toBe('function');
  });
});
