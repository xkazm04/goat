/**
 * Instagram Platform Adapter
 * Note: Instagram doesn't support direct web sharing for posts
 * but supports Stories via URL scheme on mobile
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
  ShareResult,
} from '../types';

/**
 * Instagram sharing adapter
 */
export class InstagramAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'instagram',
    displayName: 'Instagram Stories',
    icon: 'instagram',
    color: '#E4405F',
    maxTextLength: 2200, // Caption limit
    maxHashtags: 30,
    supportedImageFormats: ['square', 'portrait', 'story'],
    imageDimensions: { width: 1080, height: 1920 }, // Story dimensions
    supportsDirectShare: true,
    requiresAuth: false,
    urlScheme: 'instagram-stories://',
    webUrl: 'https://www.instagram.com',
  };

  readonly capabilities: PlatformCapabilities = {
    text: false, // Can't share text directly
    url: false, // URLs in captions aren't clickable
    image: true,
    video: true,
    files: false,
    richPreview: false,
    hashtags: true,
    mentions: true,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    const hashtags = content.hashtags?.slice(0, this.config.maxHashtags) || [];
    const formattedHashtags = this.formatHashtags(hashtags, this.config.maxHashtags);

    // For Instagram, we prepare story sticker content
    // The actual image needs to be in the right format
    const text = [
      content.title,
      content.description,
      formattedHashtags,
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      ...content,
      text: this.truncateText(text, this.config.maxTextLength),
      formattedHashtags,
      trackedUrl,
      optimizedImageUrl: content.imageUrl,
      characterCount: text.length,
      fitsLimits: text.length <= this.config.maxTextLength,
    };
  }

  buildShareUrl(_content: OptimizedContent): string {
    // Instagram doesn't have a web share URL for stories
    // Just open Instagram
    return this.config.webUrl;
  }

  async share(content: OptimizedContent): Promise<ShareResult> {
    // Instagram Stories sharing only works on mobile with the app installed
    if (!this.isMobile()) {
      return {
        success: false,
        platform: this.config.platform,
        error: 'Instagram Stories sharing requires the Instagram mobile app',
      };
    }

    if (!content.imageUrl) {
      return {
        success: false,
        platform: this.config.platform,
        error: 'Instagram Stories requires an image',
      };
    }

    // Try the Instagram Stories deep link
    return this.tryStoriesDeepLink(content);
  }

  /**
   * Try to share to Instagram Stories via deep link
   */
  private async tryStoriesDeepLink(content: OptimizedContent): Promise<ShareResult> {
    // Instagram Stories URL scheme for sharing
    // Note: This requires the image to be in the app's container
    // For web, we can use the stories sharing endpoint with a URL

    const params = new URLSearchParams();

    // Background image (needs to be a valid URL the app can fetch)
    if (content.optimizedImageUrl) {
      params.append('background_image', content.optimizedImageUrl);
    }

    // Link sticker with the tracked URL
    params.append('link', content.trackedUrl);

    const deepLink = `instagram-stories://share?${params.toString()}`;

    // Try to open Instagram Stories
    if (typeof window !== 'undefined') {
      // Use a timeout approach to detect if app opened
      const start = Date.now();

      // Set up visibility change listener
      return new Promise((resolve) => {
        const handleVisibilityChange = () => {
          if (document.hidden) {
            // App opened successfully
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            resolve({
              success: true,
              platform: this.config.platform,
              deepLink,
            });
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Try to open the deep link
        window.location.href = deepLink;

        // Timeout fallback
        setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          if (Date.now() - start < 2000) {
            resolve({
              success: false,
              platform: this.config.platform,
              error: 'Instagram app not installed or sharing not supported',
            });
          }
        }, 2500);
      });
    }

    return {
      success: false,
      platform: this.config.platform,
      error: 'Unable to share to Instagram Stories',
    };
  }
}

export const instagramAdapter = new InstagramAdapter();
