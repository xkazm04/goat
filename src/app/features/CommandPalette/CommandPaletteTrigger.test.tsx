// @vitest-environment jsdom
/**
 * CommandPaletteTrigger — the shortcut label must hydrate cleanly.
 *
 * The trigger is rendered inside a server-rendered landing page. Its "⌘" vs
 * "Ctrl" label is a client fact (the platform), so the server pass must emit
 * the neutral label and the client must switch AFTER hydration — reading
 * `navigator` during render makes the server HTML and the first client render
 * disagree on Macs, which React reports as a hydration mismatch and repaints.
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): against
 * the pre-fix component (`navigator.platform` read in render), the server
 * string on a Mac contained "⌘" and the case below was red. 2/2 after.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const R = await import('react');
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover']);
  const strip = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)));
  const motion = new Proxy({} as Record<string, unknown>, {
    get: (_t, tag: string) =>
      R.forwardRef((props: Record<string, unknown>, ref) => R.createElement(tag, { ...strip(props), ref })),
  });
  return { motion };
});
vi.mock('@/components/visual/depth', () => ({ ELEVATION: { medium: 'none' } }));
vi.mock('@/lib/animations/motion-presets', () => ({ DURATION: { slow: 0 } }));

import { CommandPaletteTrigger } from './CommandPaletteTrigger';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let platformDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  platformDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
  Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
});

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).platform;
  if (platformDescriptor) Object.defineProperty(Navigator.prototype, 'platform', platformDescriptor);
});

describe('CommandPaletteTrigger shortcut label', () => {
  it('the server pass emits the neutral "Ctrl" label even on a Mac', () => {
    const html = renderToString(<CommandPaletteTrigger variant="inline" />);
    expect(html).toContain('Ctrl');
    expect(html).not.toContain('⌘');
  });

  it('the client shows "⌘" on a Mac once mounted', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() => {
      root.render(<CommandPaletteTrigger variant="inline" />);
    });
    expect(el.textContent).toContain('⌘');
    act(() => root.unmount());
    el.remove();
  });
});
