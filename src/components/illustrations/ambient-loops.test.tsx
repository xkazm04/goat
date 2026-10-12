// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MotionTier } from '@/hooks/use-motion-preference';

/**
 * The illustrations in this directory carry infinite loops in THREE engines:
 * SMIL `<animate repeatCount="indefinite">` (EmptyState*, SyncError*), framer
 * `repeat: Infinity` (GoatCrownTrophy, BracketDrawingLoader), and — elsewhere in
 * the app — CSS keyframes. The app's motion tier (`useMotionCapabilities`) is
 * read by the framer surfaces in `src/components/3d`, but a reduction mechanism
 * reaches only the engine it lives in (registry: motion/reduced-motion-mechanics,
 * "every reduction mechanism is engine-scoped"): nothing here read the tier, so
 * a user on the `reduced` or `minimal` tier — or with the OS preference set — got
 * 47 forever-flashing sparkles. An infinite opacity pulse is exactly the stimulus
 * the preference exists to suppress; a loop reduces to stillness.
 *
 * Negative control (recorded 2026-09-05, before the fix): under tier `reduced`
 * every illustration below still rendered its `<animate>` children —
 * EmptyTrophyCase 3, NoSearchResults 6, ToppledTrophy 3, SyncErrorIllustration
 * 2 each — so the first `it` was red at 13 of 13 cases.
 */

let tier: MotionTier = 'full';
vi.mock('@/hooks/use-motion-preference', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-motion-preference')>(
    '@/hooks/use-motion-preference',
  );
  return {
    ...actual,
    useMotionCapabilities: () => actual.getMotionCapabilities(tier),
  };
});

// Imported after the mock is registered (vi.mock is hoisted, but explicit ordering
// keeps the intent legible).
const empty = await import('./EmptyStateIllustrations');
const sync = await import('./SyncErrorIllustrations');

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const cases: Array<[string, () => React.ReactElement]> = [
  ['EmptyTrophyCase', () => <empty.EmptyTrophyCase />],
  ['NoSearchResults', () => <empty.NoSearchResults />],
  ['NoMetadata', () => <empty.NoMetadata />],
  ['CategoryEmptyState(movies)', () => <empty.CategoryEmptyState category="movies" />],
  ['CategoryEmptyState(music)', () => <empty.CategoryEmptyState category="music" />],
  ['CategoryEmptyState(games)', () => <empty.CategoryEmptyState category="games" />],
  ['ToppledTrophy', () => <empty.ToppledTrophy />],
  ['GoatBookmark', () => <empty.GoatBookmark />],
  ['GoatFilterEmpty', () => <empty.GoatFilterEmpty />],
  ['GoatZeroResults', () => <empty.GoatZeroResults />],
  ['GoatBrokenFrame', () => <empty.GoatBrokenFrame />],
  ['GoatDisconnected', () => <empty.GoatDisconnected />],
  ['SyncErrorIllustration(network)', () => <sync.SyncErrorIllustration error="network timeout" />],
  ['SyncErrorIllustration(server)', () => <sync.SyncErrorIllustration error={null} />],
  ['SyncErrorIllustration(quota)', () => <sync.SyncErrorIllustration error="quota exceeded" />],
];

describe('illustration loops honour the motion tier (SMIL engine)', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => r.unmount());
      root = null;
    }
    container.remove();
    tier = 'full';
  });

  async function render(el: React.ReactElement): Promise<number> {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(el);
    });
    return container.querySelectorAll('animate').length;
  }

  it.each(cases)('%s renders no <animate> under the reduced tier', async (_name, make) => {
    tier = 'reduced';
    expect(await render(make())).toBe(0);
  });

  it.each(cases)('%s renders no <animate> under the minimal tier', async (_name, make) => {
    tier = 'minimal';
    expect(await render(make())).toBe(0);
  });

  it('the loops still exist under the full tier (the fix is a gate, not a deletion)', async () => {
    tier = 'full';
    let total = 0;
    for (const [, make] of cases) {
      total += await render(make());
      const r = root!;
      await act(async () => r.unmount());
      root = null;
    }
    // 47 <animate> elements across both modules; every case here reaches at least one.
    expect(total).toBeGreaterThanOrEqual(cases.length);
  });
});
