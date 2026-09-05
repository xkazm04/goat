// @vitest-environment jsdom
/**
 * SearchFilterBar — the filter chips are a disclosure, and they said so to
 * nobody and closed for nobody.
 *
 * Each chip toggles a dropdown of options. The button carried no
 * `aria-expanded` and no `aria-haspopup`, so a screen reader announced a plain
 * button and never that a list had opened beneath it or that it was now open.
 * Dismissal was wired to `mousedown` outside the chip ONLY (the effect at
 * FilterChip's top): there was no Escape handler, so a keyboard user who opened
 * a chip could not close it without choosing an option or reaching for a mouse
 * — the one-way door that makes a filter feel broken rather than merely
 * unlabelled.
 *
 * Negative control (recorded 2026-09-05, before the fix): both chips reported
 * aria-expanded === null in both states, neither carried aria-haspopup, and
 * Escape left the dropdown mounted — 4 of 5 cases red.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SearchFilterBar } from './SearchFilterBar';

import type { TopList } from '@/types/top-lists';

const lists = [
  { id: 'l1', title: 'Best Films', category: 'movies', size: 10, time_period: 'all-time' },
  { id: 'l2', title: 'Top Albums', category: 'music', size: 20, time_period: 'year' },
] as unknown as TopList[];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <SearchFilterBar lists={lists} onFilteredResults={() => {}} onSearchActive={() => {}} />,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function chip(testId: string) {
  return container.querySelector<HTMLButtonElement>(`[data-testid="${testId}-btn"]`)!;
}
function dropdown(testId: string) {
  return container.querySelector(`[data-testid="${testId}-dropdown"]`);
}
function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/**
 * The dropdown lives in an AnimatePresence, so its unmount trails the state
 * change by an exit animation. Awaiting a real tick makes every "is it gone"
 * assertion a statement about the settled surface.
 */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
}

describe('SearchFilterBar filter chips', () => {
  it('announces itself as a disclosure', () => {
    for (const id of ['filter-time-period', 'filter-list-size']) {
      expect(chip(id).getAttribute('aria-haspopup')).toBe('listbox');
      expect(chip(id).getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('reports the open state after the chip is pressed', () => {
    click(chip('filter-time-period'));

    expect(chip('filter-time-period').getAttribute('aria-expanded')).toBe('true');
    expect(dropdown('filter-time-period')).not.toBeNull();
  });

  it('closes on Escape', async () => {
    click(chip('filter-time-period'));
    expect(dropdown('filter-time-period')).not.toBeNull();

    act(() => {
      chip('filter-time-period').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    await flush();

    expect(dropdown('filter-time-period')).toBeNull();
    expect(chip('filter-time-period').getAttribute('aria-expanded')).toBe('false');
  });

  it('returns focus to the chip it closed', async () => {
    chip('filter-list-size').focus();
    click(chip('filter-list-size'));

    act(() => {
      container
        .querySelector('[data-testid="filter-list-size-dropdown"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await flush();

    expect(dropdown('filter-list-size')).toBeNull();
    expect(document.activeElement).toBe(chip('filter-list-size'));
  });

  it('still applies an option when one is chosen', async () => {
    click(chip('filter-list-size'));
    click(
      container.querySelector<HTMLButtonElement>('[data-testid="filter-list-size-option-10"]')!,
    );

    await flush();

    expect(dropdown('filter-list-size')).toBeNull();
    expect(chip('filter-list-size').textContent).toContain('Top 10');
  });
});
