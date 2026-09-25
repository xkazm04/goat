// @vitest-environment jsdom
/**
 * Hover preview warmth borrowed from a sibling list entry.
 *
 * The preview reads one list's DETAIL (items included). The card the user is
 * hovering was rendered from a SUMMARY of the same list, held under a user-lists
 * key. These tests pin what may be painted from that summary before the detail
 * arrives, and what may not:
 *
 *   warm      the summary's own fields (title, category, size) paint at once
 *   honest    fields the summary does not carry (item count, average ranking)
 *             stay UNKNOWN until the detail lands - never 0, never 0% complete
 *   cold      nothing borrowed on a deep link or an empty cache; loading as before
 *   converge  the detail replaces the borrowed summary when it lands
 *   shape     other entries under the same key family (another list's detail,
 *             the featured bundle) are never mistaken for this list's summary
 *   address   the summary is found by the list's id wherever the family holds it,
 *             not by the coordinates of one particular listing - the same list
 *             is cached under more than one listing key in this app
 *
 * NEGATIVE CONTROLS (2026-09-25, measured, restored after):
 *   - painting the borrowed summary even after the detail lands
 *     (`known = findListSummary(...) ?? data`) reds T5;
 *   - taking the first row of any listing instead of matching the id reds T6.
 * Against the unmodified hook T1, T4 and T2 are red (no warmth at all); against
 * the literal borrow (placeholderData read by the landing listing's own key and
 * cast to the detail type) T4 and T2 are red: a silent miss, and "0 items".
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { topListsKeys } from '@/lib/query-keys/top-lists';

import { useListPreview } from './use-list-preview';

import type { ListWithItems, TopList } from '@/types/top-lists';


const get = vi.fn();
// Hoisted above the imports by vitest.
vi.mock('@/lib/api', () => ({ goatApi: { lists: { get: (...a: unknown[]) => get(...a) } } }));

const SUMMARY: TopList = {
  id: 'L1',
  title: 'Best sci-fi films',
  category: 'movies',
  subcategory: 'sci-fi',
  size: 10,
  time_period: 'all-time',
  created_at: '2026-09-01T00:00:00Z',
};

const DETAIL: ListWithItems = {
  ...SUMMARY,
  items: [
    { id: 'i1', title: 'A', position: 1, created_at: '2026-09-01T00:00:00Z' },
    { id: 'i2', title: 'B', position: 2, created_at: '2026-09-01T00:00:00Z' },
    { id: 'i3', title: 'C', position: 3, created_at: '2026-09-01T00:00:00Z' },
  ],
};

let client: QueryClient;
let resolveDetail: (v: ListWithItems) => void;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  get.mockReset();
  get.mockImplementation(
    () => new Promise<ListWithItems>((r) => { resolveDetail = r; }),
  );
});
afterEach(() => client.clear());

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Minimal hook harness: the repo carries the DOM testing library but not its
// React binding, and a test does not earn a new dependency.
function renderHook<T>(hook: () => T) {
  const result = { current: undefined as unknown as T };
  function Probe() {
    result.current = hook();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>));
  return { result, unmount: () => act(() => root.unmount()) };
}

async function waitFor(check: () => void, timeoutMs = 2000) {
  const start = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (e) {
      if (Date.now() - start > timeoutMs) throw e;
      await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    }
  }
}

// The landing section's own listing key. Passed as a plain variable so an arm
// that does not take it compiles unchanged.
const LANDING_KEY = topListsKeys.userLists('u1', { limit: 10 });
const PALETTE_KEY = topListsKeys.userLists('u1', { limit: 50 });
const opts = { hoverDelay: 0, sourceKey: LANDING_KEY };

async function hover() {
  const view = renderHook(() => useListPreview('L1', opts));
  act(() => view.result.current.startHover());
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  return view;
}

describe('hover preview: warmth borrowed from a sibling list entry', () => {
  it('T1 warm: paints the summary fields before the detail lands', async () => {
    client.setQueryData(LANDING_KEY, [SUMMARY]);
    const { result } = await hover();
    expect(result.current.previewData?.title).toBe('Best sci-fi films');
    expect(result.current.previewData?.size).toBe(10);
  });

  it('T4 address: finds the summary under another listing key of the same family', async () => {
    client.setQueryData(PALETTE_KEY, [{ ...SUMMARY, title: 'Palette copy' }]);
    const { result } = await hover();
    expect(result.current.previewData?.title).toBe('Palette copy');
  });

  it('T2 honest: fields the summary lacks stay unknown, never zero', async () => {
    client.setQueryData(LANDING_KEY, [SUMMARY]);
    const { result } = await hover();
    expect(result.current.previewData).not.toBeNull();
    expect(result.current.previewData?.itemCount).toBeUndefined();
    expect(result.current.previewData?.averageRanking).toBeUndefined();
  });

  it('T3 cold: nothing borrowed on a deep link, then the detail paints', async () => {
    const { result } = await hover();
    expect(result.current.previewData).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await act(async () => resolveDetail(DETAIL));
    await waitFor(() => expect(result.current.previewData?.itemCount).toBe(3));
    expect(result.current.previewData?.averageRanking).toBe(2);
  });

  it('T5 converge: the detail replaces the borrowed summary', async () => {
    client.setQueryData(LANDING_KEY, [SUMMARY]);
    const { result } = await hover();
    await act(async () => resolveDetail({ ...DETAIL, title: 'Renamed on server' }));
    await waitFor(() => expect(result.current.previewData?.itemCount).toBe(3));
    expect(result.current.previewData?.title).toBe('Renamed on server');
    expect(result.current.previewData?.averageRanking).toBe(2);
  });

  it('T6 shape: other entries in the key family are not taken for this list', async () => {
    client.setQueryData(topListsKeys.list('L2', true), { ...DETAIL, id: 'L2', title: 'Other list' });
    client.setQueryData(topListsKeys.featured(), { popular: [], trending: [], latest: [], awards: [] });
    client.setQueryData(topListsKeys.userLists('u1', { limit: 10 }), [{ ...SUMMARY, id: 'L9', title: 'Not me' }]);
    const { result } = await hover();
    expect(result.current.previewData).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
