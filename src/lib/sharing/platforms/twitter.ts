/**
 * Twitter/X Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * Twitter/X sharing adapter
 */
export class TwitterAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'twitter',
    displayName: 'X (Twitter)',
    icon: 'twitter',
    color: '#000000',
    maxTextLength: 280,
    maxHashtags: 3,
    supportedImageFormats: ['square', 'landscape'],
    imageDimensions: { width: 1200, height: 675 },
    supportsDirectShare: false,
    requiresAuth: false,
    urlScheme: 'twitter://',
    webUrl: 'https://twitter.com/intent/tweet',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: true,
    video: true,
    files: false,
    richPreview: true,
    hashtags: true,
    mentions: true,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    const hashtags = content.hashtags?.slice(0, this.config.maxHashtags) || [];
    const formattedHashtags = this.formatHashtags(hashtags, this.config.maxHashtags);

    // Calculate available space for text
    // Twitter counts all URLs as 23 characters
    const urlSpace = 23;
    const hashtagSpace = formattedHashtags ? formattedHashtags.length + 1 : 0;
    const viaSpace = content.via ? content.via.length + 6 : 0; // " via @handle"
    const availableSpace = this.config.maxTextLength - urlSpace - hashtagSpace - viaSpace - 2;

    // Build text
    let text = content.description || content.title;
    text = this.truncateText(text, Math.max(0, availableSpace));

    const fullText = [
      text,
      formattedHashtags,
      content.via ? `via @${content.via}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      ...content,
      text: fullText,
      formattedHashtags,
      trackedUrl,
      optimizedImageUrl: content.imageUrl,
      characterCount: fullText.length + urlSpace,
      fitsLimits: fullText.length + urlSpace <= this.config.maxTextLength,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();

    if (content.text) {
      params.append('text', content.text);
    }

    params.append('url', content.trackedUrl);

    return `${this.config.webUrl}?${params.toString()}`;
  }

  protected buildDeepLink(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('text', content.text);
    params.append('url', content.trackedUrl);

    return `twitter://post?${params.toString()}`;
  }
}

export const twitterAdapter = new TwitterAdapter();
