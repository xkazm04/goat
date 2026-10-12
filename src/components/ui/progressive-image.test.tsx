// @vitest-environment jsdom
/**
 * ProgressiveImage / PlaceholderImage — load state is keyed by source.
 *
 * Both components used to hold `imageLoaded` / `imageError` as free booleans
 * and reset them in a `useEffect([src])`. That is one extra render per source
 * change and one painted frame in which the OLD image's "loaded" flag applied
 * to the NEW url. The state is now keyed by the url it was reported for, so a
 * new source invalidates it by derivation.
 *
 * Negative control (recorded 2026-09-05, scan-sweep core-ui, pre-fix tree):
 * `npx eslint` reported `react-hooks/set-state-in-effect` at
 * progressive-image.tsx:74 and placeholder-image.tsx:132, and jsx-a11y
 * `role-supports-aria-props` at progressive-image.tsx:93 — 3 warnings; the
 * fixed files report 0. This file run against the OLD components: 2 of 5 red
 * ("the description is referenced" — `aria-description` present,
 * `aria-describedby` absent; "loads when IntersectionObserver is unavailable"
 * — `new IntersectionObserver` threw). The two keyed-state tests pass on both
 * sides once effects flush; they pin the behaviour, the eslint count is the
 * figure for the render defect.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Motion is not under test: every motion.* element renders as its plain tag.
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
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});
vi.mock('@/hooks/use-progressive-wiki-image', () => ({
  useProgressiveWikiImage: () => ({ imageUrl: null, isFetching: false }),
}));

import { PlaceholderImage } from './placeholder-image';
import { ProgressiveImage } from './progressive-image';

describe('ProgressiveImage', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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

  const render = async (ui: React.ReactElement) => {
    const r = root!;
    await act(async () => r.render(ui));
  };
  const main = () => container.querySelector<HTMLImageElement>('[data-testid="progressive-image-main"]');
  const loading = () => container.querySelector('[data-testid="progressive-image-loading"]');

  it('a loaded flag reported for one url does not carry over to the next', async () => {
    const onLoad = vi.fn();
    await render(<ProgressiveImage src="https://img/a.png" alt="A" autoFetchWiki={false} onLoad={onLoad} />);
    expect(loading()).not.toBeNull();
    await act(async () => { main()!.dispatchEvent(new Event('load')); });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(loading()).toBeNull();

    await render(<ProgressiveImage src="https://img/b.png" alt="B" autoFetchWiki={false} onLoad={onLoad} />);
    // New url: not loaded until IT reports load.
    expect(main()!.getAttribute('src')).toBe('https://img/b.png');
    expect(loading()).not.toBeNull();
  });

  it('an error reported for one url does not hide the next url', async () => {
    await render(<ProgressiveImage src="https://img/a.png" alt="A" autoFetchWiki={false} />);
    await act(async () => { main()!.dispatchEvent(new Event('error')); });
    expect(container.querySelector('[data-testid="progressive-image-fallback"]')).not.toBeNull();
    expect(main()).toBeNull();

    await render(<ProgressiveImage src="https://img/b.png" alt="B" autoFetchWiki={false} />);
    expect(main()).not.toBeNull();
    expect(container.querySelector('[data-testid="progressive-image-fallback"]')).toBeNull();
  });

  it('the description is referenced, not an unsupported attribute', async () => {
    await render(<ProgressiveImage src="https://img/a.png" alt="A" ariaDescription="Cover of A" autoFetchWiki={false} />);
    const region = container.querySelector('[role="img"]')!;
    expect(region.hasAttribute('aria-description')).toBe(false);
    const id = region.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe('Cover of A');
  });
});

describe('PlaceholderImage', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const RealIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    const r = root;
    if (r) await act(async () => r.unmount());
    root = null;
    container.remove();
    if (RealIO) globalThis.IntersectionObserver = RealIO; else delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  it('loads the image when IntersectionObserver is unavailable instead of staying blurred', async () => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
    const r = root!;
    await act(async () => r.render(<PlaceholderImage src="https://img/a.png" alt="A" testId="pi" />));
    expect(container.querySelector('[data-testid="pi-main"]')).not.toBeNull();
  });

  it('load state is keyed by source', async () => {
    const r = root!;
    await act(async () => r.render(<PlaceholderImage src="https://img/a.png" alt="A" testId="pi" eager />));
    const img = () => container.querySelector<HTMLImageElement>('[data-testid="pi-main"]')!;
    await act(async () => { img().dispatchEvent(new Event('load')); });
    expect(container.querySelector('[data-testid="pi-blur"]')).toBeNull();

    await act(async () => r.render(<PlaceholderImage src="https://img/b.png" alt="B" testId="pi" eager />));
    expect(container.querySelector('[data-testid="pi-blur"]')).not.toBeNull();
  });
});
