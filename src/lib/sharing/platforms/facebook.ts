/**
 * Facebook Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * Facebook sharing adapter
 */
export class FacebookAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'facebook',
    displayName: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    maxTextLength: 63206, // Quote limit
    maxHashtags: 10,
    supportedImageFormats: ['landscape', 'square'],
    imageDimensions: { width: 1200, height: 630 },
    supportsDirectShare: false,
    requiresAuth: false,
    urlScheme: 'fb://',
    webUrl: 'https://www.facebook.com/sharer/sharer.php',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: true,
    video: true,
    files: false,
    richPreview: true, // Facebook generates link previews
    hashtags: true,
    mentions: false, // Not supported in share dialog
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    const hashtags = content.hashtags?.slice(0, this.config.maxHashtags) || [];
    const formattedHashtags = this.formatHashtags(hashtags, this.config.maxHashtags);

    // Facebook's sharer.php doesn't support custom text anymore
    // It uses the page's Open Graph meta tags
    // We can only provide a quote that overlays the preview
    let quote = '';

    if (content.type === 'challenge') {
      quote = content.description || 'Can you beat my ranking?';
    } else if (content.type === 'ranking' || content.type === 'result') {
      quote = `Check out my ${content.title}!`;
    } else {
      quote = content.description || content.title;
    }

    if (formattedHashtags) {
      quote = `${quote} ${formattedHashtags}`;
    }

    return {
      ...content,
      text: quote,
      formattedHashtags,
      trackedUrl,
      optimizedImageUrl: content.imageUrl,
      characterCount: quote.length,
      fitsLimits: true,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('u', content.trackedUrl);

    // Quote parameter for the overlay text
    if (content.text) {
      params.append('quote', content.text);
    }

    return `${this.config.webUrl}?${params.toString()}`;
  }

  protected buildDeepLink(content: OptimizedContent): string {
    // Facebook doesn't support deep linking to share
    return `fb://sharer.php?u=${encodeURIComponent(content.trackedUrl)}`;
  }
}

export const facebookAdapter = new FacebookAdapter();
