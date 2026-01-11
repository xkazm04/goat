/**
 * Cache Invalidation Strategies
 *
 * Provides various invalidation strategies for different use cases:
 * - Time-based: Invalidate after TTL expires
 * - Event-based: Invalidate on specific events (mutations, webhooks)
 * - Dependency-based: Invalidate when related data changes
 * - Pattern-based: Invalidate by matching URL patterns
 * - Tag-based: Invalidate by cache entry tags
 */

import { getGlobalAPICache } from './api-cache';

export type InvalidationTrigger = 'mutation' | 'webhook' | 'user-action' | 'timer' | 'dependency';

export interface InvalidationRule {
  /** Unique identifier for this rule */
  id: string;
  /** Description of what this rule invalidates */
  description: string;
  /** What triggers this invalidation */
  trigger: InvalidationTrigger;
  /** Pattern to match cache keys */
  pattern?: RegExp;
  /** Tags to match */
  tags?: string[];
  /** Specific keys to invalidate */
  keys?: string[];
  /** Delay before invalidation (ms) */
  delay?: number;
}

export interface InvalidationEvent {
  type: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

// Predefined invalidation rules for common scenarios
export const INVALIDATION_RULES: Record<string, InvalidationRule> = {
  // List operations
  LIST_CREATED: {
    id: 'list-created',
    description: 'Invalidate list caches when a new list is created',
    trigger: 'mutation',
    pattern: /^api:\/lists/,
    tags: ['lists', 'featured', 'user-lists'],
  },
  LIST_UPDATED: {
    id: 'list-updated',
    description: 'Invalidate specific list when updated',
    trigger: 'mutation',
    tags: ['list-detail'],
  },
  LIST_DELETED: {
    id: 'list-deleted',
    description: 'Invalidate list caches when a list is deleted',
    trigger: 'mutation',
    pattern: /^api:\/lists/,
    tags: ['lists', 'featured', 'user-lists'],
  },

  // Item group operations
  GROUP_ITEMS_CHANGED: {
    id: 'group-items-changed',
    description: 'Invalidate group caches when items change',
    trigger: 'mutation',
    pattern: /^api:\/top\/groups/,
    tags: ['groups', 'items'],
  },

  // User operations
  USER_LISTS_CHANGED: {
    id: 'user-lists-changed',
    description: 'Invalidate user list caches',
    trigger: 'mutation',
    tags: ['user-lists'],
  },

  // Analytics (short cache, frequent updates)
  ANALYTICS_STALE: {
    id: 'analytics-stale',
    description: 'Invalidate analytics after short period',
    trigger: 'timer',
    pattern: /analytics/,
    delay: 60000, // 1 minute
  },

  // Full refresh
  FULL_REFRESH: {
    id: 'full-refresh',
    description: 'Invalidate all caches',
    trigger: 'user-action',
  },
};

/**
 * Cache Invalidation Manager
 *
 * Centralized manager for cache invalidation with support for
 * multiple strategies and event-driven invalidation.
 */
export class CacheInvalidationManager {
  private rules: Map<string, InvalidationRule> = new Map();
  private eventLog: InvalidationEvent[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private maxEventLogSize = 100;

  constructor() {
    // Register default rules
    Object.values(INVALIDATION_RULES).forEach(rule => {
      this.registerRule(rule);
    });
  }

  /**
   * Register a new invalidation rule
   */
  registerRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);

    // Set up timer-based invalidation
    if (rule.trigger === 'timer' && rule.delay) {
      this.setupTimerInvalidation(rule);
    }
  }

