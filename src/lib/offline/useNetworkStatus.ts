/**
 * useNetworkStatus - React hook for network status monitoring
 *
 * Provides reactive network status updates for React components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { getNetworkMonitor } from './NetworkMonitor';
import { NetworkState, NetworkStatus } from './types';

export interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
  effectiveType: string | null;
  statusText: string;
  /** Returns time since last network change on demand (no polling). */
  getTimeSinceChange: () => number;
  probe: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkState, setNetworkState] = useState<NetworkState>(() => {
    // Get initial state from monitor if available
    if (typeof window !== 'undefined') {
      return getNetworkMonitor().getState();
    }
    return {
      status: 'online',
      effectiveType: null,
      downlink: null,
      rtt: null,
      lastOnlineAt: null,
      lastOfflineAt: null,
    };
  });

  useEffect(() => {
    const monitor = getNetworkMonitor();

    // Subscribe to network changes
    const unsubscribe = monitor.subscribe((state) => {
      setNetworkState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const probe = useCallback(async (): Promise<boolean> => {
    const monitor = getNetworkMonitor();
    return monitor.probe();
  }, []);

  const getTimeSinceChange = useCallback((): number => {
    const monitor = getNetworkMonitor();
    return monitor.getTimeSinceLastChange();
  }, []);

  const statusText = useCallback((): string => {
    const monitor = getNetworkMonitor();
    return monitor.getStatusText();
  }, [networkState.status, networkState.effectiveType]);

  return {
    status: networkState.status,
    isOnline: networkState.status !== 'offline',
    isOffline: networkState.status === 'offline',
    isSlow: networkState.status === 'slow',
    effectiveType: networkState.effectiveType,
    statusText: statusText(),
    getTimeSinceChange,
    probe,
  };
}
