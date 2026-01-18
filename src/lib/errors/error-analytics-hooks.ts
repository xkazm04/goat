'use client';

/**
 * React Hooks for Error Analytics
 *
 * Client-side hooks for accessing error metrics and events.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ErrorMetrics, ErrorEvent } from './error-analytics';
import { getErrorAnalytics, subscribeToErrors } from './error-analytics';

/**
 * Hook to access error metrics with auto-refresh
 */
export function useErrorMetrics(refreshInterval = 5000): {
  metrics: ErrorMetrics;
  refresh: () => void;
} {
  const [metrics, setMetrics] = useState<ErrorMetrics>(() =>
    getErrorAnalytics().getMetrics()
  );

  const refresh = useCallback(() => {
    setMetrics(getErrorAnalytics().getMetrics());
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  // Subscribe to new events
  useEffect(() => {
    const unsubscribe = subscribeToErrors(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return { metrics, refresh };
}

/**
 * Hook to get recent error events
 */
export function useRecentErrors(limit = 20): ErrorEvent[] {
  const [events, setEvents] = useState<ErrorEvent[]>(() =>
    getErrorAnalytics().getRecentEvents(limit)
  );

  useEffect(() => {
    const unsubscribe = subscribeToErrors(() => {
      setEvents(getErrorAnalytics().getRecentEvents(limit));
    });
    return unsubscribe;
  }, [limit]);

  return events;
}
