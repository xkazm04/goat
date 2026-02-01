/**
 * PredictionEngine
 *
 * Analyzes user behavior patterns to predict likely next actions and
 * recommend data to prefetch. Uses session-based pattern tracking
 * without persistence (out of scope: cross-session prediction).
 *
 * Tracks:
 * - Route navigation patterns
 * - Category/list preferences
 * - Time-of-day patterns
 * - Feature usage frequency
 */

export interface UserBehaviorEvent {
  type: 'navigation' | 'interaction' | 'search' | 'view' | 'action';
  route?: string;
  category?: string;
  subcategory?: string;
  listId?: string;
  itemId?: string;
  searchTerm?: string;
  action?: string;
  timestamp: number;
}

export interface PredictionResult {
  /** What type of data to prefetch */
  type: 'route' | 'category' | 'list' | 'items' | 'search';
  /** Route to prefetch */
  route?: string;
  /** Category to warm */
  category?: string;
  /** Subcategory to warm */
  subcategory?: string;
  /** Specific list ID */
  listId?: string;
  /** Search term to prefetch results for */
  searchTerm?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the prediction */
  reason: string;
}

interface RouteTransition {
  from: string;
  to: string;
  count: number;
}

interface CategoryUsage {
  category: string;
  subcategory?: string;
  count: number;
  lastUsed: number;
}

interface SessionPattern {
  routeTransitions: Map<string, RouteTransition[]>;
  categoryUsage: Map<string, CategoryUsage>;
  recentRoutes: string[];
  recentCategories: string[];
  searchHistory: string[];
  eventCount: number;
  sessionStart: number;
}

/** Maximum events to keep in history */
const MAX_HISTORY_SIZE = 100;

/** Minimum confidence to return a prediction */
const MIN_CONFIDENCE = 0.3;

/** Recent items window size */
const RECENT_WINDOW = 10;

class PredictionEngineClass {
  private static instance: PredictionEngineClass | null = null;
  private pattern: SessionPattern;
  private enabled: boolean = true;

  private constructor() {
    this.pattern = this.createEmptyPattern();
  }

  static getInstance(): PredictionEngineClass {
    if (!PredictionEngineClass.instance) {
      PredictionEngineClass.instance = new PredictionEngineClass();
    }
    return PredictionEngineClass.instance;
  }

  private createEmptyPattern(): SessionPattern {
    return {
      routeTransitions: new Map(),
      categoryUsage: new Map(),
      recentRoutes: [],
      recentCategories: [],
      searchHistory: [],
      eventCount: 0,
      sessionStart: Date.now(),
    };
  }

  /**
   * Record a user behavior event
   */
  recordEvent(event: Omit<UserBehaviorEvent, 'timestamp'>): void {
    if (!this.enabled) return;

    const fullEvent: UserBehaviorEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.pattern.eventCount++;

    // Track route navigation
    if (event.type === 'navigation' && event.route) {
      this.recordRouteVisit(event.route);
    }

    // Track category usage
    if (event.category) {
      this.recordCategoryUsage(event.category, event.subcategory);
    }

    // Track search terms
    if (event.type === 'search' && event.searchTerm) {
      this.recordSearch(event.searchTerm);
    }

    // Trim history if needed
    this.trimHistory();
  }

  private recordRouteVisit(route: string): void {
    const recentRoutes = this.pattern.recentRoutes;
    const previousRoute = recentRoutes[recentRoutes.length - 1];

    // Add to recent routes
    recentRoutes.push(route);
    if (recentRoutes.length > RECENT_WINDOW) {
      recentRoutes.shift();
    }

    // Track transition
    if (previousRoute && previousRoute !== route) {
      const key = previousRoute;
      const transitions = this.pattern.routeTransitions.get(key) || [];

      const existing = transitions.find((t) => t.to === route);
      if (existing) {
        existing.count++;
      } else {
        transitions.push({ from: previousRoute, to: route, count: 1 });
      }

      this.pattern.routeTransitions.set(key, transitions);
    }
  }

  private recordCategoryUsage(category: string, subcategory?: string): void {
    const key = subcategory ? `${category}:${subcategory}` : category;
    const existing = this.pattern.categoryUsage.get(key);

    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
    } else {
      this.pattern.categoryUsage.set(key, {
        category,
        subcategory,
        count: 1,
        lastUsed: Date.now(),
      });
    }

