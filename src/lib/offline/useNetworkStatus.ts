/**
 * useNetworkStatus - React hook for network status monitoring
 *
 * Provides reactive network status updates for React components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { NetworkState, NetworkStatus } from './types';
import { getNetworkMonitor } from './NetworkMonitor';

export interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
  effectiveType: string | null;
  statusText: string;
  timeSinceChange: number;
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

  const [timeSinceChange, setTimeSinceChange] = useState(0);

  useEffect(() => {
    const monitor = getNetworkMonitor();

    // Subscribe to network changes
    const unsubscribe = monitor.subscribe((state) => {
      setNetworkState(state);
    });

    // Update time since change periodically
    const intervalId = setInterval(() => {
      setTimeSinceChange(monitor.getTimeSinceLastChange());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const probe = useCallback(async (): Promise<boolean> => {
    const monitor = getNetworkMonitor();
    return monitor.probe();
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
    timeSinceChange,
    probe,
  };
}
