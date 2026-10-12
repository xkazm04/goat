// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTimeline } from './ActivityTimeline';

import type { ActivityTimelineData } from '@/types/item-details';

/**
 * `/api/items/[id]/activity` casts `action` from the database row into the
 * five-value union without validating it, so an action outside that vocabulary
 * can reach the timeline. Until 2026-09-05 `ACTION_CONFIG[event.action]` was
 * indexed unguarded and `config.icon` threw on the miss — and because
 * ItemInspectorProvider renders outside CollectionErrorBoundary, one unknown
 * row took the whole inspector down.
 *
 * Negative control (recorded 2026-09-05, before the fix): the `promote` row
 * below threw `Cannot read properties of undefined (reading 'icon')` during
 * render and React unmounted the tree — the first test was red.
 */

const payload = (events: ActivityTimelineData['events']): ActivityTimelineData => ({
  events,
  trajectory: [],
  totalEvents: events.length,
});

const event = (id: string, action: string) => ({
  id,
  action: action as ActivityTimelineData['events'][number]['action'],
  position_before: null,
  position_after: 2,
  list_title: 'Best Games',
  list_id: 'l1',
  metadata: null,
  created_at: new Date().toISOString(),
});

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

describe('ActivityTimeline', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => r.unmount());
      root = null;
    }
    container.remove();
    vi.unstubAllGlobals();
  });

  async function mount(data: ActivityTimelineData) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(data), { status: 200 })));
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<ActivityTimeline itemId="item-1" />);
    });
    // let the fetch promise chain settle
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('renders an action outside the known vocabulary as a neutral event instead of crashing', async () => {
    await mount(payload([event('e1', 'promote'), event('e2', 'assign')]));
    expect(container.textContent).toContain('Activity');
    expect(container.textContent).toContain('Added to grid');
    expect(container.textContent).toContain('Best Games');
  });

  it('keeps the known labels for known actions', async () => {
    await mount(payload([event('e1', 'remove'), event('e2', 'swap')]));
    expect(container.textContent).toContain('Removed');
    expect(container.textContent).toContain('Swapped');
  });
});
