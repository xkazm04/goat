/**
 * Discord Platform Adapter
 * Shares content for Discord rich embeds
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
 * Discord sharing adapter
 */
export class DiscordAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'discord',
    displayName: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    maxTextLength: 2000, // Message limit
    maxHashtags: 0, // Discord doesn't use hashtags
    supportedImageFormats: ['landscape', 'square'],
    imageDimensions: { width: 1200, height: 630 },
    supportsDirectShare: false,
    requiresAuth: false,
    urlScheme: 'discord://',
    webUrl: 'https://discord.com/channels/@me',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: true,
    video: true,
    files: true,
    richPreview: true, // Discord auto-generates embeds
    hashtags: false,
    mentions: true, // @username format
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    // Discord doesn't use hashtags
    const formattedHashtags = '';

    // Build a message optimized for Discord
    // Discord will auto-generate an embed from the URL
    const parts: string[] = [];

    // Add a call to action
    if (content.type === 'challenge') {
      parts.push(`**${content.title}**`);
      parts.push(content.description || 'Can you beat this ranking?');
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

    // Add the URL (Discord will generate a rich embed)
    parts.push('');
    parts.push(trackedUrl);

    const text = parts.join('\n');

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

  buildShareUrl(content: OptimizedContent): string {
    // Discord doesn't have a direct share URL
    // We'll copy the message to clipboard and open Discord
    return this.config.webUrl;
  }

  async share(content: OptimizedContent): Promise<ShareResult> {
    try {
      // Copy the formatted message to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content.text);

        // Open Discord
        if (this.isMobile()) {
          // Try deep link on mobile
          const deepLinkResult = await this.tryDeepLink(content);
          if (deepLinkResult.success) {
            return {
              success: true,
              platform: this.config.platform,
              deepLink: 'discord://',
            };
          }
        }

        // Open Discord web
        this.openShareWindow(this.config.webUrl);

        return {
          success: true,
          platform: this.config.platform,
          fallbackUrl: this.config.webUrl,
        };
      }

      return {
        success: false,
        platform: this.config.platform,
        error: 'Clipboard not available',
      };
    } catch (error) {
      return {
        success: false,
        platform: this.config.platform,
        error: error instanceof Error ? error.message : 'Share failed',
      };
    }
  }

  protected buildDeepLink(_content: OptimizedContent): string {
    // Discord deep link to open the app
    return 'discord://';
  }
}

export const discordAdapter = new DiscordAdapter();
