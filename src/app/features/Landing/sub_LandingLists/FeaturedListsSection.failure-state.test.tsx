// @vitest-environment jsdom
/**
 * FeaturedListsSection — the landing page's primary discovery region had no
 * failure state at all.
 *
 * It read only `isLoading` from `useFeaturedLists`. When the request failed,
 * `featuredData` stayed undefined, `allLists` collapsed to `[]`, and the grid
 * rendered its empty arm:
 *
 *     "No rankings found" / "Try adjusting your search or filters"
 *
 * — the worst available sentence for the case. It blames the reader's own
 * filters for a server failure, so the remedy it prescribes (clear the search)
 * is one the reader will try, watch fail, and conclude the product is empty.
 * There is no retry anywhere on the surface.
 *
 * Three sibling regions on this same page already spell failure differently
 * from empty: `SavedListsSection` by hand, `UserListsSection` and
 * `CollectionsSection` through `ListGrid` + `asyncStateFromQuery`. This region
 * was the one that did not.
 *
 * Negative control (recorded 2026-09-05, before the fix): with the featured
 * query erroring, the section rendered "No rankings found" and "Try adjusting
 * your search or filters", carried no element with role="alert", and offered no
 * retry — the first three cases below were red.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TopList } from '@/types/top-lists';

const refetch = vi.fn();
const featured: { data: unknown; isLoading: boolean; error: Error | null } = {
  data: undefined,
  isLoading: false,
  error: null,
};

vi.mock('@/hooks/use-top-lists', () => ({
  useFeaturedLists: () => ({ ...featured, refetch }),
}));
vi.mock('@/hooks/use-list-thumbnails', () => ({ useListThumbnails: () => ({}) }));
vi.mock('@/hooks/use-composition', () => ({
  useComposition: () => ({ openWithSourceList: () => {} }),
}));
vi.mock('@/hooks/use-play-list', () => ({ usePlayList: () => ({ handlePlayList: () => {} }) }));
vi.mock('@/hooks/use-temp-user', () => ({
  useTempUser: () => ({ tempUserId: 'u1', isLoaded: true }),
}));

const { FeaturedListsSection } = await import('./FeaturedListsSection');

const oneList = {
  id: 'l1',
  title: 'Best Films',
  category: 'movies',
  size: 10,
  time_period: 'all-time',
  created_at: '2026-01-01T00:00:00Z',
} as unknown as TopList;

let container: HTMLDivElement;
let root: Root;

function render() {
  act(() => {
    root.render(<FeaturedListsSection />);
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom ships no matchMedia and this tree reaches it through the motion
  // preference hooks. The repo has no global test setup file by design
  // (vitest.config.ts: "a file that needs a DOM opts in"), so the stub is local.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  // `whileInView` (SectionHeader) reaches for IntersectionObserver, which jsdom
  // also lacks. A stub that never fires keeps the section mounted and static.
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
  refetch.mockClear();
  featured.data = undefined;
  featured.isLoading = false;
  featured.error = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('FeaturedListsSection — a failed featured-lists fetch', () => {
  it('is not dressed as an empty search result', () => {
    featured.error = new Error('gateway down');
    render();

    expect(container.textContent).not.toContain('No rankings found');
    expect(container.textContent).not.toContain('Try adjusting your search or filters');
  });

  it('says the request failed, at the reader’s altitude', () => {
    featured.error = new Error('gateway down');
    render();

    const failure = container.querySelector('[data-testid="featured-lists-error"]')!;
    expect(failure).not.toBeNull();
    expect(failure.getAttribute('role')).toBe('alert');
    expect(failure.textContent).toContain("Couldn't load rankings");
  });

  it('offers a retry that reissues exactly the request that failed', () => {
    featured.error = new Error('gateway down');
    render();

    const retry = container.querySelector<HTMLButtonElement>(
      '[data-testid="featured-lists-retry-btn"]',
    )!;
    act(() => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the empty state for a genuinely empty answer', () => {
    featured.data = { popular: [], trending: [], latest: [], awards: [] };
    render();

    expect(container.querySelector('[data-testid="featured-lists-error"]')).toBeNull();
    expect(container.textContent).toContain('No rankings found');
  });

  it('never blanks lists it already holds because a refresh failed', () => {
    // Held content outranks a failure — the SETTLED-DATA -> FAILED edge the
    // repo's own async-state model forbids.
    featured.data = { popular: [oneList], trending: [], latest: [], awards: [] };
    featured.error = new Error('refresh failed');
    render();

    expect(container.querySelector('[data-testid="featured-list-item-0"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="featured-lists-error"]')).toBeNull();
  });
});
