// @vitest-environment jsdom
/**
 * ScorePreviewOverlay / MiniThemedPreview — reduced motion is read through the
 * SSR-safe preference hook, never from `window.matchMedia` during render.
 *
 * A render-time matchMedia read yields `false` on the server and `true` on a
 * reduced-motion client, so the `initial` props (and the inline styles they
 * produce) differ between the server markup and the first client render — a
 * hydration mismatch. The 3-tier hook (`useMotionPreference`) already solves
 * this for PageTransition; both components here now go through it.
 *
 * Negative control (recorded 2026-09-05, scan-sweep core-ui, pre-fix tree):
 * both "does not read matchMedia during render" tests were red — matchMedia
 * was called once per render in each component, and the pulse element did not
 * exist under the old state-driven shape. 3 of 3 red pre-fix; 3/3 green here.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => {
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layout']);
  const motion = new Proxy({} as Record<string, React.ElementType>, {
    get: (_t, tag: string) => {
      const Plain = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
        const rest: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(props)) if (!MOTION_PROPS.has(k)) rest[k] = v;
        return React.createElement(tag, { ...rest, ref });
      });
      Plain.displayName = `motion.${tag}`;
      return Plain;
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useSpring: (v: number) => ({ set: () => {}, get: () => v }),
    useTransform: (mv: { get: () => number }, fn: (v: number) => number) => fn(mv.get()),
  };
});

const runtime = vi.hoisted(() => ({ tier: 'full' as 'full' | 'reduced' | 'minimal' }));
vi.mock('@/hooks/use-motion-preference', () => ({
  useMotionPreference: () => ({ tier: runtime.tier }),
}));

import { MiniThemedPreview, ScorePreviewOverlay } from './ScorePreviewOverlay';

describe('reduced-motion read site', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }));

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    (window as unknown as { matchMedia: unknown }).matchMedia = matchMedia;
    matchMedia.mockClear();
    runtime.tier = 'full';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    const r = root;
    if (r) await act(async () => r.unmount());
    root = null;
    container.remove();
  });
  const render = async (ui: React.ReactElement) => { const r = root!; await act(async () => r.render(ui)); };

  it('MiniThemedPreview does not read matchMedia during render', async () => {
    await render(<MiniThemedPreview score={42} category="Sports" />);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('ScorePreviewOverlay does not read matchMedia during render', async () => {
    await render(<ScorePreviewOverlay score={42} category="Movies" />);
    expect(matchMedia).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Below Avg');
  });

  it('a non-full tier suppresses the threshold pulse element', async () => {
    runtime.tier = 'reduced';
    await render(<ScorePreviewOverlay score={90} />);
    expect(container.querySelector('[data-testid="score-threshold-pulse"]')).toBeNull();
    runtime.tier = 'full';
    // The component is memoised and the hook mock is not a subscription, so a
    // prop must change for the tier switch to be observed.
    await render(<ScorePreviewOverlay score={90} size="lg" />);
    expect(container.querySelector('[data-testid="score-threshold-pulse"]')).not.toBeNull();
  });
});
