// @vitest-environment jsdom
/**
 * CommandPalette — an engine failure is not an empty result.
 *
 * The palette has two data paths for a typed query: the universal search
 * (per-domain status) and the client-side list fallback (two list queries).
 * When either path FAILS, the screen must say so; it must not paint the
 * "No lists found" empty state, which tells the user to stop looking.
 * (registry: search/query-parsing — failure-not-empty-success.)
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): against
 * the pre-fix component both cases were red — with every search domain failed
 * and no results, the failure banner was gated behind the results branch and
 * never rendered, and the two list queries' errors were never read, so both
 * failures painted "No lists found for …". 2/2 after.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getContainer, h, mount, resetHarness, teardownHarness, type } from './CommandPalette.harness';

beforeEach(resetHarness);
afterEach(teardownHarness);

const ALL_DOMAINS = ['lists', 'items', 'groups', 'blueprints', 'users'];

describe('CommandPalette failure states', () => {
  it('every search domain failing with no results is shown as a failure, not as "no lists found"', () => {
    h.quick.failedDomains = ALL_DOMAINS.map((domain) => ({ domain, error: 'fetch failed' }));
    mount();
    type('nba');
    const text = getContainer().textContent ?? '';
    expect(text).toContain('unavailable');
    expect(text).not.toContain('No lists found');
  });

  it('the client-side list queries failing is shown as a failure, not as "no lists found"', () => {
    h.topLists = { data: [], isLoading: false, error: new Error('network') };
    h.userLists = { data: [], isLoading: false, error: new Error('network') };
    mount();
    type('nba');
    const text = getContainer().textContent ?? '';
    expect(text).toContain('unavailable');
    expect(text).not.toContain('No lists found');
  });

  it('a genuine zero still reads as a zero', () => {
    h.topLists = { data: [], isLoading: false, error: null };
    mount();
    type('nba');
    const text = getContainer().textContent ?? '';
    expect(text).toContain('No lists found');
    expect(text).not.toContain('unavailable');
  });
});
