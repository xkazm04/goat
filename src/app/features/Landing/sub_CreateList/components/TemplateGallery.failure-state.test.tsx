// @vitest-environment jsdom
/**
 * TemplateGallery — a catalogue that could not be fetched is not an empty
 * catalogue.
 *
 * The three remote tabs (Most Popular, Trending, Classics) read their lists as
 * `const { data: popularLists = [] } = useTopLists(...)`. The `= []` default
 * erases the difference the surface most needs: on a failed request
 * `templates.length` is 0, so the gallery fell straight into
 *
 *     "No templates available" / "Check back soon!"
 *
 * — a sentence that asserts a fact about the catalogue ("there are none") when
 * the truth is about the request ("we could not look"), and prescribes a remedy
 * (wait days) that cannot help, while withholding the one that can (retry).
 *
 * This is the failure arm `list-grid.tsx` and `SavedListsSection` already
 * carry in this repo — render order load -> FAILED -> empty -> data, with the
 * failure arm strictly before the empty arm — applied to the gallery.
 *
 * Negative control (recorded 2026-09-05, before the fix): with every remote
 * query erroring, the gallery rendered "No templates available / Check back
 * soon!", offered no retry, and the first three cases below were red.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STARTER_TEMPLATES } from '@/types/templates';

const refetch = vi.fn();

vi.mock('@/hooks/use-top-lists', () => ({
  useTopLists: () => ({
    data: undefined,
    isLoading: false,
    error: new Error('network down'),
    refetch,
  }),
}));

const { TemplateGallery } = await import('./TemplateGallery');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  refetch.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<TemplateGallery onSelectTemplate={() => {}} />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/**
 * The grid sits in an `AnimatePresence mode="wait"`, so the outgoing tab's exit
 * has to finish before the incoming arm mounts. Awaiting a real tick is what
 * makes the assertion about the settled surface rather than about a frame of
 * the transition.
 */
async function openTab(id: string) {
  const tab = container.querySelector<HTMLElement>(`[data-testid="template-tab-${id}"]`)!;
  act(() => {
    tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
}

describe('TemplateGallery — a failed catalogue fetch', () => {
  it('is spelled as a failure, not as an empty catalogue', async () => {
    await openTab('popular');

    expect(container.querySelector('[data-testid="template-gallery-error"]')).not.toBeNull();
    expect(container.textContent).not.toContain('No templates available');
    expect(container.textContent).not.toContain('Check back soon');
  });

  it('says what is known and offers the remedy that can help', async () => {
    await openTab('trending');

    const failure = container.querySelector('[data-testid="template-gallery-error"]')!;
    expect(failure.getAttribute('role')).toBe('alert');
    expect(failure.textContent).toContain("Couldn't load templates");
    expect(
      container.querySelector('[data-testid="template-gallery-retry-btn"]'),
    ).not.toBeNull();
  });

  it('reissues exactly the request that failed', async () => {
    await openTab('classics');
    const retry = container.querySelector<HTMLButtonElement>(
      '[data-testid="template-gallery-retry-btn"]',
    )!;

    act(() => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('leaves the local starter templates untouched — they never asked anything', () => {
    // 'starters' is the default tab and is served from a constant, so a dead
    // network must not turn it into a failure or an empty state.
    expect(container.querySelector('[data-testid="template-gallery-error"]')).toBeNull();
    expect(
      container.querySelectorAll('[data-testid^="template-item-"]').length,
    ).toBe(STARTER_TEMPLATES.length);
  });
});
