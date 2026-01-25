/**
 * Copy to Clipboard Adapter
 * Simple clipboard sharing
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
 * Copy to clipboard adapter
 */
export class CopyAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'copy',
    displayName: 'Copy Link',
    icon: 'copy',
    color: '#6B7280',
    maxTextLength: 10000,
    maxHashtags: 0,
    supportedImageFormats: [],
    imageDimensions: { width: 0, height: 0 },
    supportsDirectShare: true,
    requiresAuth: false,
    webUrl: '',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: false,
    video: false,
    files: false,
    richPreview: false,
    hashtags: false,
    mentions: false,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    // For copy, we can include full content or just URL
    const parts: string[] = [];

    parts.push(content.title);
    if (content.description) {
      parts.push(content.description);
    }
    parts.push('');
    parts.push(trackedUrl);

    const text = parts.join('\n');

    return {
      ...content,
      text,
      formattedHashtags: '',
      trackedUrl,
      optimizedImageUrl: undefined,
      characterCount: text.length,
      fitsLimits: true,
    };
  }

  buildShareUrl(_content: OptimizedContent): string {
    return '';
  }

  async share(content: OptimizedContent): Promise<ShareResult> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      // Fallback for older browsers
      return this.fallbackCopy(content.trackedUrl);
    }

    try {
      await navigator.clipboard.writeText(content.trackedUrl);

      return {
        success: true,
        platform: 'copy',
      };
    } catch {
      return this.fallbackCopy(content.trackedUrl);
    }
  }

  /**
   * Fallback copy using textarea
   */
  private fallbackCopy(text: string): ShareResult {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      return {
        success,
        platform: 'copy',
        error: success ? undefined : 'Copy failed',
      };
    } catch {
      return {
        success: false,
        platform: 'copy',
        error: 'Copy not supported',
      };
    }
  }
}

export const copyAdapter = new CopyAdapter();
