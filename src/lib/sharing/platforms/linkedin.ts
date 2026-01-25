/**
 * LinkedIn Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * LinkedIn sharing adapter
 */
export class LinkedInAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'linkedin',
    displayName: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    maxTextLength: 3000, // Post text limit
    maxHashtags: 5, // Recommended max
    supportedImageFormats: ['landscape'],
    imageDimensions: { width: 1200, height: 627 },
    supportsDirectShare: false,
    requiresAuth: false,
    urlScheme: 'linkedin://',
    webUrl: 'https://www.linkedin.com/sharing/share-offsite/',
  };

  readonly capabilities: PlatformCapabilities = {
    text: false, // LinkedIn share URL only uses URL
    url: true,
    image: true,
    video: true,
    files: false,
    richPreview: true, // LinkedIn generates link previews
    hashtags: true,
    mentions: false,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    const hashtags = content.hashtags?.slice(0, this.config.maxHashtags) || [];
    const formattedHashtags = this.formatHashtags(hashtags, this.config.maxHashtags);

    // LinkedIn's share-offsite only accepts a URL
    // The content comes from Open Graph tags
    // But we prepare the text for the native share API fallback
    const parts: string[] = [];

    if (content.type === 'challenge') {
      parts.push(`${content.title}`);
      parts.push(content.description || 'Test your knowledge!');
    } else if (content.type === 'ranking') {
      parts.push(`Check out my ${content.title}`);
      if (content.description) {
        parts.push(content.description);
      }
    } else {
      parts.push(content.title);
      if (content.description) {
        parts.push(content.description);
      }
    }

    if (formattedHashtags) {
      parts.push('');
      parts.push(formattedHashtags);
    }

    const text = parts.join('\n');

    return {
      ...content,
      text,
      formattedHashtags,
      trackedUrl,
      optimizedImageUrl: content.imageUrl,
      characterCount: text.length,
      fitsLimits: text.length <= this.config.maxTextLength,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('url', content.trackedUrl);

    return `${this.config.webUrl}?${params.toString()}`;
  }

  protected buildDeepLink(content: OptimizedContent): string {
    return `linkedin://shareArticle?url=${encodeURIComponent(content.trackedUrl)}`;
  }
}

export const linkedinAdapter = new LinkedInAdapter();
