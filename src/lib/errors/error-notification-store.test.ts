import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getErrorAnalytics, getErrorMetrics } from './error-analytics';
import { useErrorNotificationStore } from './error-notification-store';
import { NotFoundError, ServerError } from './GoatError';

/**
 * The user's door and the operator's door are different doors, and a failure
 * owes both (registry: software-engineering/error-handling § "the error door").
 *
 * Before this file, `emitError` fed only the notification list and this store's
 * private `errorHistory`; `error-analytics` — the thing `getErrorMetrics()` and
 * the `useErrorMetrics` hook read — was fed by ErrorBoundary alone. Every
 * non-render failure in the app was therefore invisible to the metric that
 * exists to count failures.
 */

const store = () => useErrorNotificationStore.getState();

beforeEach(() => {
  getErrorAnalytics().clear();
  store().clearAll();
  store().clearErrorHistory();
});

afterEach(() => {
  store().clearAll();
});

describe('emitError reaches the analytics door, not only the toast list', () => {
  it('records one analytics event per emitted error', () => {
    expect(getErrorMetrics().total).toBe(0);

    store().emitError(new ServerError('SERVER_DATABASE_ERROR'), { source: 'criteria-score-save' });

    const metrics = getErrorMetrics();
    expect(metrics.total).toBe(1);
    expect(metrics.byCode.SERVER_DATABASE_ERROR).toBe(1);
    expect(metrics.byCategory.server).toBe(1);
  });

  it('counts a burst that the toast list deliberately deduplicates', () => {
    // Three identical failures inside the 2s dedup window: the user sees one
    // toast (a rendering decision), the operator must still see three events.
    store().emitError(new ServerError('SERVER_DATABASE_ERROR'), { source: 'burst' });
    store().emitError(new ServerError('SERVER_DATABASE_ERROR'), { source: 'burst' });
    store().emitError(new ServerError('SERVER_DATABASE_ERROR'), { source: 'burst' });

    expect(store().notifications).toHaveLength(1);
    expect(getErrorMetrics().byCode.SERVER_DATABASE_ERROR).toBe(3);
  });

  it('carries the emitting surface through as the event source', () => {
    store().emitError(new NotFoundError('list', 'abc'), { source: 'collection-panel' });

    const [event] = getErrorAnalytics().getRecentEvents(1);
    expect(event.source).toBe('collection-panel');
    expect(event.code).toBe('NOT_FOUND_LIST');
    expect(event.category).toBe('not_found');
  });
});
