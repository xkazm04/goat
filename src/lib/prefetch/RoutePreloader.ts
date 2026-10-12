/**
 * RoutePreloader
 *
 * Route-aware prefetching that loads data based on current route and likely
 * next destinations. Defines prefetch strategies for each route and handles
 * route change events.
 *
 * Prefetch Triggers:
 * - Landing: Featured lists, popular categories
 * - List Page: Item data for that category
 * - Match Page: Backlog items, session data
 */

import { goatApi } from '@/lib/api/goat-api';
import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';
import { collectionKeys } from '@/lib/query-keys/collection';
import { topListsKeys } from '@/lib/query-keys/top-lists';

import { PredictionEngine } from './PredictionEngine';
import { PrefetchManager, type PrefetchTarget } from './PrefetchManager';

export interface RouteConfig {
  /** Route pattern (can include :param syntax) */
  pattern: string;
  /** Data to prefetch when navigating TO this route */
  prefetchOnEnter?: (params: Record<string, string>) => PrefetchTarget[];
  /** Data to prefetch when ON this route (for likely next destinations) */
  prefetchOnIdle?: (params: Record<string, string>) => PrefetchTarget[];
  /** Priority for this route's prefetches */
  defaultPriority?: 'high' | 'medium' | 'low';
}

/**
 * Route patterns and their prefetch configurations
 */
const ROUTE_CONFIGS: RouteConfig[] = [
  // Landing page
  {
    pattern: '/',
    prefetchOnEnter: () => [
      {
        id: 'featured-lists',
        queryKey: topListsKeys.featured({ popular_limit: 10, trending_limit: 10 }),
        queryFn: () => goatApi.lists.getFeatured({ popular_limit: 10, trending_limit: 10 }),
        staleTime: CACHE_TTL_MS.STANDARD,
        priority: 'medium',
        source: 'route',
        metadata: { dataType: 'featured-lists' },
      },
    ],
    prefetchOnIdle: () => {
      // Prefetch common categories based on user behavior
      const predictions = PredictionEngine.getPredictions('/');
      const targets: PrefetchTarget[] = [];

      // Prefetch predicted categories
      for (const pred of predictions) {
        if (pred.type === 'category' && pred.category) {
          targets.push({
            id: `groups-${pred.category}`,
            queryKey: collectionKeys.groupsList({ category: pred.category }),
            queryFn: () => goatApi.groups.getByCategory(pred.category!),
            staleTime: CACHE_TTL_MS.LONG,
            priority: 'low',
            source: 'prediction',
            metadata: { dataType: 'groups', category: pred.category },
          });
        }
      }

      return targets;
    },
    defaultPriority: 'medium',
  },

  // Match page - prefetch backlog items
  {
    pattern: '/match/:listId',
    prefetchOnEnter: (params) => {
      const { listId } = params;
      if (!listId) return [];

      return [
        {
          id: `list-${listId}`,
          queryKey: topListsKeys.list(listId, true),
          queryFn: () => goatApi.lists.get(listId, true),
          staleTime: CACHE_TTL_MS.STANDARD,
          priority: 'high',
          source: 'route',
          metadata: { dataType: 'list-detail', listId },
        },
      ];
    },
    defaultPriority: 'high',
  },

  // List detail page
  {
    pattern: '/lists/:listId',
    prefetchOnEnter: (params) => {
      const { listId } = params;
      if (!listId) return [];

      return [
        {
          id: `list-${listId}`,
          queryKey: topListsKeys.list(listId, true),
          queryFn: () => goatApi.lists.get(listId, true),
          staleTime: CACHE_TTL_MS.STANDARD,
          priority: 'high',
          source: 'route',
          metadata: { dataType: 'list-detail', listId },
        },
        {
          id: `list-analytics-${listId}`,
          queryKey: topListsKeys.analytics(listId),
          queryFn: () => goatApi.lists.getAnalytics(listId),
          staleTime: CACHE_TTL_MS.EPHEMERAL,
          priority: 'low',
          source: 'route',
          metadata: { dataType: 'analytics', listId },
        },
      ];
    },
    prefetchOnIdle: (params) => {
      const { listId } = params;
      if (!listId) return [];

      // Prefetch match page data if user might start ranking
      return [
        {
          id: `list-match-${listId}`,
          queryKey: topListsKeys.list(listId, true),
          queryFn: () => goatApi.lists.get(listId, true),
          staleTime: CACHE_TTL_MS.STANDARD,
          priority: 'low',
          source: 'route',
          metadata: { dataType: 'list-for-match', listId },
        },
      ];
    },
    defaultPriority: 'high',
  },

  // Category browse page
  {
    pattern: '/browse/:category',
    prefetchOnEnter: (params) => {
      const { category } = params;
      if (!category) return [];

      return [
        {
          id: `groups-${category}`,
          queryKey: collectionKeys.groupsList({ category }),
          queryFn: () => goatApi.groups.getByCategory(category),
          staleTime: CACHE_TTL_MS.LONG,
          priority: 'medium',
          source: 'route',
          metadata: { dataType: 'groups', category },
        },
        {
          id: `lists-${category}`,
          queryKey: topListsKeys.predefinedLists(category),
          queryFn: () => goatApi.lists.getPredefined(category),
          staleTime: CACHE_TTL_MS.LONG,
          priority: 'medium',
          source: 'route',
          metadata: { dataType: 'predefined-lists', category },
        },
      ];
    },
    defaultPriority: 'medium',
  },

  // Share page
  {
    pattern: '/share/:code',
    prefetchOnEnter: () => {
      // Share pages typically load their data from the share code
      // No generic prefetch needed
      return [];
    },
    defaultPriority: 'low',
  },

  // Blueprints page
  {
    pattern: '/blueprints',
    prefetchOnEnter: () => [
      {
        id: 'featured-blueprints',
        queryKey: ['blueprints', 'featured'],
        queryFn: () => goatApi.blueprints.getFeatured(20),
        staleTime: CACHE_TTL_MS.LONG,
        priority: 'medium',
        source: 'route',
        metadata: { dataType: 'blueprints' },
      },
    ],
    defaultPriority: 'medium',
  },

  // Blueprint detail
  {
    pattern: '/blueprints/:slug',
    prefetchOnEnter: (params) => {
      const { slug } = params;
      if (!slug) return [];

      return [
        {
          id: `blueprint-${slug}`,
          queryKey: ['blueprints', slug],
          queryFn: () => goatApi.blueprints.get(slug),
          staleTime: CACHE_TTL_MS.LONG,
          priority: 'high',
          source: 'route',
          metadata: { dataType: 'blueprint-detail', slug },
        },
      ];
    },
    defaultPriority: 'high',
  },
];

