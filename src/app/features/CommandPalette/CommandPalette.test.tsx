// @vitest-environment jsdom
/**
 * CommandPalette — surface contract and storage resilience.
 *
 * Before 2026-09-05 this context (7 files, ~1,630 lines) had zero tests, so
 * every keyboard/click/state claim about the palette was a reading, not a
 * measurement. The harness (`CommandPalette.harness.tsx`) mounts the real
 * component with every data hook replaced by a controllable stand-in.
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): with
 * `handleNavigateToList`'s push changed to a bare `/goat`, "clicking a
 * client-side list result navigates to /goat?list=<id>" failed
 * (expected '/goat?list=l1'); the other two stayed green. Restored, 3/3 green.
 * Storage cases: against the pre-fix component (localStorage.setItem called
 * bare inside the click handler, stored JSON sliced without a shape check)
 * both were red — an exception escaped the handler and `{ id: 'x' }` rendered
 * as an empty row. 2/2 after.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  click,
  getContainer,
  h,
  input,
  makeList,
  mount,
  press,
  resetHarness,
  teardownHarness,
  type,
  unmount,
} from './CommandPalette.harness';

beforeEach(resetHarness);
afterEach(teardownHarness);

// The three testids the e2e smoke test reaches for
// (e2e/exploratory-smoke.spec.ts:96-102) plus the mode switch.
describe('CommandPalette surface', () => {
  it('renders nothing when closed and the container + input when open', () => {
    mount({ isOpen: false });
    expect(byTestId('command-palette-container')).toBeNull();
    unmount();

    mount({ isOpen: true });
    expect(byTestId('command-palette-container')).not.toBeNull();
    expect(byTestId('command-palette-backdrop')).not.toBeNull();
    expect(input()).not.toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('Escape with no category filter closes; typing "new …" enters create mode with a parsed title', () => {
    const { onClose } = mount();
    type('new top 10 basketball all-time');
    expect(getContainer().textContent).toContain('Top 10 Sports - Basketball (All-Time)');
    expect(getContainer().textContent).toContain('Creating new list');
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

describe('CommandPalette recent-lists storage', () => {
  it('still navigates when localStorage refuses the recent-list write, and reports the refusal', () => {
    h.topLists = { data: [makeList('l1', 'NBA Legends')], isLoading: false, error: null };
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => { errors.push(e.error); e.preventDefault(); };
    window.addEventListener('error', onError);
    try {
      mount();
      type('nba');
      click(byTestId('command-palette-list-0'));
      expect(errors, 'no exception escaped the click handler').toEqual([]);
      expect(h.push).toHaveBeenCalledWith('/goat?list=l1');
      expect(h.trackError).toHaveBeenCalledTimes(1);
      expect(h.trackError.mock.calls[0][0]).toMatchObject({ code: 'CLIENT_STORAGE_ERROR', source: 'CommandPalette' });
    } finally {
      window.removeEventListener('error', onError);
      setItem.mockRestore();
    }
  });

  it('a stored recent-lists value of the wrong shape is ignored, not rendered', () => {
    localStorage.setItem('command-palette-recent-lists', JSON.stringify([{ id: 'x' }, { id: 'ok', title: 'Kept', category: 'Music' }, 42]));
    mount();
    expect(byTestId('command-palette-recent-list-0')?.textContent).toContain('Kept');
    expect(byTestId('command-palette-recent-list-1')).toBeNull();
  });
});
