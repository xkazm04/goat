// @vitest-environment jsdom
import { Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionToolbar } from './CollectionToolbar';

import type { ItemCategory, ItemPanelStats } from '../types';

/**
 * The toolbar's "group reorder highlight" effect compared the incoming group
 * ids against a `prevGroupIds` STATE and then wrote a fresh array back into
 * that state — with `prevGroupIds` in its own dependency list. Every run
 * produced a new array reference, so every run scheduled the next: the
 * toolbar re-rendered continuously for as long as it was mounted.
 *
 * The instrument is a React `Profiler` commit counter over a fixed real-time
 * window. This suite deliberately does NOT wrap renders in `act()`: `act`
 * waits for effects to settle, and a component whose effects never settle
 * turns the test into a hang (measured: past the 180 s runner timeout)
 * rather than a red.
 *
 * Negative control (recorded 2026-09-05, before the fix, same instrument):
 * mounting with a STABLE `groups` prop committed 125 times in the first
 * second and kept committing at ~130/s thereafter, with React logging
 * "Maximum update depth exceeded" 8 times. After the fix the same window
 * commits 2-3 times. The first assertion below was red.
 */

const STATS: ItemPanelStats = {
  totalItems: 3,
  selectedItems: 3,
  visibleGroups: 1,
  totalGroups: 1,
};

const GROUPS: ItemCategory[] = [
  { id: 'g1', name: 'Alpha', items: [] } as unknown as ItemCategory,
  { id: 'g2', name: 'Beta', items: [] } as unknown as ItemCategory,
];

/** A settled toolbar commits on mount, once when the initial-load timer clears, and nothing else. */
const SETTLED_COMMIT_CEILING = 6;

const flush = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function depthWarnings(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((call) => String(call[0]).includes('Maximum update depth exceeded')).length;
}

describe('CollectionToolbar render stability', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let commits = 0;

  const toolbar = (groups: ItemCategory[]) => (
    <Profiler id="collection-toolbar" onRender={() => { commits += 1; }}>
      <CollectionToolbar
        stats={STATS}
        isVisible
        onToggleVisibility={() => {}}
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
        groups={groups}
        selectedGroupIds={new Set(['g1', 'g2'])}
        onToggleGroup={() => {}}
      />
    </Profiler>
  );

  beforeEach(() => {
    commits = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    root?.unmount();
    root = null;
    container.remove();
    consoleError.mockRestore();
  });

  it('mounting with a stable groups prop settles instead of re-rendering continuously', async () => {
    root = createRoot(container);
    root.render(toolbar(GROUPS));
    await flush(1000);

    expect(commits, 'commits in the first second after mount').toBeLessThanOrEqual(SETTLED_COMMIT_CEILING);
    expect(depthWarnings(consoleError), 'React must not report a passive-effect update loop').toBe(0);
    expect(container.querySelector('[data-testid="collection-toolbar-header"]')).not.toBeNull();
  });

  it('a reorder of the same groups highlights every group once, then settles', async () => {
    root = createRoot(container);
    root.render(toolbar(GROUPS));
    await flush(150);
    const beforeReorder = commits;
    root.render(toolbar([GROUPS[1], GROUPS[0]]));
    await flush(150);

    const highlighted = container.querySelectorAll('[data-testid^="category-"][data-testid$="-btn"].ring-2');
    expect(highlighted.length, 'the reorder highlight must fire for both groups').toBe(2);

    await flush(1000);
    // Reorder render + highlight on + highlight off (800 ms timer) + initial-load timer.
    expect(commits - beforeReorder, 'commits in the second after a reorder').toBeLessThanOrEqual(SETTLED_COMMIT_CEILING);
    expect(depthWarnings(consoleError)).toBe(0);
  });
});
