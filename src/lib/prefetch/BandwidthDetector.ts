/**
 * BandwidthDetector
 *
 * Detects network conditions and adjusts prefetching behavior accordingly.
 * Uses the Network Information API when available, with fallbacks for browsers
 * that don't support it.
 *
 * Features:
 * - Connection type detection (4g, 3g, 2g, slow-2g)
 * - Effective bandwidth estimation
 * - Data saver mode detection
 * - Online/offline status tracking
 * - Prefetch strategy recommendations
 */

export type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'wifi' | 'ethernet' | 'unknown';

export type PrefetchStrategy = 'aggressive' | 'moderate' | 'conservative' | 'disabled';

export interface NetworkConditions {
  /** Connection type (4g, 3g, 2g, etc.) */
  connectionType: ConnectionType;
  /** Estimated downlink speed in Mbps */
  downlink: number;
  /** Estimated round-trip time in ms */
  rtt: number;
  /** Whether data saver is enabled */
  saveData: boolean;
  /** Whether the device is online */
  online: boolean;
  /** Recommended prefetch strategy based on conditions */
  recommendedStrategy: PrefetchStrategy;
  /** Maximum concurrent prefetch requests recommended */
  maxConcurrentPrefetches: number;
  /** Whether prefetching should be paused */
  shouldPausePrefetch: boolean;
}

interface NetworkInformationAPI {
  readonly downlink: number;
  readonly effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

// Use type assertion to access non-standard Navigator properties
function getNetworkConnection(): NetworkInformationAPI | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: NetworkInformationAPI;
    mozConnection?: NetworkInformationAPI;
    webkitConnection?: NetworkInformationAPI;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

type NetworkChangeCallback = (conditions: NetworkConditions) => void;

/**
 * Strategy thresholds for different network conditions
 */
const STRATEGY_CONFIG = {
  aggressive: {
    minDownlink: 5,    // Mbps
    maxRtt: 100,       // ms
    maxConcurrent: 6,
  },
  moderate: {
    minDownlink: 2,
    maxRtt: 300,
    maxConcurrent: 3,
  },
  conservative: {
    minDownlink: 0.5,
    maxRtt: 600,
    maxConcurrent: 1,
  },
} as const;

class BandwidthDetectorClass {
  private static instance: BandwidthDetectorClass | null = null;
  private connection: NetworkInformationAPI | null = null;
  private listeners: Set<NetworkChangeCallback> = new Set();
  private cachedConditions: NetworkConditions | null = null;
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  private constructor() {
    if (typeof window !== 'undefined') {
      this.connection = getNetworkConnection();
      this.setupEventListeners();
    }
  }

  static getInstance(): BandwidthDetectorClass {
    if (!BandwidthDetectorClass.instance) {
      BandwidthDetectorClass.instance = new BandwidthDetectorClass();
    }
    return BandwidthDetectorClass.instance;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for connection changes
    if (this.connection) {
      this.connection.addEventListener('change', this.handleNetworkChange);
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);
  }

  private handleNetworkChange = (): void => {
    // Invalidate cache
    this.cachedConditions = null;

    // Notify listeners
    const conditions = this.getNetworkConditions();
    this.listeners.forEach((callback) => {
      try {
        callback(conditions);
      } catch (error) {
        console.error('[BandwidthDetector] Listener error:', error);
      }
    });
  };

  /**
   * Get current network conditions
   */
  getNetworkConditions(): NetworkConditions {
    // Return cached value if still valid
    const now = Date.now();
    if (this.cachedConditions && now - this.lastUpdate < this.CACHE_DURATION) {
      return this.cachedConditions;
    }

    const conditions = this.detectConditions();
    this.cachedConditions = conditions;
    this.lastUpdate = now;

    return conditions;
  }

