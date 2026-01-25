/**
 * ShareManager
 * Orchestrates the sharing flow across platforms
 */

import type {
  SharePlatform,
  ShareContent,
  ShareOptions,
  ShareResult,
  OptimizedContent,
} from './types';
import { getPlatformAdapter, isWebShareAvailable } from './platforms';
import { getContentOptimizer, ContentOptimizer } from './ContentOptimizer';
import { getShareAnalytics, ShareAnalytics } from './ShareAnalytics';

/**
 * Share manager options
 */
export interface ShareManagerOptions {
  /** Base URL for share links */
  baseUrl?: string;
  /** Analytics API endpoint */
  analyticsEndpoint?: string;
  /** Default UTM campaign */
  defaultCampaign?: string;
  /** Automatically track analytics */
  autoTrack?: boolean;
}

/**
 * ShareManager class
 * Main entry point for all sharing operations
 */
export class ShareManager {
  private optimizer: ContentOptimizer;
  private analytics: ShareAnalytics;
  private options: ShareManagerOptions;

  constructor(options: ShareManagerOptions = {}) {
    this.options = {
      autoTrack: true,
      defaultCampaign: 'share',
      ...options,
    };

    this.optimizer = getContentOptimizer(options.baseUrl);
    this.analytics = getShareAnalytics(options.analyticsEndpoint);
  }

  /**
   * Share content to a platform
   */
  async share(options: ShareOptions): Promise<ShareResult> {
    const { platform, content, trackAnalytics = true, utmCampaign, onComplete } = options;

    // Track initiation
    let eventId: string | undefined;
    if (this.options.autoTrack && trackAnalytics) {
      const event = this.analytics.trackInitiation(
        platform,
        content.type,
        content.metadata?.listId as string || content.metadata?.challengeId as string || 'unknown',
        content.metadata?.userId as string
      );
      eventId = event.id;
    }

    try {
      // Get platform adapter
      const adapter = getPlatformAdapter(platform);

      // Optimize content
      const optimizedContent = this.optimizer.optimize(
        platform,
        content,
        utmCampaign || this.options.defaultCampaign
      );

      // Execute share
      const result = await adapter.share(optimizedContent);

      // Track completion
      if (eventId && result.success) {
        this.analytics.trackCompletion(eventId);
      }

      // Add event to result
      result.event = eventId ? { id: eventId } as ShareResult['event'] : undefined;

      // Callback
      onComplete?.(result);

      return result;
    } catch (error) {
      const result: ShareResult = {
        success: false,
        platform,
        error: error instanceof Error ? error.message : 'Share failed',
      };

      onComplete?.(result);

      return result;
    }
  }

  /**
   * Share using native Web Share API
   */
  async shareNative(content: ShareContent, options?: {
    trackAnalytics?: boolean;
    utmCampaign?: string;
  }): Promise<ShareResult> {
    if (!isWebShareAvailable()) {
      return {
        success: false,
        platform: 'native',
        error: 'Web Share API not available',
      };
    }

    return this.share({
      platform: 'native',
      content,
      ...options,
    });
  }

  /**
   * Copy link to clipboard
   */
  async copyLink(content: ShareContent, options?: {
    trackAnalytics?: boolean;
    utmCampaign?: string;
  }): Promise<ShareResult> {
    return this.share({
      platform: 'copy',
      content,
      ...options,
    });
  }

  /**
   * Get optimized content for a platform
   */
  getOptimizedContent(
    platform: SharePlatform,
    content: ShareContent,
    campaign?: string
  ): OptimizedContent {
    return this.optimizer.optimize(platform, content, campaign || this.options.defaultCampaign);
  }

  /**
   * Get all available platforms for sharing
   */
  getAvailablePlatforms(): SharePlatform[] {
    const platforms: SharePlatform[] = [
      'twitter',
      'facebook',
      'reddit',
      'discord',
      'whatsapp',
      'telegram',
      'linkedin',
      'email',
      'copy',
    ];

    // Add native if available
    if (isWebShareAvailable()) {
      platforms.unshift('native');
    }

    // Add Instagram only on mobile
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      platforms.push('instagram');
    }

    return platforms;
  }

  /**
   * Get recommended platforms based on content type
   */
  getRecommendedPlatforms(contentType: ShareContent['type']): SharePlatform[] {
    switch (contentType) {
      case 'challenge':
        // Challenges work best on social platforms
        return ['twitter', 'discord', 'whatsapp', 'telegram', 'reddit'];

      case 'ranking':
      case 'result':
        // Rankings work well with images
        return ['twitter', 'instagram', 'facebook', 'reddit', 'discord'];

      case 'list':
        // Lists are good for all platforms
        return ['twitter', 'reddit', 'facebook', 'linkedin'];

      case 'profile':
        // Profiles work on professional and social
        return ['twitter', 'linkedin', 'facebook'];

      default:
        return ['twitter', 'facebook', 'copy'];
    }
  }

  /**
   * Build share content for a ranking
   */
  buildRankingShare(options: Parameters<ContentOptimizer['buildRankingContent']>[0]): ShareContent {
    return this.optimizer.buildRankingContent(options);
  }

  /**
   * Build share content for a challenge
   */
  buildChallengeShare(options: Parameters<ContentOptimizer['buildChallengeContent']>[0]): ShareContent {
    return this.optimizer.buildChallengeContent(options);
  }

  /**
   * Get platform display info
   */
  getPlatformInfo(platform: SharePlatform): {
    name: string;
    icon: string;
    color: string;
  } {
    const adapter = getPlatformAdapter(platform);
    return {
      name: adapter.config.displayName,
      icon: adapter.config.icon,
      color: adapter.config.color,
    };
  }

  /**
   * Check if a platform is available
   */
  isPlatformAvailable(platform: SharePlatform): boolean {
    if (platform === 'native') {
      return isWebShareAvailable();
    }

    if (platform === 'instagram') {
      return typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    return true;
  }

  /**
   * Get analytics instance
   */
  getAnalytics(): ShareAnalytics {
    return this.analytics;
  }

  /**
   * Get optimizer instance
   */
  getOptimizer(): ContentOptimizer {
    return this.optimizer;
  }
}

// Singleton instance
let shareManagerInstance: ShareManager | null = null;

/**
 * Get or create ShareManager instance
 */
export function getShareManager(options?: ShareManagerOptions): ShareManager {
  if (!shareManagerInstance) {
    shareManagerInstance = new ShareManager(options);
  }
  return shareManagerInstance;
}

/**
 * Create a new ShareManager instance
 */
export function createShareManager(options?: ShareManagerOptions): ShareManager {
  return new ShareManager(options);
}
