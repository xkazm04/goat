// @vitest-environment jsdom
/**
 * error-notification-store — selector stability.
 *
 * Same rule, same failure, same remedy as `src/stores/collection-store.test.tsx`:
 * zustand 5 reads selectors through `useSyncExternalStore` and re-renders
 * whenever the snapshot is not `Object.is`-equal to the previous one, so a
 * selector that builds a fresh object on every call never settles and climbs to
 * "Maximum update depth exceeded". collection-store was fixed for this on
 * 2026-09-05; this store was not, and the defect went unseen only because its
 * one consumer — `ErrorNotificationToastContainer` — is mounted nowhere in the
 * app, so the loop would arrive with the first mount rather than before it.
 *
 * Negative control (recorded 2026-09-05, before the fix): with the three
 * selectors as bare object literals, both "renders once" cases below threw
 * "Maximum update depth exceeded" from React.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  useErrorHistory,
  useErrorNotifications,
  useErrorNotificationStore,
} from './error-notification-store';
import { ServerError } from './GoatError';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  useErrorNotificationStore.getState().clearAll();
  useErrorNotificationStore.getState().clearErrorHistory();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useErrorNotificationStore.getState().clearAll();
});

// Same shape as src/stores/collection-store.test.tsx's mountCounting.
function mountCounting(Hook: () => unknown): { renders: () => number } {
  let renders = 0;
  function Probe() {
    renders += 1;
    Hook();
    return null;
  }
  act(() => root.render(<Probe />));
  return { renders: () => renders };
}

describe('error-notification-store selectors settle under useSyncExternalStore', () => {
  it('useErrorNotifications renders once and once more per real change', () => {
    const { renders } = mountCounting(() => useErrorNotifications());
    expect(renders()).toBe(1);

    act(() => {
      useErrorNotificationStore.getState().emitError(new ServerError('SERVER_DATABASE_ERROR'));
    });

    expect(renders()).toBe(2);
  });

  it('useErrorHistory renders once', () => {
    const { renders } = mountCounting(() => useErrorHistory());
    expect(renders()).toBe(1);
  });
});
