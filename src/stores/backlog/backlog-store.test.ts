/**
 * backlog-store — the loading state machine, the offline queue and the
 * persisted shape.
 *
 * Every case here is a behaviour the store can reach in production and that
 * no other instrument in the repo can see: the store has 17 files and, before
 * this round, zero tests.
 *
 * Negative controls (recorded 2026-09-05, scan-sweep backlog-content-management),
 * each run against the pre-fix store and each red for the stated reason:
 *   - "an empty category settles": loadingProgress.isLoading stayed true and
 *     enrichmentSources.active stayed true after initializeGroups returned 0
 *     groups, because startFastProgressiveLoading — the only place that clears
 *     them — is skipped when there is nothing to load.
 *   - "isSyncing is not persisted / is cleared on rehydrate": partialize wrote
 *     syncDiagnostics.isSyncing = true verbatim and onRehydrateStorage did not
 *     touch it, so a tab closed mid-sync came back with processPendingChanges
 *     returning early ("Sync already in progress") on every call, forever.
 *   - "a full offline queue refuses the local write too": addItemToGroup pushed
 *     the item into the group, THEN discovered the queue was full and returned —
 *     the local tree and the queue disagreed by one item with no record of it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

const api = vi.hoisted(() => ({
  getByCategory: vi.fn(),
  getBulkItems: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  goatApi: { groups: { getByCategory: api.getByCategory, getBulkItems: api.getBulkItems, get: api.get } },
}));

const persistence = vi.hoisted(() => ({
  enqueue: vi.fn(async () => undefined),
  processQueue: vi.fn(async () => undefined),
}));
vi.mock('@/lib/offline/OfflinePersistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/offline/OfflinePersistence')>()),
  getOfflinePersistence: () => persistence,
}));


import { useBacklogStore } from './store';


function group(id: string, items: BacklogItem[] = []): BacklogGroup {
  return {
    id,
    name: id,
    category: 'movies',
    subcategory: undefined,
    item_count: items.length,
    items,
  } as unknown as BacklogGroup;
}
function item(id: string): BacklogItem {
  return { id, name: id, title: id, tags: [] } as unknown as BacklogItem;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  useBacklogStore.getState().clearAllData();
  useBacklogStore.setState({
    isOfflineMode: false,
    pendingChanges: [],
    loadingErrors: [],
    enrichmentSources: { active: false, sources: [] },
    syncDiagnostics: { totalQueued: 0, failedChanges: [], lastSuccessfulSync: 0, isSyncing: false, dataLossRisk: 'none' },
  });
});

describe('initializeGroups — loading state machine', () => {
  it('an empty category settles: no spinner, no active enrichment badges', async () => {
    api.getByCategory.mockResolvedValueOnce([]);
    await useBacklogStore.getState().initializeGroups('movies');
    await flush();
    const s = useBacklogStore.getState();
    expect(s.groups).toEqual([]);
    expect(s.isLoading).toBe(false);
    expect(s.loadingProgress.isLoading).toBe(false);
    expect(s.loadingProgress.percentage).toBe(100);
    expect(s.enrichmentSources.active).toBe(false);
    expect(s.enrichmentSources.sources.every((src) => src.status === 'done')).toBe(true);
  });

  it('a non-empty category still hands off to the bulk loader (control)', async () => {
    api.getByCategory.mockResolvedValueOnce([group('g1')]);
    api.getBulkItems.mockResolvedValueOnce({ g1: [item('i1')] });
    await useBacklogStore.getState().initializeGroups('movies');
    await flush();
    const s = useBacklogStore.getState();
    expect(s.groups[0].items).toHaveLength(1);
    expect(s.loadingProgress.isLoading).toBe(false);
    expect(s.enrichmentSources.active).toBe(false);
  });
});

