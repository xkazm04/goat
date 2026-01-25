/**
 * QuotaManager - Storage quota management
 *
 * Monitors IndexedDB storage usage, enforces limits, and provides
 * intelligent pruning strategies to stay within quota.
 */

import { getOfflineStorage, OfflineStorage } from './OfflineStorage';

// =============================================================================
// Types
// =============================================================================

export interface StorageEstimate {
  /** Used storage in bytes */
  usage: number;
  /** Total quota in bytes */
  quota: number;
  /** Usage percentage (0-100) */
  usagePercent: number;
  /** Whether storage is persisted */
  persisted: boolean;
}

export interface QuotaManagerConfig {
  /** Warning threshold as percentage of quota (default: 80) */
  warningThreshold?: number;
  /** Critical threshold as percentage of quota (default: 95) */
  criticalThreshold?: number;
  /** Target usage after pruning as percentage (default: 70) */
  pruneTarget?: number;
  /** Minimum free space in bytes (default: 50MB) */
  minFreeSpace?: number;
  /** Check interval in ms (default: 60000 - 1 minute) */
  checkIntervalMs?: number;
}

export interface PruneStrategy {
  /** Strategy name */
  name: string;
  /** Order of execution (lower = earlier) */
  priority: number;
  /** Function to execute the prune */
  execute: () => Promise<number>;
}

export type QuotaWarningCallback = (usage: number, quota: number) => void;
export type QuotaCriticalCallback = (usage: number, quota: number) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<QuotaManagerConfig> = {
  warningThreshold: 80,
  criticalThreshold: 95,
  pruneTarget: 70,
  minFreeSpace: 50 * 1024 * 1024, // 50MB
  checkIntervalMs: 60000,
};

// =============================================================================
// QuotaManager Class
// =============================================================================

export class QuotaManager {
  private config: Required<QuotaManagerConfig>;
  private storage: OfflineStorage;
  private warningCallbacks: Set<QuotaWarningCallback> = new Set();
  private criticalCallbacks: Set<QuotaCriticalCallback> = new Set();
  private pruneStrategies: PruneStrategy[] = [];
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastEstimate: StorageEstimate | null = null;
  private isInitialized = false;

  constructor(config: QuotaManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = getOfflineStorage();
    this.setupDefaultStrategies();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Check initial quota
    await this.checkQuota();

    // Request persistent storage if available
    await this.requestPersistentStorage();

    // Start periodic checks
    this.startPeriodicCheck();

    this.isInitialized = true;
    console.log('[QuotaManager] Initialized');
  }

  destroy(): void {
    this.stopPeriodicCheck();
    this.warningCallbacks.clear();
    this.criticalCallbacks.clear();
    this.isInitialized = false;
  }

  // ============================================================================
  // Storage Estimation
  // ============================================================================

