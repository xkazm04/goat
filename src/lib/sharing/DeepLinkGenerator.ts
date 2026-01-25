/**
 * DeepLinkGenerator
 * Generates deep links for mobile apps
 */

import type { SharePlatform, ShareContent } from './types';

/**
 * Deep link configuration for a platform
 */
export interface DeepLinkConfig {
  /** URL scheme for the app */
  scheme: string;
  /** Android package name */
  androidPackage?: string;
  /** iOS App Store ID */
  iosAppId?: string;
  /** Universal link domain */
  universalLinkDomain?: string;
  /** Fallback web URL */
  webFallback: string;
}

/**
 * Platform deep link configurations
 */
const DEEP_LINK_CONFIGS: Partial<Record<SharePlatform, DeepLinkConfig>> = {
  twitter: {
    scheme: 'twitter://',
    androidPackage: 'com.twitter.android',
    iosAppId: '333903271',
    universalLinkDomain: 'twitter.com',
    webFallback: 'https://twitter.com/intent/tweet',
  },
  instagram: {
    scheme: 'instagram-stories://',
    androidPackage: 'com.instagram.android',
    iosAppId: '389801252',
    webFallback: 'https://www.instagram.com',
  },
  facebook: {
    scheme: 'fb://',
    androidPackage: 'com.facebook.katana',
    iosAppId: '284882215',
    universalLinkDomain: 'facebook.com',
    webFallback: 'https://www.facebook.com/sharer/sharer.php',
  },
  whatsapp: {
    scheme: 'whatsapp://',
    androidPackage: 'com.whatsapp',
    iosAppId: '310633997',
    universalLinkDomain: 'wa.me',
    webFallback: 'https://api.whatsapp.com/send',
  },
  telegram: {
    scheme: 'tg://',
    androidPackage: 'org.telegram.messenger',
    iosAppId: '686449807',
    universalLinkDomain: 't.me',
    webFallback: 'https://t.me/share/url',
  },
  discord: {
    scheme: 'discord://',
    androidPackage: 'com.discord',
    iosAppId: '985746746',
    webFallback: 'https://discord.com/channels/@me',
  },
  reddit: {
    scheme: 'reddit://',
    androidPackage: 'com.reddit.frontpage',
    iosAppId: '1064216828',
    universalLinkDomain: 'reddit.com',
    webFallback: 'https://www.reddit.com/submit',
  },
  linkedin: {
    scheme: 'linkedin://',
    androidPackage: 'com.linkedin.android',
    iosAppId: '288429040',
    universalLinkDomain: 'linkedin.com',
    webFallback: 'https://www.linkedin.com/sharing/share-offsite/',
  },
};

/**
 * DeepLinkGenerator class
 */
export class DeepLinkGenerator {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  /**
   * Get deep link config for a platform
   */
  getConfig(platform: SharePlatform): DeepLinkConfig | null {
    return DEEP_LINK_CONFIGS[platform] || null;
  }

  /**
   * Generate deep link URL for a platform
   */
  generateDeepLink(
    platform: SharePlatform,
    content: ShareContent,
    trackedUrl: string
  ): string | null {
    const config = this.getConfig(platform);
    if (!config) return null;

    switch (platform) {
      case 'twitter':
        return this.generateTwitterDeepLink(content, trackedUrl);

      case 'instagram':
        return this.generateInstagramDeepLink(content, trackedUrl);

      case 'whatsapp':
        return this.generateWhatsAppDeepLink(content, trackedUrl);

      case 'telegram':
        return this.generateTelegramDeepLink(content, trackedUrl);

      case 'reddit':
        return this.generateRedditDeepLink(content, trackedUrl);

      case 'discord':
        return this.generateDiscordDeepLink();

      case 'facebook':
        return this.generateFacebookDeepLink(trackedUrl);

      case 'linkedin':
        return this.generateLinkedInDeepLink(trackedUrl);

      default:
        return null;
    }
  }

  /**
   * Generate an intent URL for Android
   */
  generateAndroidIntent(
    platform: SharePlatform,
    content: ShareContent,
    trackedUrl: string
  ): string | null {
    const config = this.getConfig(platform);
    if (!config || !config.androidPackage) return null;

    // Android intent URL format
    // intent://path#Intent;scheme=scheme;package=package;S.key=value;end
    const deepLink = this.generateDeepLink(platform, content, trackedUrl);
    if (!deepLink) return null;

    // Extract path from deep link
    const url = new URL(deepLink);
    const path = url.pathname + url.search;

    const intentUrl = [
      `intent:/${path}`,
      `#Intent`,
      `scheme=${url.protocol.replace(':', '')}`,
      `package=${config.androidPackage}`,
      `S.browser_fallback_url=${encodeURIComponent(config.webFallback)}`,
      `end`,
    ].join(';');

    return intentUrl;
  }

