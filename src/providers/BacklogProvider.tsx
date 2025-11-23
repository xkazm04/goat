"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useBacklogStore } from '@/stores/backlog-store';
import { createBacklogCoalescer } from '@/lib/utils/request-coalescer';

// Create a singleton coalescer instance for this provider
let coalescerInstance: ReturnType<typeof createBacklogCoalescer> | null = null;

const getCoalescer = () => {
  if (!coalescerInstance) {
    coalescerInstance = createBacklogCoalescer();
  }
  return coalescerInstance;
};

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
  const lastSyncRef = useRef<number>(0);
  const statsLogIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // NEW: Periodic data persistence
  const persistData = useCallback(() => {
    const state = useBacklogStore.getState();
    const now = Date.now();
    
    // Only persist if we have data and it's been a while since last sync
    if (state.groups.length > 0 && now - lastSyncRef.current > 30000) { // 30 seconds
      console.log(`💾 BacklogProvider: Persisting ${state.groups.length} groups to cache`);
      
      // The store's persist middleware should handle this automatically,
      // but we can trigger a manual sync if needed
      if (state.syncWithBackend) {
        state.syncWithBackend().catch(console.error);
      }
      
      lastSyncRef.current = now;
    }
  }, []);

  // NEW: Restore data on mount
  const restorePersistedData = useCallback(() => {
    const state = useBacklogStore.getState();
    
    if (state.cache && Object.keys(state.cache).length > 0) {
      console.log(`🔄 BacklogProvider: Found cached data for ${Object.keys(state.cache).length} categories`);
      
      // The data should already be loaded by the persist middleware,
      // but we can validate it here
      const cacheKeys = Object.keys(state.cache);
      const totalCachedGroups = cacheKeys.reduce((sum, key) => {
        return sum + (state.cache[key]?.groups?.length || 0);
      }, 0);
      
      console.log(`📊 BacklogProvider: Total cached groups: ${totalCachedGroups}`);
    }
  }, []);

  // Check network status once on mount and restore data
  useEffect(() => {
    updateNetworkStatus();
    restorePersistedData();

    // Initialize coalescer and expose it to the store
    const coalescer = getCoalescer();

    // Store coalescer reference in window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__backlogCoalescer = coalescer;
    }

    // Set up network status listeners
    const handleOnline = () => {
      console.log('🌐 App is online - syncing data');
      const { setOfflineMode, syncWithBackend } = useBacklogStore.getState();
      setOfflineMode(false);

      // Clear cache when coming back online to force fresh data
      coalescer.invalidateCache();

      // Sync with backend when coming online
      if (syncWithBackend) {
        syncWithBackend().catch(console.error);
      }
    };

    const handleOffline = () => {
      console.log('🌐 App is offline - using cached data');
      const { setOfflineMode } = useBacklogStore.getState();
      setOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic persistence
    const persistInterval = setInterval(persistData, 60000); // Every minute

    // Set up periodic stats logging (every 30 seconds)
    statsLogIntervalRef.current = setInterval(() => {
      const stats = coalescer.getStats();
      const efficiency = coalescer.getEfficiency();

      if (stats.totalRequests > 0) {
        console.log(`📊 BacklogCoalescer Stats:`, {
          totalRequests: stats.totalRequests,
          coalescedRequests: stats.coalescedRequests,
          cacheHits: stats.cacheHits,
          activeBatches: stats.activeBatches,
          coalescingRate: `${efficiency.coalescingRate.toFixed(1)}%`,
          cacheHitRate: `${efficiency.cacheHitRate.toFixed(1)}%`,
          networkSavings: efficiency.networkSavings,
        });
      }
    }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(persistInterval);
      if (statsLogIntervalRef.current) {
        clearInterval(statsLogIntervalRef.current);
      }
    };
  }, [updateNetworkStatus, persistData, restorePersistedData]);

  // NEW: Handle visibility change (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched away - persist data
        persistData();
      } else if (document.visibilityState === 'visible') {
        // User came back - check if we need to refresh
        const state = useBacklogStore.getState();
        const now = Date.now();
        
        // If it's been more than 5 minutes, consider refreshing
        if (now - state.lastSyncTimestamp > 5 * 60 * 1000) {
          console.log('🔄 BacklogProvider: User returned after 5+ minutes, consider refreshing data');
          // You could trigger a refresh here if needed
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [persistData]);

  // NEW: Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Ensure data is persisted before page unload
      persistData();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persistData]);

  return <>{children}</>;
}