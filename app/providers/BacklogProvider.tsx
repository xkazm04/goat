"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useBacklogStore } from '@/app/stores/backlog-store';

// Helper to check network status
const checkNetworkStatus = () => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Assume online if we can't detect
};

export function BacklogProvider({ children }: { children: React.ReactNode }) {
  // Use ref to track if we've checked network status already
  const hasCheckedNetwork = useRef(false);

  // Network status detection
  const updateNetworkStatus = useCallback(() => {
    if (hasCheckedNetwork.current) return true;
    
    const isOnline = checkNetworkStatus();
    const { setOfflineMode } = useBacklogStore.getState();
    setOfflineMode(!isOnline);
    console.log(`🌐 Network status: ${isOnline ? 'Online' : 'Offline'}`);
    
    hasCheckedNetwork.current = true;
    return isOnline;
  }, []);

  // Check network status once on mount
  useEffect(() => {
    updateNetworkStatus();
    
    // Set up network status listeners
    const handleOnline = () => {
      console.log('🌐 App is online');
      const { setOfflineMode } = useBacklogStore.getState();
      setOfflineMode(false);
    };
    
    const handleOffline = () => {
      console.log('🌐 App is offline');
      const { setOfflineMode } = useBacklogStore.getState();
      setOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateNetworkStatus]);

  return <>{children}</>;
}