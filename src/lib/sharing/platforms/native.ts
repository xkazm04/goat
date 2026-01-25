/**
 * Native Web Share API Adapter
 * Uses the browser's native share sheet
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
 * Check if Web Share API is available
 */
export function isWebShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * Check if Web Share API supports sharing files
 */
export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare;
}

/**
 * Native Web Share adapter
 */
export class NativeShareAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'native',
    displayName: 'Share',
    icon: 'share',
    color: '#3B82F6',
    maxTextLength: 10000, // No real limit
    maxHashtags: 0,
    supportedImageFormats: ['square', 'landscape', 'portrait'],
    imageDimensions: { width: 1200, height: 630 },
    supportsDirectShare: true,
    requiresAuth: false,
    webUrl: '',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: canShareFiles(),
    video: canShareFiles(),
    files: canShareFiles(),
    richPreview: true,
    hashtags: false,
    mentions: false,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    // For native share, we use a clean, simple format
    const parts: string[] = [];

    if (content.type === 'challenge') {
      parts.push(`${content.title}`);
      parts.push(content.description || 'Can you beat this ranking?');
    } else if (content.type === 'ranking' || content.type === 'result') {
      parts.push(`Check out my ${content.title}`);
      if (content.description) {
        parts.push(content.description);
      }
    } else {
      if (content.description) {
        parts.push(content.description);
      }
    }

    const text = parts.join('\n\n');

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

  buildShareUrl(_content: OptimizedContent): string {
    // Native share doesn't use URLs
    return '';
  }

  async share(content: OptimizedContent): Promise<ShareResult> {
    if (!isWebShareAvailable()) {
      return {
        success: false,
        platform: 'native',
        error: 'Web Share API not available',
      };
    }

    try {
      const shareData: ShareData = {
        title: content.title,
        text: content.text,
        url: content.trackedUrl,
      };

      // Try to share with files if available
      if (content.optimizedImageUrl && canShareFiles()) {
        try {
          const imageFile = await this.fetchAsFile(
            content.optimizedImageUrl,
            'ranking.png',
            'image/png'
          );

          if (imageFile && navigator.canShare({ files: [imageFile] })) {
            shareData.files = [imageFile];
          }
        } catch {
          // Ignore file sharing errors, proceed without image
        }
      }

      await navigator.share(shareData);

      return {
        success: true,
        platform: 'native',
      };
    } catch (error) {
      // User cancelled or error
      const errorMessage = error instanceof Error ? error.message : 'Share cancelled';

      // AbortError means user cancelled, which isn't really an error
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          platform: 'native',
          error: 'Share cancelled by user',
        };
      }

      return {
        success: false,
        platform: 'native',
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch a URL as a File object for sharing
   */
  private async fetchAsFile(
    url: string,
    filename: string,
    mimeType: string
  ): Promise<File | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: mimeType });
    } catch {
      return null;
    }
  }
}

export const nativeShareAdapter = new NativeShareAdapter();
