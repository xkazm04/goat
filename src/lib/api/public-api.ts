/**
 * Public API Utilities
 *
 * Helper functions for the Universal Ranking API including
 * API key validation, rate limiting, and response formatting.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiKey,
  ApiKeyTier,
  API_TIER_LIMITS,
  API_TIER_FEATURES,
  PublicRankingItem,
  WidgetConfig,
} from '@/types/api-keys';
import { getVolatilityLevel } from '@/types/consensus';

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query param for widget embeds
  const apiKey = request.nextUrl.searchParams.get('api_key');
  return apiKey;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // API keys should be 32-64 characters, alphanumeric with underscores
  return /^goat_[a-zA-Z0-9_]{28,60}$/.test(key);
}

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `goat_${key}`;
}

/**
 * Check rate limit (in-memory for now, would use Redis in production)
 */
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  apiKey: string,
  tier: ApiKeyTier
): { allowed: boolean; remaining: number; resetIn: number } {
  const limits = {
    free: { perMinute: 10, perDay: 100, perMonth: 1000 },
    basic: { perMinute: 60, perDay: 1000, perMonth: 30000 },
    pro: { perMinute: 300, perDay: 10000, perMonth: 300000 },
    enterprise: { perMinute: 1000, perDay: 100000, perMonth: 3000000 },
  };

  const limit = limits[tier].perMinute;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  const cached = rateLimitCache.get(apiKey);

  if (!cached || now > cached.resetAt) {
    // Start new window
    rateLimitCache.set(apiKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (cached.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: cached.resetAt - now };
  }

  cached.count++;
  return { allowed: true, remaining: limit - cached.count, resetIn: cached.resetAt - now };
}

/**
 * Create standardized API response headers
 */
export function createApiHeaders(
  rateLimit: { remaining: number; resetIn: number },
  tier: ApiKeyTier
): Headers {
  const headers = new Headers();
  headers.set('X-GOAT-Api-Version', '1.0');
  headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetIn / 1000)));
  headers.set('X-Api-Tier', tier);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, X-API-Key, Content-Type');
  return headers;
}

/**
 * Create error response
 */
export function apiError(
  message: string,
  status: number,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code: code || 'API_ERROR',
        status,
      },
    },
    { status }
  );
}

/**
 * Transform internal consensus data to public API format
 */
export function toPublicRankingItem(
  item: {
    id: string;
    name: string;
    title?: string;
    image_url?: string;
    category: string;
    subcategory?: string | null;
  },
  consensus: {
    medianRank: number;
    averageRank: number;
    volatility: number;
    totalRankings: number;
    confidence: number;
    distribution?: Record<number, number>;
    percentiles?: { p25: number; p50: number; p75: number };
    peerClusters?: Array<{ label: string; clusterMedianRank: number; userCount: number }>;
  },
  rank: number,
  includeExtended: boolean = false
): PublicRankingItem {
  const result: PublicRankingItem = {
    id: item.id,
    name: item.name || item.title || 'Unknown',
    imageUrl: item.image_url || null,
    category: item.category,
    subcategory: item.subcategory || null,
    consensus: {
      rank,
      medianRank: consensus.medianRank,
      averageRank: Math.round(consensus.averageRank * 100) / 100,
      volatility: Math.round(consensus.volatility * 100) / 100,
      volatilityLevel: getVolatilityLevel(consensus.volatility),
      totalRankings: consensus.totalRankings,
      confidence: Math.round(consensus.confidence * 1000) / 1000,
    },
  };

  if (includeExtended && consensus.distribution) {
    result.extended = {
      distribution: consensus.distribution,
      percentiles: consensus.percentiles || { p25: 0, p50: 0, p75: 0 },
    };

    if (consensus.peerClusters) {
      result.extended.peerClusters = consensus.peerClusters.map((cluster) => ({
        label: cluster.label,
        medianRank: cluster.clusterMedianRank,
        userCount: cluster.userCount,
      }));
    }
  }

  return result;
}

/**
 * Parse widget config from query params
 */
export function parseWidgetConfig(searchParams: URLSearchParams): Partial<WidgetConfig> {
  return {
    type: (searchParams.get('type') as WidgetConfig['type']) || 'ranking',
    theme: (searchParams.get('theme') as WidgetConfig['theme']) || 'dark',
    size: (searchParams.get('size') as WidgetConfig['size']) || 'default',
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10,
    itemId: searchParams.get('itemId') || undefined,
    showVolatility: searchParams.get('showVolatility') === 'true',
    showClusters: searchParams.get('showClusters') === 'true',
  };
}

/**
 * CORS preflight handler
 */
export function handleCors(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

/**
 * Mock API key validation (in production, this would query the database)
 */
export async function validateApiKey(
  key: string
): Promise<{ valid: boolean; tier: ApiKeyTier; features: typeof API_TIER_FEATURES[ApiKeyTier] } | null> {
  // For now, accept any properly formatted key as 'free' tier
  // In production, this would lookup the key in the database
  if (!isValidApiKeyFormat(key)) {
    return null;
  }

  // Check for demo keys
  if (key === 'goat_demo_free_tier_key_12345678901234') {
    return {
      valid: true,
      tier: 'free',
      features: {
        widgets: true,
        analytics: false,
        trends: false,
        peerClusters: false,
        exportData: false,
        customBranding: false,
        prioritySupport: false,
      },
    };
  }

  if (key === 'goat_demo_pro_tier_key_123456789012345') {
    return {
      valid: true,
      tier: 'pro',
      features: {
        widgets: true,
        analytics: true,
        trends: true,
        peerClusters: true,
        exportData: true,
        customBranding: false,
        prioritySupport: false,
      },
    };
  }

  // Default: treat unknown but valid-format keys as free tier
  return {
    valid: true,
    tier: 'free',
    features: {
      widgets: true,
      analytics: false,
      trends: false,
      peerClusters: false,
      exportData: false,
      customBranding: false,
      prioritySupport: false,
    },
  };
}
