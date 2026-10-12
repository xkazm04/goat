// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GoatMascot } from '@/components/icons/GoatMascot';
import {
  HiddenGemIcon,
  InGridIcon,
  RecentIcon,
  TopRatedIcon,
  UnrankedIcon,
} from '@/components/icons/MicroIllustrations';

import { BracketDrawingLoader } from './BracketDrawingLoader';
import * as empty from './EmptyStateIllustrations';
import { GoatCrownTrophy } from './GoatCrownTrophy';
import { SyncErrorIllustration } from './SyncErrorIllustrations';
import { TierEmptyIllustration } from './TierEmptyIllustration';

/**
 * Every illustration in this context is DECORATIVE: it sits beside a caption,
 * a heading or a chip label that already says what the state is. An inline
 * `<svg>` with neither `aria-hidden` nor an accessible name is announced by
 * some screen readers as an unlabeled "image" or "graphic", and the 47 SMIL
 * pulses inside them were, before ambient-loops.test.tsx, live content a
 * reader could land on. The rule (registry: accessibility/a11y-verification —
 * assert what a screen reader would hear, not what a checker reports) is that
 * a decorative graphic is hidden from the tree and unfocusable; a graphic given
 * a label by its caller becomes an `img` with that name instead.
 *
 * Negative control (recorded 2026-09-05, before the fix): 0 of the 28 rendered
 * `<svg>` roots below carried `aria-hidden` — every `it` was red.
 */

// jsdom has no matchMedia; the illustrations read the motion tier through this
// hook (ambient-loops.test.tsx covers that behaviour), so pin it here.
vi.mock('@/hooks/use-motion-preference', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-motion-preference')>(
    '@/hooks/use-motion-preference',
  );
  return { ...actual, useMotionCapabilities: () => actual.getMotionCapabilities('full') };
});

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const decorative: Array<[string, () => React.ReactElement]> = [
  ['EmptyTrophyCase', () => <empty.EmptyTrophyCase />],
  ['NoSearchResults', () => <empty.NoSearchResults />],
  ['NoMetadata', () => <empty.NoMetadata />],
  ['CategoryEmptyState(movies)', () => <empty.CategoryEmptyState category="movies" />],
  ['CategoryEmptyState(music)', () => <empty.CategoryEmptyState category="music" />],
  ['CategoryEmptyState(games)', () => <empty.CategoryEmptyState category="games" />],
  ['CategoryEmptyState(sports)', () => <empty.CategoryEmptyState category="sports" />],
  ['ToppledTrophy', () => <empty.ToppledTrophy />],
  ['GoatBookmark', () => <empty.GoatBookmark />],
  ['GoatFilterEmpty', () => <empty.GoatFilterEmpty />],
  ['GoatZeroResults', () => <empty.GoatZeroResults />],
  ['GoatBrokenFrame', () => <empty.GoatBrokenFrame />],
  ['GoatDisconnected', () => <empty.GoatDisconnected />],
  ['CategorySlotIllustration(movies)', () => <empty.CategorySlotIllustration category="movies" />],
  ['CategorySlotIllustration(music)', () => <empty.CategorySlotIllustration category="music" />],
  ['CategorySlotIllustration(games)', () => <empty.CategorySlotIllustration category="games" />],
  ['CategorySlotIllustration(other)', () => <empty.CategorySlotIllustration />],
  ['SyncErrorIllustration(network)', () => <SyncErrorIllustration error="network timeout" />],
  ['SyncErrorIllustration(server)', () => <SyncErrorIllustration error={null} />],
  ['SyncErrorIllustration(quota)', () => <SyncErrorIllustration error="quota exceeded" />],
  ['GoatCrownTrophy', () => <GoatCrownTrophy />],
  ['BracketDrawingLoader', () => <BracketDrawingLoader />],
  ['TierEmptyIllustration(S)', () => <TierEmptyIllustration tierLabel="S" color="#fff" />],
  ['TierEmptyIllustration(F, highlighted)', () => <TierEmptyIllustration tierLabel="F" color="#fff" isHighlighted />],
  ['GoatMascot', () => <GoatMascot />],
  ['UnrankedIcon', () => <UnrankedIcon />],
  ['InGridIcon', () => <InGridIcon />],
  ['TopRatedIcon', () => <TopRatedIcon />],
  ['RecentIcon', () => <RecentIcon />],
  ['HiddenGemIcon', () => <HiddenGemIcon />],
];

describe('decorative illustrations are hidden from assistive technology', () => {
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

  async function render(el: React.ReactElement) {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(el);
    });
    return Array.from(container.querySelectorAll('svg'));
  }

  it.each(decorative)('%s: every <svg> is aria-hidden and unfocusable', async (_name, make) => {
    const svgs = await render(make());
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
    }
  });

  it('a mascot or icon given an accessible name by its caller is an img, not hidden', async () => {
    const [mascot] = await render(<GoatMascot aria-label="G.O.A.T. mascot" />);
    expect(mascot.getAttribute('aria-hidden')).toBeNull();
    expect(mascot.getAttribute('role')).toBe('img');
    expect(mascot.getAttribute('aria-label')).toBe('G.O.A.T. mascot');
    const r = root!;
    await act(async () => r.unmount());
    root = null;

    const [icon] = await render(<TopRatedIcon aria-label="Top rated" />);
    expect(icon.getAttribute('aria-hidden')).toBeNull();
    expect(icon.getAttribute('role')).toBe('img');
  });
});
