/**
 * useServiceWorker - React hook for Service Worker registration
 *
 * Handles service worker registration, updates, and messaging.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export interface UseServiceWorkerReturn extends ServiceWorkerState {
  update: () => Promise<void>;
  skipWaiting: () => void;
  clearCache: () => void;
  getCacheSize: () => Promise<number | null>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Service worker registered:', registration.scope);

        // Update state with registration info
        updateRegistrationState(registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            setState((prev) => ({ ...prev, isInstalling: true }));

            newWorker.addEventListener('statechange', () => {
              updateRegistrationState(registration);
            });
          }
        });

        // Check for updates periodically (every 60 seconds)
        const updateInterval = setInterval(() => {
          registration.update().catch(console.error);
        }, 60000);

        return () => {
          clearInterval(updateInterval);
        };
      } catch (error) {
        console.error('[SW] Registration failed:', error);
        setState((prev) => ({
          ...prev,
          error: error as Error,
          isRegistered: false,
        }));
      }
    };

    registerServiceWorker();

    // Listen for controller changes (when a new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading...');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, timestamp } = event.data;

      if (type === 'SYNC_REQUESTED') {
        console.log('[SW] Sync requested at:', new Date(timestamp));
        // Trigger sync through the offline module
        window.dispatchEvent(new CustomEvent('sw-sync-request'));
      }
    });
  }, []);

  const updateRegistrationState = (registration: ServiceWorkerRegistration) => {
    setState((prev) => ({
      ...prev,
      registration,
      isRegistered: true,
      isInstalling: !!registration.installing,
      isWaiting: !!registration.waiting,
      isActive: !!registration.active,
    }));
  };

  const update = useCallback(async (): Promise<void> => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      console.log('[SW] Update check completed');
    } catch (error) {
      console.error('[SW] Update failed:', error);
    }
  }, [state.registration]);

  const skipWaiting = useCallback((): void => {
    if (!state.registration?.waiting) return;

    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    console.log('[SW] Skip waiting requested');
  }, [state.registration]);

  const clearCache = useCallback((): void => {
    if (!state.registration?.active) return;

    state.registration.active.postMessage({ type: 'CLEAR_CACHE' });
    console.log('[SW] Cache clear requested');
  }, [state.registration]);

  const getCacheSize = useCallback(async (): Promise<number | null> => {
    if (!state.registration?.active) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data.size);
      };

      state.registration!.active!.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }, [state.registration]);

  return {
    ...state,
    update,
    skipWaiting,
    clearCache,
    getCacheSize,
  };
}

/**
 * ServiceWorkerUpdatePrompt - Component to show when an update is available
 */
export function useServiceWorkerUpdate() {
  const { isWaiting, skipWaiting } = useServiceWorker();

  return {
    hasUpdate: isWaiting,
    applyUpdate: skipWaiting,
  };
}