  /**
   * Get current storage estimate
   */
  async getEstimate(): Promise<StorageEstimate> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return {
        usage: 0,
        quota: Infinity,
        usagePercent: 0,
        persisted: false,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? Infinity;
      const persisted = await this.isPersisted();

      this.lastEstimate = {
        usage,
        quota,
        usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
        persisted,
      };

      return this.lastEstimate;
    } catch (error) {
      console.error('[QuotaManager] Failed to get storage estimate:', error);
      return {
        usage: 0,
        quota: Infinity,
        usagePercent: 0,
        persisted: false,
      };
    }
  }

  /**
   * Get cached estimate (for quick access)
   */
  getCachedEstimate(): StorageEstimate | null {
    return this.lastEstimate;
  }

  /**
   * Check if storage is persisted
   */
  async isPersisted(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
      return false;
    }

    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      return false;
    }

    try {
      const granted = await navigator.storage.persist();
      if (granted) {
        console.log('[QuotaManager] Persistent storage granted');
      }
      return granted;
    } catch (error) {
      console.warn('[QuotaManager] Failed to request persistent storage:', error);
      return false;
    }
  }

  // ============================================================================
  // Quota Checking
  // ============================================================================

  /**
   * Check quota and trigger callbacks if thresholds exceeded
   */
  async checkQuota(): Promise<boolean> {
    const estimate = await this.getEstimate();

    // Check critical threshold
    if (estimate.usagePercent >= this.config.criticalThreshold) {
      console.warn(
        `[QuotaManager] CRITICAL: Storage at ${estimate.usagePercent.toFixed(1)}%`
      );
      this.notifyCritical(estimate.usage, estimate.quota);
      return false;
    }

    // Check warning threshold
    if (estimate.usagePercent >= this.config.warningThreshold) {
      console.warn(
        `[QuotaManager] WARNING: Storage at ${estimate.usagePercent.toFixed(1)}%`
      );
      this.notifyWarning(estimate.usage, estimate.quota);
    }

    return true;
  }

  /**
   * Check if there's enough space for a specific size
   */
  async hasSpace(requiredBytes: number): Promise<boolean> {
    const estimate = await this.getEstimate();
    const available = estimate.quota - estimate.usage;
    return available >= requiredBytes + this.config.minFreeSpace;
  }

  // ============================================================================
  // Pruning
  // ============================================================================

  /**
   * Prune storage to meet target threshold
   */
  async prune(): Promise<number> {
    const estimate = await this.getEstimate();
    const targetUsage = (this.config.pruneTarget / 100) * estimate.quota;
    const bytesToFree = estimate.usage - targetUsage;

    if (bytesToFree <= 0) {
      console.log('[QuotaManager] No pruning needed');
      return 0;
    }

    console.log(
      `[QuotaManager] Pruning to free ${this.formatBytes(bytesToFree)}`
    );

    let totalFreed = 0;

    // Execute strategies in priority order
    const sortedStrategies = [...this.pruneStrategies].sort(
      (a, b) => a.priority - b.priority
    );

    for (const strategy of sortedStrategies) {
      if (totalFreed >= bytesToFree) break;

      try {
        console.log(`[QuotaManager] Executing strategy: ${strategy.name}`);
        const freed = await strategy.execute();
        totalFreed += freed;
        console.log(`[QuotaManager] ${strategy.name} freed ${this.formatBytes(freed)}`);
      } catch (error) {
        console.error(`[QuotaManager] Strategy ${strategy.name} failed:`, error);
      }
    }

    console.log(`[QuotaManager] Total freed: ${this.formatBytes(totalFreed)}`);
    return totalFreed;
  }

  /**
   * Add a custom prune strategy
   */
  addPruneStrategy(strategy: PruneStrategy): void {
    this.pruneStrategies.push(strategy);
  }

  /**
   * Remove a prune strategy by name
   */
  removePruneStrategy(name: string): void {
    this.pruneStrategies = this.pruneStrategies.filter((s) => s.name !== name);
  }

  private setupDefaultStrategies(): void {
    // Strategy 1: Clear expired backlog cache
    this.addPruneStrategy({
      name: 'expired-backlog-cache',
      priority: 1,
      execute: async () => {
        const before = await this.getEstimate();
        await this.storage.pruneExpiredBacklogCache();
        const after = await this.getEstimate();
        return Math.max(0, before.usage - after.usage);
      },
    });

    // Strategy 2: Clear completed sync operations
    this.addPruneStrategy({
      name: 'completed-operations',
      priority: 2,
      execute: async () => {
        const before = await this.getEstimate();
        const queue = await this.storage.getSyncQueue();
        const completedOps = queue.filter((op) => op.status === 'completed');

        for (const op of completedOps) {
          await this.storage.removeOperation(op.id);
        }

        const after = await this.getEstimate();
        return Math.max(0, before.usage - after.usage);
      },
    });

    // Strategy 3: Clear old resolved conflicts
    this.addPruneStrategy({
      name: 'old-conflicts',
      priority: 3,
      execute: async () => {
        // This would need a method to clear old resolved conflicts
        // For now, return 0 as placeholder
        return 0;
      },
    });

    // Strategy 4: Clear old sessions (not recently accessed)
    this.addPruneStrategy({
      name: 'old-sessions',
      priority: 4,
      execute: async () => {
        const before = await this.getEstimate();
        const sessions = await this.storage.getAllSessions();

        // Keep sessions modified in the last 7 days
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const oldSessions = sessions
          .filter((s) => s.lastModified < cutoff && !s.isDirty)
          .sort((a, b) => a.lastModified - b.lastModified);

        // Delete oldest 20% of old sessions
        const toDelete = oldSessions.slice(
          0,
          Math.ceil(oldSessions.length * 0.2)
        );

        for (const session of toDelete) {
          await this.storage.deleteSession(session.id);
        }

        const after = await this.getEstimate();
        return Math.max(0, before.usage - after.usage);
      },
    });
  }

  // ============================================================================
  // Callbacks
  // ============================================================================

  /**
   * Register callback for warning threshold
   */
  onQuotaWarning(callback: QuotaWarningCallback): () => void {
    this.warningCallbacks.add(callback);
    return () => this.warningCallbacks.delete(callback);
  }

  /**
   * Register callback for critical threshold
   */
  onQuotaCritical(callback: QuotaCriticalCallback): () => void {
    this.criticalCallbacks.add(callback);
    return () => this.criticalCallbacks.delete(callback);
  }

  private notifyWarning(usage: number, quota: number): void {
    this.warningCallbacks.forEach((cb) => {
      try {
        cb(usage, quota);
      } catch (error) {
        console.error('[QuotaManager] Warning callback error:', error);
      }
    });
  }

  private notifyCritical(usage: number, quota: number): void {
    this.criticalCallbacks.forEach((cb) => {
      try {
        cb(usage, quota);
      } catch (error) {
        console.error('[QuotaManager] Critical callback error:', error);
      }
    });
  }

  // ============================================================================
  // Periodic Checking
  // ============================================================================

  private startPeriodicCheck(): void {
    if (this.checkIntervalId) return;

    this.checkIntervalId = setInterval(() => {
      this.checkQuota();
    }, this.config.checkIntervalMs);
  }

  private stopPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get storage status text
   */
  getStatusText(): string {
    if (!this.lastEstimate) return 'Unknown';

    const { usagePercent, persisted } = this.lastEstimate;
    const persistedText = persisted ? ' (persisted)' : '';

    if (usagePercent >= this.config.criticalThreshold) {
      return `Critical: ${usagePercent.toFixed(1)}% used${persistedText}`;
    }
    if (usagePercent >= this.config.warningThreshold) {
      return `Warning: ${usagePercent.toFixed(1)}% used${persistedText}`;
    }
    return `${usagePercent.toFixed(1)}% used${persistedText}`;
  }

  /**
   * Get detailed storage info
   */
  async getDetailedInfo(): Promise<{
    estimate: StorageEstimate;
    sessionCount: number;
    queueSize: number;
    cacheIds: string[];
  }> {
    const estimate = await this.getEstimate();
    const sessions = await this.storage.getAllSessions();
    const queue = await this.storage.getSyncQueue();
    const cacheIds = await this.storage.getAllCachedBacklogIds();

    return {
      estimate,
      sessionCount: sessions.length,
      queueSize: queue.length,
      cacheIds,
    };
  }
}

// =============================================================================
// Singleton & Exports
// =============================================================================

let quotaManagerInstance: QuotaManager | null = null;

export function getQuotaManager(config?: QuotaManagerConfig): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager(config);
  }
  return quotaManagerInstance;
}

export function resetQuotaManager(): void {
  if (quotaManagerInstance) {
    quotaManagerInstance.destroy();
    quotaManagerInstance = null;
  }
}
