/**
 * ContentOptimizer
 * Optimizes content for each platform
 */

import type {
  SharePlatform,
  ShareContent,
  OptimizedContent,
  ImageFormat,
} from './types';
import { getPlatformAdapter } from './platforms';

/**
 * UTM parameters for tracking
 */
export interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

/**
 * ContentOptimizer class
 * Handles platform-specific content optimization
 */
export class ContentOptimizer {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  /**
   * Optimize content for a specific platform
   */
  optimize(
    platform: SharePlatform,
    content: ShareContent,
    campaign?: string
  ): OptimizedContent {
    const adapter = getPlatformAdapter(platform);
    const trackedUrl = this.addUTMParams(content.url, {
      source: platform,
      medium: 'social',
      campaign: campaign || content.type,
    });

    return adapter.optimizeContent(content, trackedUrl);
  }

  /**
   * Optimize content for all platforms
   */
  optimizeForAll(
    content: ShareContent,
    campaign?: string
  ): Record<SharePlatform, OptimizedContent> {
    const platforms: SharePlatform[] = [
      'twitter',
      'instagram',
      'reddit',
      'discord',
      'whatsapp',
      'telegram',
      'facebook',
      'linkedin',
      'email',
      'native',
      'copy',
    ];

    const result: Partial<Record<SharePlatform, OptimizedContent>> = {};

    platforms.forEach((platform) => {
      result[platform] = this.optimize(platform, content, campaign);
    });

    return result as Record<SharePlatform, OptimizedContent>;
  }

  /**
   * Add UTM parameters to a URL
   */
  addUTMParams(url: string, params: UTMParams): string {
    try {
      const urlObj = new URL(url, this.baseUrl);

      urlObj.searchParams.set('utm_source', params.source);
      urlObj.searchParams.set('utm_medium', params.medium);
      urlObj.searchParams.set('utm_campaign', params.campaign);

      if (params.content) {
        urlObj.searchParams.set('utm_content', params.content);
      }

      if (params.term) {
        urlObj.searchParams.set('utm_term', params.term);
      }

      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Get optimal image dimensions for a platform
   */
  getOptimalImageDimensions(platform: SharePlatform): { width: number; height: number } {
    const adapter = getPlatformAdapter(platform);
    return adapter.config.imageDimensions;
  }

  /**
   * Get preferred image format for a platform
   */
  getPreferredImageFormat(platform: SharePlatform): ImageFormat {
    const adapter = getPlatformAdapter(platform);
    const formats = adapter.config.supportedImageFormats;

    // Return first supported format or default to landscape
    return formats[0] || 'landscape';
  }

  /**
   * Calculate optimal text length for platform
   */
  calculateOptimalTextLength(
    platform: SharePlatform,
    includeUrl: boolean = true,
    includeHashtags: boolean = true,
    hashtagCount: number = 3
  ): number {
    const adapter = getPlatformAdapter(platform);
    const maxLength = adapter.config.maxTextLength;

    let reserved = 0;

    // Reserve space for URL (Twitter counts all URLs as 23 chars)
    if (includeUrl) {
      reserved += platform === 'twitter' ? 23 : 50; // Estimate for others
    }

    // Reserve space for hashtags
    if (includeHashtags) {
      const avgHashtagLength = 12; // Average hashtag length including #
      reserved += Math.min(hashtagCount, adapter.config.maxHashtags) * avgHashtagLength;
    }

    // Add buffer for spaces
    reserved += 5;

    return Math.max(0, maxLength - reserved);
  }

  /**
   * Truncate text intelligently (at word boundaries)
   */
  smartTruncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;

    // Find the last space before the limit
    const truncateAt = maxLength - suffix.length;
    const lastSpace = text.lastIndexOf(' ', truncateAt);

    if (lastSpace > truncateAt * 0.7) {
      // If space is reasonably close, truncate there
      return text.slice(0, lastSpace).trimEnd() + suffix;
    }

    // Otherwise, hard truncate
    return text.slice(0, truncateAt).trimEnd() + suffix;
  }

  /**
   * Build share content from ranking data
   */
  buildRankingContent(options: {
    listTitle: string;
    listId: string;
    items: Array<{ id: string; title: string; position: number }>;
    shareCode: string;
    imageUrl?: string;
    hashtags?: string[];
  }): ShareContent {
    const { listTitle, listId, items, shareCode, imageUrl, hashtags } = options;

    // Create a description showing top 3 items
    const topItems = items
      .slice(0, 3)
      .map((item) => `${item.position}. ${item.title}`)
      .join(', ');

    const description = `My Top 3: ${topItems}${items.length > 3 ? '...' : ''}`;

    return {
      type: 'ranking',
      title: listTitle,
      description,
      url: `${this.baseUrl}/share/${shareCode}`,
      imageUrl,
      hashtags: hashtags || ['GOAT', 'Ranking', listTitle.replace(/\s+/g, '')],
      via: 'goat_app',
      metadata: {
        listId,
        itemCount: items.length,
      },
    };
  }

  /**
   * Build share content from challenge data
   */
  buildChallengeContent(options: {
    challengeTitle: string;
    challengeId: string;
    challengeCode: string;
    challengeType: string;
    creatorName: string;
    imageUrl?: string;
    hashtags?: string[];
  }): ShareContent {
    const {
      challengeTitle,
      challengeId,
      challengeCode,
      challengeType,
      creatorName,
      imageUrl,
      hashtags,
    } = options;

    let description: string;
    switch (challengeType) {
      case 'beat_my_ranking':
        description = `${creatorName} challenged you to beat their ranking!`;
        break;
      case 'collaborative':
        description = `Join ${creatorName}'s collaborative ranking session!`;
        break;
      case 'speed_ranking':
        description = `How fast can you complete this ranking?`;
        break;
      default:
        description = `Can you beat this ranking challenge?`;
    }

    return {
      type: 'challenge',
      title: challengeTitle,
      description,
      url: `${this.baseUrl}/challenge/${challengeCode}`,
      imageUrl,
      hashtags: hashtags || ['GOAT', 'Challenge', 'Ranking'],
      via: 'goat_app',
      metadata: {
        challengeId,
        challengeType,
        creatorName,
      },
    };
  }
}

// Singleton instance
let optimizerInstance: ContentOptimizer | null = null;

/**
 * Get or create ContentOptimizer instance
 */
export function getContentOptimizer(baseUrl?: string): ContentOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new ContentOptimizer(baseUrl);
  }
  return optimizerInstance;
}

/**
 * Create a new ContentOptimizer instance
 */
export function createContentOptimizer(baseUrl?: string): ContentOptimizer {
  return new ContentOptimizer(baseUrl);
}
