/**
 * NetworkMonitor - Connection state tracking
 *
 * Monitors network connectivity status with support for the Network Information API,
 * providing real-time updates and intelligent online/offline detection.
 */

import { NetworkState, NetworkStatus } from './types';

// Declare the Network Information API types
interface NetworkInformation extends EventTarget {
  readonly effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export type NetworkStateListener = (state: NetworkState) => void;

// Threshold for "slow" network detection (RTT > 500ms or downlink < 0.5 Mbps)
const SLOW_NETWORK_RTT_THRESHOLD = 500;
const SLOW_NETWORK_DOWNLINK_THRESHOLD = 0.5;

// Debounce interval for network state changes
const DEBOUNCE_INTERVAL = 1000;

export class NetworkMonitor {
  private listeners: Set<NetworkStateListener> = new Set();
  private state: NetworkState;
  private connection: NetworkInformation | null = null;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor() {
    this.state = this.getInitialState();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private getInitialState(): NetworkState {
    if (typeof window === 'undefined') {
      return {
        status: 'online',
        effectiveType: null,
        downlink: null,
        rtt: null,
        lastOnlineAt: null,
        lastOfflineAt: null,
      };
    }

    const isOnline = navigator.onLine;
    const now = Date.now();

    return {
      status: isOnline ? 'online' : 'offline',
      effectiveType: null,
      downlink: null,
      rtt: null,
      lastOnlineAt: isOnline ? now : null,
      lastOfflineAt: isOnline ? null : now,
    };
  }

  initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Set up basic online/offline listeners
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Set up Network Information API if available
    this.connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection ||
      null;

    if (this.connection) {
      this.connection.addEventListener('change', this.handleConnectionChange);
      this.updateConnectionInfo();
    }

    // Update initial state
    this.updateState();

    this.isInitialized = true;
    console.log('[NetworkMonitor] Initialized', this.state);
  }

  destroy(): void {
    if (!this.isInitialized) return;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if (this.connection) {
      this.connection.removeEventListener('change', this.handleConnectionChange);
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.listeners.clear();
    this.isInitialized = false;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleOnline = (): void => {
    this.debouncedUpdate(() => {
      this.state = {
        ...this.state,
        status: this.determineStatus(),
        lastOnlineAt: Date.now(),
      };
      this.updateConnectionInfo();
      this.notifyListeners();
      console.log('[NetworkMonitor] Online', this.state);
    });
  };

  private handleOffline = (): void => {
    // Offline events should be immediate (no debounce)
    this.state = {
      ...this.state,
      status: 'offline',
      lastOfflineAt: Date.now(),
    };
    this.notifyListeners();
    console.log('[NetworkMonitor] Offline', this.state);
  };

  private handleConnectionChange = (): void => {
    this.debouncedUpdate(() => {
      this.updateConnectionInfo();
      this.state = {
        ...this.state,
        status: this.determineStatus(),
      };
      this.notifyListeners();
      console.log('[NetworkMonitor] Connection changed', this.state);
    });
  };

  private debouncedUpdate(callback: () => void): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.debounceTimeout = null;
      callback();
    }, DEBOUNCE_INTERVAL);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  private updateState(): void {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    this.state = {
      ...this.state,
      status: isOnline ? this.determineStatus() : 'offline',
      lastOnlineAt: isOnline ? Date.now() : this.state.lastOnlineAt,
      lastOfflineAt: !isOnline ? Date.now() : this.state.lastOfflineAt,
    };

    this.updateConnectionInfo();
  }

  private updateConnectionInfo(): void {
    if (!this.connection) return;

    this.state = {
      ...this.state,
      effectiveType: this.connection.effectiveType || null,
      downlink: this.connection.downlink ?? null,
      rtt: this.connection.rtt ?? null,
    };
  }

  private determineStatus(): NetworkStatus {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }

    // Check for slow network
    if (this.connection) {
      const rtt = this.connection.rtt;
      const downlink = this.connection.downlink;

      if (
        (rtt && rtt > SLOW_NETWORK_RTT_THRESHOLD) ||
        (downlink && downlink < SLOW_NETWORK_DOWNLINK_THRESHOLD)
      ) {
        return 'slow';
      }
    }

    return 'online';
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getState(): NetworkState {
    return { ...this.state };
  }

  isOnline(): boolean {
    return this.state.status !== 'offline';
  }

  isOffline(): boolean {
    return this.state.status === 'offline';
  }

  isSlow(): boolean {
    return this.state.status === 'slow';
  }

  subscribe(listener: NetworkStateListener): () => void {
    this.listeners.add(listener);

    // Initialize if not already done
    if (!this.isInitialized) {
      this.initialize();
    }

    // Immediately notify with current state
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);

      // Clean up if no listeners left
      if (this.listeners.size === 0) {
        this.destroy();
      }
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[NetworkMonitor] Listener error:', error);
      }
    });
  }

  // ============================================================================
  // Probing
  // ============================================================================

  /**
   * Actively probe network connectivity by making a small request.
   * Useful when you need to verify connectivity beyond just navigator.onLine.
   */
  async probe(timeout: number = 5000): Promise<boolean> {
    if (typeof fetch === 'undefined') {
      return this.isOnline();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Try to fetch a small resource
      // Using a data URI as fallback if no network probe endpoint
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response?.ok) {
        // Update state if we were marked offline but probe succeeded
        if (this.state.status === 'offline') {
          this.state = {
            ...this.state,
            status: 'online',
            lastOnlineAt: Date.now(),
          };
          this.notifyListeners();
        }
        return true;
      }

      return false;
    } catch (error) {
      // If probe fails and we were online, we might actually be offline
      if (this.state.status !== 'offline') {
        // Don't immediately mark as offline - navigator.onLine is the authority
        // Just return false to indicate probe failed
      }
      return false;
    }
  }

  /**
   * Get time since last connectivity change
   */
  getTimeSinceLastChange(): number {
    const lastChange = Math.max(
      this.state.lastOnlineAt ?? 0,
      this.state.lastOfflineAt ?? 0
    );
    return lastChange ? Date.now() - lastChange : 0;
  }

  /**
   * Get a human-readable status string
   */
  getStatusText(): string {
    switch (this.state.status) {
      case 'online':
        if (this.state.effectiveType === '4g') {
          return 'Fast connection';
        }
        if (this.state.effectiveType === '3g') {
          return 'Good connection';
        }
        return 'Online';
      case 'slow':
        return 'Slow connection';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  }
}

// Singleton instance
let networkMonitorInstance: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
}

export function resetNetworkMonitor(): void {
  if (networkMonitorInstance) {
    networkMonitorInstance.destroy();
    networkMonitorInstance = null;
  }
}
