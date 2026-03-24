/**
 * useNetworkStatus - React hook for network status
 *
 * Simple hook using navigator.onLine and online/offline events.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseNetworkStatusReturn {
  status: 'online' | 'offline';
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
  effectiveType: string | null;
  statusText: string;
  getTimeSinceChange: () => number;
  probe: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastChangeAt] = useState(() => Date.now());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getTimeSinceChange = useCallback(() => Date.now() - lastChangeAt, [lastChangeAt]);

  const probe = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);
      return !!response?.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    status: isOnline ? 'online' : 'offline',
    isOnline,
    isOffline: !isOnline,
    isSlow: false,
    effectiveType: null,
    statusText: isOnline ? 'Online' : 'Offline',
    getTimeSinceChange,
    probe,
  };
}
