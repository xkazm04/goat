/**
 * API Keys and Public API Types
 *
 * Types for the Universal Ranking API that powers public access,
 * embeddable widgets, and B2B integrations.
 */

/**
 * API Key tiers with different access levels
 */
export type ApiKeyTier = 'free' | 'basic' | 'pro' | 'enterprise';

/**
 * API Key record stored in database
 */
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  tier: ApiKeyTier;
  userId: string | null;
  organizationId: string | null;

  /** Allowed domains for widget embedding (empty = all) */
  allowedDomains: string[];

  /** Rate limits */
  rateLimitPerMinute: number;
  rateLimitPerDay: number;

  /** Usage tracking */
  requestsToday: number;
  requestsThisMonth: number;
  lastRequestAt: string | null;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;

  /** Status */
  isActive: boolean;
  isRevoked: boolean;
}

/**
 * Rate limits by tier
 */
export const API_TIER_LIMITS: Record<ApiKeyTier, { perMinute: number; perDay: number; perMonth: number }> = {
  free: { perMinute: 10, perDay: 100, perMonth: 1000 },
  basic: { perMinute: 60, perDay: 1000, perMonth: 30000 },
  pro: { perMinute: 300, perDay: 10000, perMonth: 300000 },
  enterprise: { perMinute: 1000, perDay: 100000, perMonth: 3000000 },
};

/**
 * Features available per tier
 */
export const API_TIER_FEATURES: Record<ApiKeyTier, {
  widgets: boolean;
  analytics: boolean;
  trends: boolean;
  peerClusters: boolean;
  exportData: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}> = {
  free: {
    widgets: true,
    analytics: false,
    trends: false,
    peerClusters: false,
    exportData: false,
    customBranding: false,
    prioritySupport: false,
  },
  basic: {
    widgets: true,
    analytics: true,
    trends: false,
    peerClusters: false,
    exportData: false,
    customBranding: false,
    prioritySupport: false,
  },
  pro: {
    widgets: true,
    analytics: true,
    trends: true,
    peerClusters: true,
    exportData: true,
    customBranding: false,
    prioritySupport: false,
  },
  enterprise: {
    widgets: true,
    analytics: true,
    trends: true,
    peerClusters: true,
    exportData: true,
    customBranding: true,
    prioritySupport: true,
  },
};

/**
 * Widget configuration for embeds
 */
export interface WidgetConfig {
  /** Widget type */
  type: 'ranking' | 'item' | 'comparison' | 'badge';

  /** Theme */
  theme: 'light' | 'dark' | 'auto';

  /** Size variant */
  size: 'compact' | 'default' | 'large';

  /** Category to display */
  category: string;

  /** Optional subcategory filter */
  subcategory?: string;

  /** Number of items to show (for ranking widget) */
  limit?: number;

  /** Specific item ID (for item/badge widget) */
  itemId?: string;

  /** Compare item IDs (for comparison widget) */
  compareIds?: string[];

  /** Show volatility indicator */
  showVolatility?: boolean;

  /** Show peer cluster breakdown */
  showClusters?: boolean;

  /** Custom branding (enterprise only) */
  customLogo?: string;
  customColors?: {
    primary: string;
    secondary: string;
    background: string;
  };
}

/**
 * Public ranking response for API
 */
export interface PublicRankingItem {
  id: string;
  name: string;
  imageUrl: string | null;
  category: string;
  subcategory: string | null;

  /** Consensus ranking data */
  consensus: {
    rank: number;
    medianRank: number;
    averageRank: number;
    volatility: number;
    volatilityLevel: 'stable' | 'moderate' | 'contested' | 'polarizing';
    totalRankings: number;
    confidence: number;
  };

  /** Optional extended data (based on API tier) */
  extended?: {
    distribution: Record<number, number>;
    percentiles: { p25: number; p50: number; p75: number };
    peerClusters?: Array<{
      label: string;
      medianRank: number;
      userCount: number;
    }>;
    trend?: {
      direction: 'up' | 'down' | 'stable';
      change: number;
      period: string;
    };
  };
}

/**
 * Public rankings list response
 */
export interface PublicRankingsResponse {
  rankings: PublicRankingItem[];
  meta: {
    category: string;
    subcategory?: string;
    totalItems: number;
    totalRankings: number;
    lastUpdated: string;
    apiVersion: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * B2B Analytics Response
 */
export interface AnalyticsResponse {
  category: string;
  subcategory?: string;
  period: {
    start: string;
    end: string;
  };
  overview: {
    totalRankings: number;
    uniqueUsers: number;
    averageListSize: number;
    mostActiveDay: string;
  };
  topItems: Array<{
    id: string;
    name: string;
    rankingCount: number;
    averagePosition: number;
    trend: 'rising' | 'falling' | 'stable';
  }>;
  distribution: {
    byPosition: Record<number, number>;
    byVolatility: Record<string, number>;
  };
  clusters?: Array<{
    id: string;
    label: string;
    userCount: number;
    topItems: string[];
    characteristics: string[];
  }>;
}

/**
 * Trend data for historical analysis
 */
export interface TrendDataPoint {
  date: string;
  rank: number;
  rankingCount: number;
  confidence: number;
}

export interface ItemTrendResponse {
  itemId: string;
  itemName: string;
  category: string;
  period: {
    start: string;
    end: string;
    granularity: 'day' | 'week' | 'month';
  };
  trend: {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
    startRank: number;
    endRank: number;
    volatilityChange: number;
  };
  dataPoints: TrendDataPoint[];
}
