/**
 * CommandPalette test harness — shared by every `CommandPalette.*.test.tsx`.
 *
 * Registers the hook stand-ins, then imports the real component so the mocks
 * are in place before the component's module graph loads. Tests import
 * everything from here and never import the component directly.
 *
 * Not a test file (no `.test.` in the name), so vitest does not run it.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Controllable hook state. Each test mutates `h` before mounting.
// ---------------------------------------------------------------------------
const hoisted = vi.hoisted(() => ({
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

// A hoisted binding cannot itself be exported; the mock factories below close
// over `hoisted`, and tests reach the same object through `h`.
export const h = hoisted;

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
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: hoisted.push }) }));
vi.mock('@/components/visual/depth', () => ({ ELEVATION: { modal: 'none', medium: 'none' } }));
vi.mock('@/components/visual/GoatMascot', () => ({
  GoatMascot: () => React.createElement('span', { 'data-testid': 'goat-mascot' }),
}));
vi.mock('@/hooks/use-search', () => ({
  useQuickSearch: () => hoisted.quick,
  useSearchHistory: () => ({ history: hoisted.history, addToHistory: hoisted.addToHistory }),
}));
vi.mock('@/hooks/use-temp-user', () => ({ useTempUser: () => ({ tempUserId: 'temp-user-1', isLoaded: true }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: hoisted.toast }));
vi.mock('@/hooks/use-top-lists', () => ({
  useTopLists: () => hoisted.topLists,
  useUserLists: () => hoisted.userLists,
}));
vi.mock('@/lib/animations/motion-presets', () => ({ DURATION: { quick: 0, slow: 0 } }));
vi.mock('@/lib/errors/error-analytics', () => ({ trackError: hoisted.trackError }));
vi.mock('@/services/list-creation-service', () => ({ listCreationService: { createList: hoisted.createList } }));
vi.mock('@/stores/use-list-store', () => ({ useListStore: () => ({ setCurrentList: hoisted.setCurrentList }) }));

import { CommandPalette } from './CommandPalette';

import type { TopList } from '@/types/top-lists';

// ---------------------------------------------------------------------------
// Mount / query / interact
// ---------------------------------------------------------------------------
let container: HTMLDivElement;
let root: Root | null = null;

export function getContainer(): HTMLDivElement {
  return container;
}

export function mount(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn();
  act(() => {
    root = createRoot(container);
    root.render(<CommandPalette isOpen={props.isOpen ?? true} onClose={onClose} />);
  });
  return { onClose };
}

export function unmount() {
  act(() => {
    root?.unmount();
  });
  root = null;
}

export const byTestId = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
export const input = () => byTestId('command-palette-input') as HTMLInputElement;

export function type(value: string) {
  act(() => {
    const el = input();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export function press(key: string, target: Element = input()) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

export function click(el: Element | null) {
  if (!el) throw new Error('click target missing');
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

export function makeList(id: string, title: string, category = 'Sports', subcategory?: string): TopList {
  return { id, title, category, subcategory, size: 10 } as unknown as TopList;
}

/** Call from `beforeEach`: fresh DOM container, neutral hook state, cleared spies. */
export function resetHarness() {
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
}

/** Call from `afterEach`. */
export function teardownHarness() {
  unmount();
  container.remove();
}
