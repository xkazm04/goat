// @vitest-environment jsdom
/**
 * wiki-image-store — reads must not write.
 *
 * `hasFailed` is called during render by useProgressiveWikiImage
 * (src/hooks/use-progressive-wiki-image.ts). A getter that calls `set()` when
 * it finds an expired failure is a store write inside a React render — the
 * "Cannot update a component while rendering" class — and it fires for every
 * card whose Wikipedia lookup failed more than 24 hours ago.
 *
 * Negative control (recorded 2026-09-05, scan-sweep backlog-content-management):
 * against the pre-fix store "hasFailed does not write" failed with 1 store
 * notification per call on an expired entry (expected 0).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchItemImage = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/wiki-images', () => ({ fetchItemImage }));

import { useWikiImageStore } from './wiki-image-store';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  useWikiImageStore.getState().clearAll();
});

describe('hasFailed', () => {
  it('reports a fresh failure as failed and an expired one as retryable', () => {
    useWikiImageStore.setState({ failures: new Map([['fresh', Date.now()], ['stale', Date.now() - DAY - 1]]) });
    expect(useWikiImageStore.getState().hasFailed('fresh')).toBe(true);
    expect(useWikiImageStore.getState().hasFailed('stale')).toBe(false);
    expect(useWikiImageStore.getState().hasFailed('never')).toBe(false);
  });

  it('does not write to the store, even on an expired entry', () => {
    useWikiImageStore.setState({ failures: new Map([['stale', Date.now() - DAY - 1]]) });
    const notifications = vi.fn();
    const unsubscribe = useWikiImageStore.subscribe(notifications);
    useWikiImageStore.getState().hasFailed('stale');
    useWikiImageStore.getState().hasFailed('stale');
    unsubscribe();
    expect(notifications).toHaveBeenCalledTimes(0);
  });
});

describe('fetchImage after an expired failure', () => {
  it('retries and drops the stale failure entry on success', async () => {
    useWikiImageStore.setState({ failures: new Map([['stale', Date.now() - DAY - 1]]) });
    fetchItemImage.mockResolvedValueOnce('https://img/stale.png');
    const url = await useWikiImageStore.getState().fetchImage('stale');
    expect(url).toBe('https://img/stale.png');
    expect(useWikiImageStore.getState().failures.has('stale')).toBe(false);
    expect(useWikiImageStore.getState().images.get('stale')).toBe('https://img/stale.png');
  });

  it('does not refetch a fresh failure (control)', async () => {
    useWikiImageStore.setState({ failures: new Map([['fresh', Date.now()]]) });
    const url = await useWikiImageStore.getState().fetchImage('fresh');
    expect(url).toBeNull();
    expect(fetchItemImage).not.toHaveBeenCalled();
  });
});
