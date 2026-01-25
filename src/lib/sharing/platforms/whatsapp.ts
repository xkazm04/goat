/**
 * WhatsApp Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * WhatsApp sharing adapter
 */
export class WhatsAppAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'whatsapp',
    displayName: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    maxTextLength: 65536, // Very high limit
    maxHashtags: 0,
    supportedImageFormats: ['square', 'landscape'],
    imageDimensions: { width: 1200, height: 630 },
    supportsDirectShare: true,
    requiresAuth: false,
    urlScheme: 'whatsapp://',
    webUrl: 'https://api.whatsapp.com/send',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: false, // Can't directly share images via URL scheme
    video: false,
    files: false,
    richPreview: true, // WhatsApp generates link previews
    hashtags: false,
    mentions: false,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    // Build a message that works well in WhatsApp
    const parts: string[] = [];

    // Title with emoji
    if (content.type === 'challenge') {
      parts.push(`*${content.title}*`);
      parts.push(content.description || 'Can you beat my ranking?');
    } else if (content.type === 'ranking' || content.type === 'result') {
      parts.push(`Check out my *${content.title}*`);
      if (content.description) {
        parts.push(content.description);
      }
    } else {
      parts.push(`*${content.title}*`);
      if (content.description) {
        parts.push(content.description);
      }
    }

    // URL (WhatsApp will generate preview)
    parts.push('');
    parts.push(trackedUrl);

    const text = parts.join('\n');

    return {
      ...content,
      text,
      formattedHashtags: '',
      trackedUrl,
      optimizedImageUrl: content.imageUrl,
      characterCount: text.length,
      fitsLimits: true,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('text', content.text);

    return `${this.config.webUrl}?${params.toString()}`;
  }

  protected buildDeepLink(content: OptimizedContent): string {
    const text = encodeURIComponent(content.text);
    return `whatsapp://send?text=${text}`;
  }
}

export const whatsappAdapter = new WhatsAppAdapter();