class RoutePreloaderClass {
  private static instance: RoutePreloaderClass | null = null;
  private currentRoute: string = '/';
  private currentParams: Record<string, string> = {};
  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_DELAY = 2000; // 2 seconds of idle before predictive prefetch

  private constructor() {}

  static getInstance(): RoutePreloaderClass {
    if (!RoutePreloaderClass.instance) {
      RoutePreloaderClass.instance = new RoutePreloaderClass();
    }
    return RoutePreloaderClass.instance;
  }

  /**
   * Parse route pattern params (e.g., /match/:listId -> { listId: 'abc' })
   */
  private parseRouteParams(pattern: string, pathname: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * Find matching route config for a pathname
   */
  private findRouteConfig(pathname: string): { config: RouteConfig; params: Record<string, string> } | null {
    for (const config of ROUTE_CONFIGS) {
      const params = this.parseRouteParams(config.pattern, pathname);
      if (params !== null) {
        return { config, params };
      }
    }
    return null;
  }

  /**
   * Handle route change - prefetch data for the new route
   */
  onRouteChange(pathname: string): void {
    // Clear any pending idle prefetch
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    // Record navigation for prediction engine
    PredictionEngine.recordEvent({
      type: 'navigation',
      route: pathname,
    });

    this.currentRoute = pathname;

    const match = this.findRouteConfig(pathname);
    if (!match) {
      return;
    }

    const { config, params } = match;
    this.currentParams = params;

    // Execute prefetchOnEnter
    if (config.prefetchOnEnter) {
      const targets = config.prefetchOnEnter(params);
      PrefetchManager.prefetchMany(targets);
    }

    // Schedule idle prefetch
    if (config.prefetchOnIdle) {
      this.idleTimeout = setTimeout(() => {
        const idleTargets = config.prefetchOnIdle!(params);
        PrefetchManager.prefetchMany(idleTargets);
      }, this.IDLE_DELAY);
    }
  }

  /**
   * Prefetch data for a route the user might navigate to
   */
  prefetchRoute(pathname: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const match = this.findRouteConfig(pathname);
    if (!match) return;

    const { config, params } = match;

    if (config.prefetchOnEnter) {
      const targets = config.prefetchOnEnter(params).map((t) => ({
        ...t,
        priority: priority,
      }));
      PrefetchManager.prefetchMany(targets);
    }
  }

  /**
   * Get prefetch targets for a route without executing
   */
  getTargetsForRoute(pathname: string): PrefetchTarget[] {
    const match = this.findRouteConfig(pathname);
    if (!match) return [];

    const { config, params } = match;
    return config.prefetchOnEnter?.(params) ?? [];
  }

  /**
   * Manually trigger idle prefetch for current route
   */
  triggerIdlePrefetch(): void {
    const match = this.findRouteConfig(this.currentRoute);
    if (!match?.config.prefetchOnIdle) return;

    const targets = match.config.prefetchOnIdle(this.currentParams);
    PrefetchManager.prefetchMany(targets);
  }

  /**
   * Get the current route
   */
  getCurrentRoute(): string {
    return this.currentRoute;
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    RoutePreloaderClass.instance = null;
  }
}

// Export singleton instance
export const RoutePreloader = RoutePreloaderClass.getInstance();

// Export route configs for testing/debugging
export { ROUTE_CONFIGS };
