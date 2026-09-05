// @vitest-environment jsdom
/**
 * ContinueRankingBar — the resume path told the user their list was deleted
 * when all that had happened was a failed lookup.
 *
 * The bar resolves each in-progress session's title through `useFeaturedLists`,
 * a request for the top 80 popular / trending / latest / award lists. When the
 * session's list is not in that map, the click handler said:
 *
 *     "List Unavailable — This list may have been deleted."
 *
 * Two ordinary situations reach that branch with nothing deleted: the featured
 * request FAILED (map empty, so EVERY in-progress list is reported deleted at
 * once), and the list is simply outside the featured window (a private or
 * older list the reader is ranking). Naming a cause that is not this one is the
 * copy defect that costs most, because the reader believes it and stops.
 *
 * Negative control (recorded 2026-09-05, before the fix): with the featured
 * query erroring and one in-progress session, the toast read "This list may
 * have been deleted." — the first two cases below were red.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastCalls: { title?: string; description?: string }[] = [];
const pushCalls: string[] = [];
const playCalls: unknown[] = [];
const featured: { data: unknown; isLoading: boolean; error: Error | null } = {
  data: undefined,
  isLoading: false,
  error: null,
};
const listSessions: Record<string, unknown> = {};

vi.mock('@/hooks/use-top-lists', () => ({
  useFeaturedLists: () => ({ ...featured, refetch: () => {} }),
}));
vi.mock('@/hooks/use-list-thumbnails', () => ({ useListThumbnails: () => ({}) }));
vi.mock('@/hooks/use-play-list', () => ({
  usePlayList: () => ({ handlePlayList: (l: unknown) => playCalls.push(l) }),
}));
vi.mock('@/hooks/use-toast', () => ({
  toast: (args: { title?: string; description?: string }) => toastCalls.push(args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (href: string) => pushCalls.push(href) }),
}));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt ?? ''} />,
}));
vi.mock('@/stores/session-store', () => ({
  useSessionStore: (selector: (s: { listSessions: unknown }) => unknown) =>
    selector({ listSessions }),
}));

const { ContinueRankingBar } = await import('./ContinueRankingBar');

let container: HTMLDivElement;
let root: Root;

function halfDoneSession(updatedAt: unknown) {
  return {
    listSize: 4,
    updatedAt,
    gridItems: [{ context: { matched: true } }, { context: { matched: true } }, {}, {}],
  };
}

function render() {
  act(() => {
    root.render(<ContinueRankingBar />);
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has neither of these and the progress indicator reaches the motion
  // preference hooks. The repo keeps no global test setup by design
  // (vitest.config.ts), so each DOM test pins what it needs.
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
  toastCalls.length = 0;
  pushCalls.length = 0;
  playCalls.length = 0;
  featured.data = undefined;
  featured.isLoading = false;
  featured.error = null;
  for (const k of Object.keys(listSessions)) delete listSessions[k];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function clickFirstCard() {
  const card = container.querySelector<HTMLElement>('[data-testid="continue-ranking-bar"] button')!;
  act(() => {
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('ContinueRankingBar — resuming a list the featured lookup did not resolve', () => {
  it('does not claim the list was deleted when the lookup failed', () => {
    listSessions['abcdef12-3456'] = halfDoneSession('2026-09-01T00:00:00.000Z');
    featured.error = new Error('catalogue unreachable');
    render();

    clickFirstCard();

    expect(toastCalls).toHaveLength(1);
    const said = `${toastCalls[0].title} ${toastCalls[0].description}`;
    expect(said).not.toContain('deleted');
    expect(said).toContain("couldn't");
  });

  it('does not claim deletion for a list merely outside the featured window', () => {
    listSessions['abcdef12-3456'] = halfDoneSession('2026-09-01T00:00:00.000Z');
    featured.data = { popular: [], trending: [], latest: [], awards: [] };
    render();

    clickFirstCard();

    expect(toastCalls).toHaveLength(1);
    expect(`${toastCalls[0].title} ${toastCalls[0].description}`).not.toContain('deleted');
  });

  it('still resumes the session either way', () => {
    listSessions['abcdef12-3456'] = halfDoneSession('2026-09-01T00:00:00.000Z');
    featured.error = new Error('catalogue unreachable');
    render();

    clickFirstCard();

    expect(pushCalls).toEqual(['/goat?list=abcdef12-3456']);
  });

  it('says nothing at all when the list did resolve', () => {
    listSessions['known-list'] = halfDoneSession('2026-09-01T00:00:00.000Z');
    featured.data = {
      popular: [{ id: 'known-list', title: 'Best Films', category: 'movies', size: 4 }],
      trending: [],
      latest: [],
      awards: [],
    };
    render();

    clickFirstCard();

    expect(toastCalls).toHaveLength(0);
    expect(playCalls).toHaveLength(1);
  });
});