  private detectConditions(): NetworkConditions {
    // Server-side or no window
    if (typeof window === 'undefined') {
      return this.getDefaultConditions();
    }

    const online = navigator.onLine;

    // Offline - disable prefetching
    if (!online) {
      return {
        connectionType: 'unknown',
        downlink: 0,
        rtt: Infinity,
        saveData: false,
        online: false,
        recommendedStrategy: 'disabled',
        maxConcurrentPrefetches: 0,
        shouldPausePrefetch: true,
      };
    }

    // No Network Information API - use defaults
    if (!this.connection) {
      return this.getDefaultConditions();
    }

    const connectionType = this.mapConnectionType(
      this.connection.effectiveType,
      this.connection.type
    );
    const downlink = this.connection.downlink || 10; // Default to 10 Mbps
    const rtt = this.connection.rtt || 50; // Default to 50ms
    const saveData = this.connection.saveData || false;

    const { strategy, maxConcurrent } = this.determineStrategy(
      downlink,
      rtt,
      saveData,
      connectionType
    );

    return {
      connectionType,
      downlink,
      rtt,
      saveData,
      online: true,
      recommendedStrategy: strategy,
      maxConcurrentPrefetches: maxConcurrent,
      shouldPausePrefetch: strategy === 'disabled',
    };
  }

  private mapConnectionType(
    effectiveType?: '4g' | '3g' | '2g' | 'slow-2g',
    type?: string
  ): ConnectionType {
    // Prefer physical connection type if available
    if (type === 'wifi') return 'wifi';
    if (type === 'ethernet') return 'ethernet';

    // Fall back to effective type
    if (effectiveType) return effectiveType;

    return 'unknown';
  }

  private determineStrategy(
    downlink: number,
    rtt: number,
    saveData: boolean,
    connectionType: ConnectionType
  ): { strategy: PrefetchStrategy; maxConcurrent: number } {
    // Data saver mode - minimal prefetching
    if (saveData) {
      return { strategy: 'conservative', maxConcurrent: 1 };
    }

    // Slow connections - be conservative
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      return { strategy: 'conservative', maxConcurrent: 1 };
    }

    // Check thresholds
    if (
      downlink >= STRATEGY_CONFIG.aggressive.minDownlink &&
      rtt <= STRATEGY_CONFIG.aggressive.maxRtt
    ) {
      return {
        strategy: 'aggressive',
        maxConcurrent: STRATEGY_CONFIG.aggressive.maxConcurrent,
      };
    }

    if (
      downlink >= STRATEGY_CONFIG.moderate.minDownlink &&
      rtt <= STRATEGY_CONFIG.moderate.maxRtt
    ) {
      return {
        strategy: 'moderate',
        maxConcurrent: STRATEGY_CONFIG.moderate.maxConcurrent,
      };
    }

    if (
      downlink >= STRATEGY_CONFIG.conservative.minDownlink &&
      rtt <= STRATEGY_CONFIG.conservative.maxRtt
    ) {
      return {
        strategy: 'conservative',
        maxConcurrent: STRATEGY_CONFIG.conservative.maxConcurrent,
      };
    }

    // Very poor connection - disable
    return { strategy: 'disabled', maxConcurrent: 0 };
  }

  private getDefaultConditions(): NetworkConditions {
    return {
      connectionType: 'unknown',
      downlink: 10, // Assume good connection
      rtt: 50,
      saveData: false,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      recommendedStrategy: 'moderate',
      maxConcurrentPrefetches: 3,
      shouldPausePrefetch: false,
    };
  }

  /**
   * Subscribe to network condition changes
   */
  subscribe(callback: NetworkChangeCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if prefetching should be allowed
   */
  shouldAllowPrefetch(): boolean {
    const conditions = this.getNetworkConditions();
    return conditions.online && !conditions.shouldPausePrefetch;
  }

  /**
   * Get the recommended number of concurrent prefetches
   */
  getMaxConcurrentPrefetches(): number {
    return this.getNetworkConditions().maxConcurrentPrefetches;
  }

  /**
   * Get the current prefetch strategy
   */
  getStrategy(): PrefetchStrategy {
    return this.getNetworkConditions().recommendedStrategy;
  }

  /**
   * Check if we're on a metered connection (cellular)
   */
  isMeteredConnection(): boolean {
    if (!this.connection) return false;
    const type = this.connection.type;
    return type === 'cellular';
  }

  /**
   * Check if data saver is enabled
   */
  isDataSaverEnabled(): boolean {
    return this.connection?.saveData ?? false;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.connection) {
      this.connection.removeEventListener('change', this.handleNetworkChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkChange);
      window.removeEventListener('offline', this.handleNetworkChange);
    }
    this.listeners.clear();
    BandwidthDetectorClass.instance = null;
  }
}

// Export singleton instance
export const BandwidthDetector = BandwidthDetectorClass.getInstance();

// Export type for external use
export type { BandwidthDetectorClass };
