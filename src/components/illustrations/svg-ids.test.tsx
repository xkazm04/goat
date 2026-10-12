// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as empty from './EmptyStateIllustrations';
import { GoatCrownTrophy } from './GoatCrownTrophy';
import { SyncErrorIllustration } from './SyncErrorIllustrations';

/**
 * Each illustration declares its gradients in `<defs>` with a literal id and
 * paints with `url(#that-id)`. Ids are document-global: the second copy of an
 * illustration on a page produces a duplicate id (invalid HTML), and every
 * `url(#…)` in BOTH copies resolves to whichever `<defs>` the browser finds
 * first — if that copy is inside a `display: none` subtree (a closed popover, a
 * hidden tab) the gradient fails to paint in the visible one. `GoatCrownTrophy`
 * used the generic ids `glow` and `cupGradient`. Each component now derives its
 * ids from React's `useId`, so two instances never collide and every reference
 * resolves inside its own `<svg>`.
 *
 * Negative control (recorded 2026-09-05, before the fix): rendering each
 * illustration twice produced duplicate ids in 13 of 13 cases — the first `it`
 * was red for every row.
 */

vi.mock('@/hooks/use-motion-preference', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-motion-preference')>(
    '@/hooks/use-motion-preference',
  );
  return { ...actual, useMotionCapabilities: () => actual.getMotionCapabilities('full') };
});

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
  ['SyncErrorIllustration(network)', () => <SyncErrorIllustration error="network timeout" />],
  ['SyncErrorIllustration(quota)', () => <SyncErrorIllustration error="quota exceeded" />],
  ['GoatCrownTrophy', () => <GoatCrownTrophy />],
];

describe('illustration ids are unique per instance and every url(#…) resolves locally', () => {
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
  });

  async function renderTwice(make: () => React.ReactElement) {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(
        <>
          {make()}
          {make()}
        </>,
      );
    });
    return Array.from(container.querySelectorAll('svg'));
  }

  it.each(cases)('%s: two instances share no id', async (_name, make) => {
    await renderTwice(make);
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(cases)('%s: every url(#…) reference resolves inside its own svg', async (_name, make) => {
    const svgs = await renderTwice(make);
    let refs = 0;
    for (const svg of svgs) {
      const local = new Set(Array.from(svg.querySelectorAll('[id]')).map((el) => el.id));
      for (const el of Array.from(svg.querySelectorAll('*'))) {
        for (const attr of Array.from(el.attributes)) {
          const m = /^url\(#(.+)\)$/.exec(attr.value);
          if (!m) continue;
          refs++;
          expect(local.has(m[1])).toBe(true);
        }
      }
    }
    expect(refs).toBeGreaterThan(0);
  });
});
