// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MotionTier } from '@/hooks/use-motion-preference';

/**
 * The framer-engine half of the loop audit (the SMIL half is
 * ambient-loops.test.tsx). GoatCrownTrophy runs three `repeat: Infinity`
 * sparkle loops and BracketDrawingLoader eleven draw-on loops; neither read the
 * motion tier, so the `reduced`/`minimal` tiers — and the OS preference — were
 * ignored. An infinite loop reduces to STILLNESS, and the still frame must keep
 * the information the gesture carried (registry: motion/reduced-motion-mechanics,
 * motion/content-bearing-degradation): the loader's still frame is the fully
 * drawn bracket with its caption, not a blank box.
 *
 * Negative control (recorded 2026-09-05, before the fix): under tier `reduced`
 * neither root carried a `data-motion` marker and every dashed loader segment
 * sat at its un-drawn offset (14/18/22/42/68) — 6 of 6 tests red.
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

const { GoatCrownTrophy } = await import('./GoatCrownTrophy');
const { BracketDrawingLoader } = await import('./BracketDrawingLoader');

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

describe('framer loops honour the motion tier', () => {
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

  async function render(el: React.ReactElement) {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(el);
    });
    return container.querySelector('svg')!;
  }

  it.each(['reduced', 'minimal'] as MotionTier[])('GoatCrownTrophy is still under %s', async (t) => {
    tier = t;
    const svg = await render(<GoatCrownTrophy />);
    expect(svg.getAttribute('data-motion')).toBe('still');
  });

  it('GoatCrownTrophy loops under full', async () => {
    tier = 'full';
    const svg = await render(<GoatCrownTrophy />);
    expect(svg.getAttribute('data-motion')).toBe('loop');
  });

  it.each(['reduced', 'minimal'] as MotionTier[])(
    'BracketDrawingLoader shows the fully drawn bracket under %s',
    async (t) => {
      tier = t;
      const svg = await render(<BracketDrawingLoader />);
      expect(svg.getAttribute('data-motion')).toBe('still');
      const dashed = Array.from(svg.querySelectorAll('[stroke-dasharray]'));
      expect(dashed.length).toBe(10);
      // Every segment is at offset 0 — drawn — so the still frame carries the
      // same information the animation ends on.
      expect(dashed.map((el) => el.getAttribute('stroke-dashoffset'))).toEqual(dashed.map(() => '0'));
      expect(svg.textContent).toBe('');
      expect(container.textContent).toContain('Preparing your bracket');
    },
  );

  it('BracketDrawingLoader draws on under full', async () => {
    tier = 'full';
    const svg = await render(<BracketDrawingLoader />);
    expect(svg.getAttribute('data-motion')).toBe('loop');
    const offsets = Array.from(svg.querySelectorAll('[stroke-dasharray]')).map((el) =>
      el.getAttribute('stroke-dashoffset'),
    );
    expect(offsets.length).toBe(10);
    expect(offsets.every((o) => o !== '0')).toBe(true);
  });
});
