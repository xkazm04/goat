/**
 * Reddit Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * Reddit sharing adapter
 */
export class RedditAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'reddit',
    displayName: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    maxTextLength: 300, // Title limit
    maxHashtags: 0, // Reddit doesn't use hashtags
    supportedImageFormats: ['landscape', 'square'],
    imageDimensions: { width: 1200, height: 628 },
    supportsDirectShare: false,
    requiresAuth: false,
    urlScheme: 'reddit://',
    webUrl: 'https://www.reddit.com/submit',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: true,
    video: true,
    files: false,
    richPreview: true,
    hashtags: false,
    mentions: true, // u/username format
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    // Reddit doesn't use hashtags, but allows flair
    const formattedHashtags = '';

    // Optimize title for Reddit
    let title = content.title;

    // Add ranking type indicator if it's a ranking share
    if (content.type === 'ranking' || content.type === 'result') {
      if (!title.toLowerCase().includes('my')) {
        title = `My ${title}`;
      }
      if (!title.toLowerCase().includes('ranking') && !title.toLowerCase().includes('top')) {
        title = `${title} Ranking`;
      }
    }

    title = this.truncateText(title, this.config.maxTextLength);

    return {
      ...content,
      title,
      text: title,
      formattedHashtags,
      trackedUrl,
      optimizedImageUrl: content.imageUrl,
      characterCount: title.length,
      fitsLimits: title.length <= this.config.maxTextLength,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();

    params.append('url', content.trackedUrl);
    params.append('title', content.text);

    // If there's an image, suggest image post type
    if (content.optimizedImageUrl) {
      params.append('type', 'IMAGE');
    }

    return `${this.config.webUrl}?${params.toString()}`;
  }

  protected buildDeepLink(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('url', content.trackedUrl);
    params.append('title', content.text);

    return `reddit://submit?${params.toString()}`;
  }
}

export const redditAdapter = new RedditAdapter();