  /**
   * Unregister an invalidation rule
   */
  unregisterRule(ruleId: string): boolean {
    const timer = this.timers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(ruleId);
    }
    return this.rules.delete(ruleId);
  }

  /**
   * Trigger invalidation by rule ID
   */
  triggerByRule(ruleId: string, context?: Record<string, unknown>): number {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      console.warn(`[CacheInvalidation] Rule not found: ${ruleId}`);
      return 0;
    }

    return this.executeRule(rule, context);
  }

  /**
   * Trigger invalidation for a specific event type
   */
  triggerByEvent(eventType: string, payload?: Record<string, unknown>): number {
    const event: InvalidationEvent = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };

    this.logEvent(event);

    let totalInvalidated = 0;

    // Find and execute matching rules
    const rules = Array.from(this.rules.values());
    for (const rule of rules) {
      if (this.ruleMatchesEvent(rule, eventType)) {
        totalInvalidated += this.executeRule(rule, payload);
      }
    }

    return totalInvalidated;
  }

  /**
   * Invalidate by specific list ID
   */
  invalidateList(listId: string): number {
    const cache = getGlobalAPICache();
    return cache.invalidate({
      pattern: new RegExp(`/lists/${listId}`),
    });
  }

  /**
   * Invalidate by user ID
   */
  invalidateUserData(userId: string): number {
    const cache = getGlobalAPICache();
    return cache.invalidate({
      pattern: new RegExp(`user_id=${userId}|userId=${userId}`),
    });
  }

  /**
   * Invalidate by category
   */
  invalidateCategory(category: string): number {
    const cache = getGlobalAPICache();
    return cache.invalidate({
      pattern: new RegExp(`category=${category}|categories/${category}`),
    });
  }

  /**
   * Invalidate all caches
   */
  invalidateAll(): number {
    const cache = getGlobalAPICache();
    return cache.invalidate({ all: true });
  }

  /**
   * Get invalidation event history
   */
  getEventLog(): InvalidationEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get all registered rules
   */
  getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  // Private methods

  private executeRule(rule: InvalidationRule, context?: Record<string, unknown>): number {
    const cache = getGlobalAPICache();
    let invalidated = 0;

    // Invalidate by pattern
    if (rule.pattern) {
      invalidated += cache.invalidate({ pattern: rule.pattern });
    }

    // Invalidate by tags
    if (rule.tags && rule.tags.length > 0) {
      invalidated += cache.invalidate({ tags: rule.tags });
    }

    // Invalidate specific keys
    if (rule.keys) {
      for (const key of rule.keys) {
        invalidated += cache.invalidate({ key });
      }
    }

    // If rule has no pattern/tags/keys, it might be a full refresh
    if (!rule.pattern && !rule.tags && !rule.keys && rule.id === 'full-refresh') {
      invalidated += cache.invalidate({ all: true });
    }

    console.log(
      `[CacheInvalidation] Rule "${rule.id}" executed: ${invalidated} entries invalidated`,
      context ? { context } : ''
    );

    return invalidated;
  }

  private ruleMatchesEvent(rule: InvalidationRule, eventType: string): boolean {
    // Map event types to rule triggers
    const eventTriggerMap: Record<string, InvalidationTrigger[]> = {
      'list.created': ['mutation'],
      'list.updated': ['mutation'],
      'list.deleted': ['mutation'],
      'items.changed': ['mutation'],
      'user.action': ['user-action'],
      'refresh.requested': ['user-action'],
    };

    const matchingTriggers = eventTriggerMap[eventType] || [];
    return matchingTriggers.includes(rule.trigger);
  }

  private setupTimerInvalidation(rule: InvalidationRule): void {
    if (!rule.delay) return;

    // Clear existing timer if any
    const existingTimer = this.timers.get(rule.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Set up new timer
    const timer = setInterval(() => {
      this.executeRule(rule);
    }, rule.delay);

    this.timers.set(rule.id, timer);
  }

  private logEvent(event: InvalidationEvent): void {
    this.eventLog.push(event);

    // Trim log if it exceeds max size
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxEventLogSize);
    }
  }
}

// Singleton instance
let invalidationManagerInstance: CacheInvalidationManager | null = null;

export function getCacheInvalidationManager(): CacheInvalidationManager {
  if (!invalidationManagerInstance) {
    invalidationManagerInstance = new CacheInvalidationManager();
  }
  return invalidationManagerInstance;
}

/**
 * Convenience functions for common invalidation scenarios
 */
export const cacheInvalidation = {
  onListCreated: (listId?: string) => {
    const manager = getCacheInvalidationManager();
    if (listId) {
      manager.invalidateList(listId);
    }
    return manager.triggerByRule('list-created', { listId });
  },

  onListUpdated: (listId: string) => {
    const manager = getCacheInvalidationManager();
    manager.invalidateList(listId);
    return manager.triggerByRule('list-updated', { listId });
  },

  onListDeleted: (listId: string) => {
    const manager = getCacheInvalidationManager();
    manager.invalidateList(listId);
    return manager.triggerByRule('list-deleted', { listId });
  },

  onGroupChanged: (groupId: string) => {
    const manager = getCacheInvalidationManager();
    return manager.triggerByRule('group-items-changed', { groupId });
  },

  onUserDataChanged: (userId: string) => {
    const manager = getCacheInvalidationManager();
    manager.invalidateUserData(userId);
    return manager.triggerByRule('user-lists-changed', { userId });
  },

  forceRefresh: () => {
    const manager = getCacheInvalidationManager();
    return manager.triggerByRule('full-refresh');
  },

  forCategory: (category: string) => {
    const manager = getCacheInvalidationManager();
    return manager.invalidateCategory(category);
  },
};
