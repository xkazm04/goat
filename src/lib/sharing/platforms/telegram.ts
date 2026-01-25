/**
 * Telegram Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * Telegram sharing adapter
 */
export class TelegramAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'telegram',
    displayName: 'Telegram',
    icon: 'telegram',
    color: '#0088CC',
    maxTextLength: 4096, // Message limit
    maxHashtags: 0,
    supportedImageFormats: ['square', 'landscape'],
    imageDimensions: { width: 1200, height: 630 },
    supportsDirectShare: true,
    requiresAuth: false,
    urlScheme: 'tg://',
    webUrl: 'https://t.me/share/url',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: false, // Not via URL scheme
    video: false,
    files: false,
    richPreview: true, // Telegram generates link previews
    hashtags: true, // Telegram supports hashtags
    mentions: true, // @username format
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    const hashtags = content.hashtags?.slice(0, 5) || [];
    const formattedHashtags = this.formatHashtags(hashtags, 5);

    // Build message for Telegram
    const parts: string[] = [];

    // Title
    if (content.type === 'challenge') {
      parts.push(`**${content.title}**`);
      parts.push(content.description || 'Can you beat my ranking?');
    } else if (content.type === 'ranking' || content.type === 'result') {
      parts.push(`Check out my **${content.title}**`);
      if (content.description) {
        parts.push(content.description);
      }
    } else {
      parts.push(`**${content.title}**`);
      if (content.description) {
        parts.push(content.description);
      }
    }

    // Hashtags
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
      characterCount: text.length + trackedUrl.length,
      fitsLimits: text.length + trackedUrl.length <= this.config.maxTextLength,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('url', content.trackedUrl);
    params.append('text', content.text);

    return `${this.config.webUrl}?${params.toString()}`;
  }

  protected buildDeepLink(content: OptimizedContent): string {
    const text = encodeURIComponent(content.text);
    const url = encodeURIComponent(content.trackedUrl);
    return `tg://msg_url?url=${url}&text=${text}`;
  }
}

export const telegramAdapter = new TelegramAdapter();
