// @vitest-environment jsdom
/**
 * CommandPalette — the render harness.
 *
 * Before 2026-09-05 this context (7 files, ~1,630 lines) had zero tests, so
 * every keyboard/click/state claim about the palette was a reading, not a
 * measurement. This file is the instrument: it mounts the real component with
 * every data hook replaced by a controllable stand-in, so a test can put the
 * palette into a named state (results / no results / engine failure / create
 * mode) and assert what the DOM says and what the handlers call.
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): with
 * `handleNavigateToList`'s push changed to a bare `/goat`, "clicking a
 * client-side list result navigates to /goat?list=<id>" failed
 * (expected '/goat?list=l1'); the other two stayed green. Restored, 3/3 green.
 * The `framer-motion` mock is not load-bearing for renderability (the real
 * runtime renders under jsdom) — it is here so no assertion waits on an
 * AnimatePresence exit.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Controllable hook state. Each test mutates `h` before mounting.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  quick: {
    results: [] as Array<{ id: string; domain: string; title: string; url: string; subtitle?: string; score: number }>,
    isLoading: false,
    error: null as Error | null,
    failedDomains: [] as Array<{ domain: string; error: string }>,
  },
  history: [] as Array<{ query: string; domain?: string }>,
  addToHistory: vi.fn(),
  userLists: { data: [] as unknown[], isLoading: false, error: null as Error | null },
  topLists: { data: [] as unknown[], isLoading: false, error: null as Error | null },
  push: vi.fn(),
  toast: vi.fn(),
  trackError: vi.fn(),
  createList: vi.fn(),
  setCurrentList: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const R = await import('react');
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover', 'layout', 'variants']);
  const strip = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)));
  const motion = new Proxy({} as Record<string, unknown>, {
    get: (_t, tag: string) =>
      R.forwardRef((props: Record<string, unknown>, ref) => R.createElement(tag, { ...strip(props), ref })),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => R.createElement(R.Fragment, null, children),
  };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('@/components/visual/depth', () => ({ ELEVATION: { modal: 'none', medium: 'none' } }));
vi.mock('@/components/visual/GoatMascot', () => ({
  GoatMascot: () => React.createElement('span', { 'data-testid': 'goat-mascot' }),
}));
vi.mock('@/hooks/use-search', () => ({
  useQuickSearch: () => h.quick,
  useSearchHistory: () => ({ history: h.history, addToHistory: h.addToHistory }),
}));
vi.mock('@/hooks/use-temp-user', () => ({ useTempUser: () => ({ tempUserId: 'temp-user-1', isLoaded: true }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: h.toast }));
vi.mock('@/hooks/use-top-lists', () => ({
  useTopLists: () => h.topLists,
  useUserLists: () => h.userLists,
}));
vi.mock('@/lib/animations/motion-presets', () => ({ DURATION: { quick: 0, slow: 0 } }));
vi.mock('@/lib/errors/error-analytics', () => ({ trackError: h.trackError }));
vi.mock('@/services/list-creation-service', () => ({ listCreationService: { createList: h.createList } }));
vi.mock('@/stores/use-list-store', () => ({ useListStore: () => ({ setCurrentList: h.setCurrentList }) }));

import { CommandPalette } from './CommandPalette';

import type { TopList } from '@/types/top-lists';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
let container: HTMLDivElement;
let root: Root | null = null;

function mount(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn();
  act(() => {
    root = createRoot(container);
    root.render(<CommandPalette isOpen={props.isOpen ?? true} onClose={onClose} />);
  });
  return { onClose };
}

const byTestId = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const input = () => byTestId('command-palette-input') as HTMLInputElement;

function type(value: string) {
  act(() => {
    const el = input();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function press(key: string, target: Element = input()) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

function click(el: Element | null) {
  if (!el) throw new Error('click target missing');
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

function makeList(id: string, title: string, category = 'Sports', subcategory?: string): TopList {
  return { id, title, category, subcategory, size: 10 } as unknown as TopList;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  h.quick.results = [];
  h.quick.isLoading = false;
  h.quick.error = null;
  h.quick.failedDomains = [];
  h.history = [];
  h.userLists = { data: [], isLoading: false, error: null };
  h.topLists = { data: [], isLoading: false, error: null };
  h.addToHistory.mockReset();
  h.push.mockReset();
  h.toast.mockReset();
  h.trackError.mockReset();
  h.setCurrentList.mockReset();
  h.createList.mockReset();
  h.createList.mockResolvedValue({ success: true, listId: 'new-1', list: { id: 'new-1' }, metadata: {} });
  localStorage.clear();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container.remove();
});

// ---------------------------------------------------------------------------
// Surface contract — the three testids the e2e smoke test reaches for
// (e2e/exploratory-smoke.spec.ts:96-102) plus the mode switch.
// ---------------------------------------------------------------------------
describe('CommandPalette surface', () => {
  it('renders nothing when closed and the container + input when open', () => {
    mount({ isOpen: false });
    expect(byTestId('command-palette-container')).toBeNull();
    act(() => root!.unmount());
    root = null;

    mount({ isOpen: true });
    expect(byTestId('command-palette-container')).not.toBeNull();
    expect(byTestId('command-palette-backdrop')).not.toBeNull();
    expect(input()).not.toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('Escape with no category filter closes; typing "new …" enters create mode with a parsed title', () => {
    const { onClose } = mount();
    type('new top 10 basketball all-time');
    expect(container.textContent).toContain('Top 10 Sports - Basketball (All-Time)');
    expect(container.textContent).toContain('Creating new list');
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a client-side list result navigates to /goat?list=<id>', () => {
    h.topLists = { data: [makeList('l1', 'NBA Legends'), makeList('l2', 'Best Albums', 'Music')], isLoading: false, error: null };
    const { onClose } = mount();
    type('nba');
    click(byTestId('command-palette-list-0'));
    expect(h.push).toHaveBeenCalledWith('/goat?list=l1');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(h.setCurrentList).toHaveBeenCalledTimes(1);
  });
});