  /**
   * Generate universal link (iOS)
   */
  generateUniversalLink(
    platform: SharePlatform,
    content: ShareContent,
    trackedUrl: string
  ): string | null {
    const config = this.getConfig(platform);
    if (!config || !config.universalLinkDomain) return null;

    // Universal links work like regular URLs but open the app if installed
    switch (platform) {
      case 'whatsapp':
        const text = encodeURIComponent(`${content.title}\n${trackedUrl}`);
        return `https://wa.me/?text=${text}`;

      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(trackedUrl)}&text=${encodeURIComponent(content.title)}`;

      default:
        return null;
    }
  }

  /**
   * Get the best share URL for current device
   */
  getBestShareUrl(
    platform: SharePlatform,
    content: ShareContent,
    trackedUrl: string
  ): { url: string; type: 'deepLink' | 'universal' | 'intent' | 'web' } {
    const config = this.getConfig(platform);
    if (!config) {
      return { url: trackedUrl, type: 'web' };
    }

    const isMobile = typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' &&
      /Android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // Try universal link first (iOS)
      if (isIOS && config.universalLinkDomain) {
        const universalLink = this.generateUniversalLink(platform, content, trackedUrl);
        if (universalLink) {
          return { url: universalLink, type: 'universal' };
        }
      }

      // Try Android intent
      if (isAndroid && config.androidPackage) {
        const intentUrl = this.generateAndroidIntent(platform, content, trackedUrl);
        if (intentUrl) {
          return { url: intentUrl, type: 'intent' };
        }
      }

      // Fall back to deep link
      const deepLink = this.generateDeepLink(platform, content, trackedUrl);
      if (deepLink) {
        return { url: deepLink, type: 'deepLink' };
      }
    }

    // Fall back to web
    return { url: this.buildWebShareUrl(platform, content, trackedUrl), type: 'web' };
  }

  /**
   * Build web share URL
   */
  private buildWebShareUrl(
    platform: SharePlatform,
    content: ShareContent,
    trackedUrl: string
  ): string {
    const config = this.getConfig(platform);
    if (!config) return trackedUrl;

    const params = new URLSearchParams();

    switch (platform) {
      case 'twitter':
        params.append('text', content.title);
        params.append('url', trackedUrl);
        return `${config.webFallback}?${params.toString()}`;

      case 'facebook':
        params.append('u', trackedUrl);
        return `${config.webFallback}?${params.toString()}`;

      case 'whatsapp':
        params.append('text', `${content.title}\n${trackedUrl}`);
        return `${config.webFallback}?${params.toString()}`;

      case 'telegram':
        params.append('url', trackedUrl);
        params.append('text', content.title);
        return `${config.webFallback}?${params.toString()}`;

      case 'reddit':
        params.append('url', trackedUrl);
        params.append('title', content.title);
        return `${config.webFallback}?${params.toString()}`;

      case 'linkedin':
        params.append('url', trackedUrl);
        return `${config.webFallback}?${params.toString()}`;

      default:
        return config.webFallback;
    }
  }

  // Platform-specific deep link generators

  private generateTwitterDeepLink(content: ShareContent, trackedUrl: string): string {
    const params = new URLSearchParams();
    params.append('text', content.title);
    params.append('url', trackedUrl);
    return `twitter://post?${params.toString()}`;
  }

  private generateInstagramDeepLink(content: ShareContent, trackedUrl: string): string {
    const params = new URLSearchParams();
    if (content.imageUrl) {
      params.append('background_image', content.imageUrl);
    }
    params.append('link', trackedUrl);
    return `instagram-stories://share?${params.toString()}`;
  }

  private generateWhatsAppDeepLink(content: ShareContent, trackedUrl: string): string {
    const text = `${content.title}\n${trackedUrl}`;
    return `whatsapp://send?text=${encodeURIComponent(text)}`;
  }

  private generateTelegramDeepLink(content: ShareContent, trackedUrl: string): string {
    return `tg://msg_url?url=${encodeURIComponent(trackedUrl)}&text=${encodeURIComponent(content.title)}`;
  }

  private generateRedditDeepLink(content: ShareContent, trackedUrl: string): string {
    return `reddit://submit?url=${encodeURIComponent(trackedUrl)}&title=${encodeURIComponent(content.title)}`;
  }

  private generateDiscordDeepLink(): string {
    return 'discord://';
  }

  private generateFacebookDeepLink(trackedUrl: string): string {
    return `fb://sharer.php?u=${encodeURIComponent(trackedUrl)}`;
  }

  private generateLinkedInDeepLink(trackedUrl: string): string {
    return `linkedin://shareArticle?url=${encodeURIComponent(trackedUrl)}`;
  }
}

// Singleton instance
let generatorInstance: DeepLinkGenerator | null = null;

/**
 * Get or create DeepLinkGenerator instance
 */
export function getDeepLinkGenerator(baseUrl?: string): DeepLinkGenerator {
  if (!generatorInstance) {
    generatorInstance = new DeepLinkGenerator(baseUrl);
  }
  return generatorInstance;
}

/**
 * Create a new DeepLinkGenerator instance
 */
export function createDeepLinkGenerator(baseUrl?: string): DeepLinkGenerator {
  return new DeepLinkGenerator(baseUrl);
}