    // Add to recent categories
    if (!this.pattern.recentCategories.includes(key)) {
      this.pattern.recentCategories.push(key);
      if (this.pattern.recentCategories.length > RECENT_WINDOW) {
        this.pattern.recentCategories.shift();
      }
    }
  }

  private recordSearch(term: string): void {
    // Avoid duplicates in history
    const normalizedTerm = term.toLowerCase().trim();
    const existing = this.pattern.searchHistory.indexOf(normalizedTerm);
    if (existing !== -1) {
      this.pattern.searchHistory.splice(existing, 1);
    }

    this.pattern.searchHistory.push(normalizedTerm);
    if (this.pattern.searchHistory.length > RECENT_WINDOW) {
      this.pattern.searchHistory.shift();
    }
  }

  private trimHistory(): void {
    // Keep route transitions manageable
    if (this.pattern.routeTransitions.size > MAX_HISTORY_SIZE) {
      // Remove oldest entries (first in map)
      const keysToRemove = Array.from(this.pattern.routeTransitions.keys())
        .slice(0, this.pattern.routeTransitions.size - MAX_HISTORY_SIZE);
      keysToRemove.forEach((key) => this.pattern.routeTransitions.delete(key));
    }
  }

  /**
   * Get predictions for data to prefetch based on current context
   */
  getPredictions(currentRoute: string, limit: number = 3): PredictionResult[] {
    if (!this.enabled) return [];

    const predictions: PredictionResult[] = [];

    // 1. Predict next route based on transitions
    const routePredictions = this.predictNextRoutes(currentRoute);
    predictions.push(...routePredictions);

    // 2. Predict category to warm based on usage
    const categoryPredictions = this.predictCategories();
    predictions.push(...categoryPredictions);

    // Sort by confidence and return top N
    return predictions
      .filter((p) => p.confidence >= MIN_CONFIDENCE)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private predictNextRoutes(currentRoute: string): PredictionResult[] {
    const transitions = this.pattern.routeTransitions.get(currentRoute);
    if (!transitions || transitions.length === 0) {
      return [];
    }

    // Calculate total transitions from this route
    const total = transitions.reduce((sum, t) => sum + t.count, 0);

    return transitions
      .map((t) => ({
        type: 'route' as const,
        route: t.to,
        confidence: Math.min(t.count / total, 0.9), // Cap at 90%
        reason: `User navigated to ${t.to} ${t.count} time(s) from ${currentRoute}`,
      }))
      .filter((p) => p.confidence >= MIN_CONFIDENCE);
  }

  private predictCategories(): PredictionResult[] {
    const categories = Array.from(this.pattern.categoryUsage.values());
    if (categories.length === 0) return [];

    // Sort by recency and frequency
    const sorted = categories.sort((a, b) => {
      // Weight: 60% frequency, 40% recency
      const aScore = a.count * 0.6 + (1 - (Date.now() - a.lastUsed) / 3600000) * 0.4;
      const bScore = b.count * 0.6 + (1 - (Date.now() - b.lastUsed) / 3600000) * 0.4;
      return bScore - aScore;
    });

    const totalUsage = categories.reduce((sum, c) => sum + c.count, 0);

    return sorted.slice(0, 2).map((cat) => ({
      type: 'category' as const,
      category: cat.category,
      subcategory: cat.subcategory,
      confidence: Math.min(cat.count / totalUsage + 0.2, 0.8), // Boost + cap
      reason: `User frequently uses ${cat.subcategory || cat.category} (${cat.count} times)`,
    }));
  }

  /**
   * Get frequently used categories for cache warming
   */
  getFrequentCategories(): CategoryUsage[] {
    const categories = Array.from(this.pattern.categoryUsage.values());
    return categories
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Get common search terms for prefetching
   */
  getCommonSearchTerms(): string[] {
    return [...this.pattern.searchHistory].reverse();
  }

  /**
   * Check if user shows preference for a category
   */
  hasPreference(category: string, subcategory?: string): boolean {
    const key = subcategory ? `${category}:${subcategory}` : category;
    const usage = this.pattern.categoryUsage.get(key);
    return usage ? usage.count >= 3 : false;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    eventCount: number;
    sessionDuration: number;
    uniqueRoutes: number;
    uniqueCategories: number;
    searchCount: number;
  } {
    return {
      eventCount: this.pattern.eventCount,
      sessionDuration: Date.now() - this.pattern.sessionStart,
      uniqueRoutes: this.pattern.routeTransitions.size,
      uniqueCategories: this.pattern.categoryUsage.size,
      searchCount: this.pattern.searchHistory.length,
    };
  }

  /**
   * Enable or disable prediction tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Clear all tracked patterns (new session)
   */
  reset(): void {
    this.pattern = this.createEmptyPattern();
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.reset();
    PredictionEngineClass.instance = null;
  }
}

// Export singleton instance
export const PredictionEngine = PredictionEngineClass.getInstance();

// Export type for external use
export type { PredictionEngineClass };
