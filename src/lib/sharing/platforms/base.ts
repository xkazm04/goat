/**
 * Base Platform Adapter
 * Abstract base class for platform-specific sharing
 */

import type {
  SharePlatform,
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
  ShareResult,
} from '../types';

/**
 * Abstract base class for platform adapters
 */
export abstract class BasePlatformAdapter {
  /** Platform configuration */
  abstract readonly config: PlatformConfig;

  /** Platform capabilities */
  abstract readonly capabilities: PlatformCapabilities;

  /**
   * Optimize content for this platform
   */
  abstract optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent;

  /**
   * Build the share URL/intent
   */
  abstract buildShareUrl(content: OptimizedContent): string;

  /**
   * Execute the share action
   */
  async share(content: OptimizedContent): Promise<ShareResult> {
    try {
      const shareUrl = this.buildShareUrl(content);

      // Try deep link first on mobile
      if (this.config.urlScheme && this.isMobile() && !this.isForceWeb()) {
        const deepLinkResult = await this.tryDeepLink(content);
        if (deepLinkResult.success) {
          return deepLinkResult;
        }
      }

      // Fall back to web URL
      this.openShareWindow(shareUrl);

      return {
        success: true,
        platform: this.config.platform,
        fallbackUrl: shareUrl,
      };
    } catch (error) {
      return {
        success: false,
        platform: this.config.platform,
        error: error instanceof Error ? error.message : 'Share failed',
      };
    }
  }

  /**
   * Try to open via deep link
   */
  protected async tryDeepLink(content: OptimizedContent): Promise<ShareResult> {
    if (!this.config.urlScheme) {
      return {
        success: false,
        platform: this.config.platform,
        error: 'No deep link scheme available',
      };
    }

    const deepLink = this.buildDeepLink(content);

    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = 2500;

      // Create hidden iframe for deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const cleanup = () => {
        document.body.removeChild(iframe);
        window.removeEventListener('blur', onBlur);
        clearTimeout(fallbackTimer);
      };

      const onBlur = () => {
        // App opened successfully
        cleanup();
        resolve({
          success: true,
          platform: this.config.platform,
          deepLink,
        });
      };

      const fallbackTimer = setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          platform: this.config.platform,
          error: 'Deep link timeout',
        });
      }, timeout);

      window.addEventListener('blur', onBlur);
      iframe.src = deepLink;
    });
  }

  /**
   * Build deep link URL for app
   */
  protected buildDeepLink(_content: OptimizedContent): string {
    // Override in subclasses for platform-specific deep links
    return '';
  }

  /**
   * Open share window/tab
   */
  protected openShareWindow(url: string): void {
    if (typeof window === 'undefined') return;

    const width = 600;
    const height = 500;
    const left = (window.innerWidth - width) / 2 + window.screenX;
    const top = (window.innerHeight - height) / 2 + window.screenY;

    window.open(
      url,
      `share-${this.config.platform}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  /**
   * Check if on mobile device
   */
  protected isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  /**
   * Check if force web mode
   */
  protected isForceWeb(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('force_web') === 'true';
  }

  /**
   * Truncate text to fit platform limits
   */
  protected truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Format hashtags for platform
   */
  protected formatHashtags(hashtags: string[], max: number): string {
    const limited = hashtags.slice(0, max);
    return limited.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ');
  }

  /**
   * Calculate remaining characters after URL and hashtags
   */
  protected calculateRemainingChars(
    text: string,
    url: string,
    hashtags: string,
    maxLength: number,
    urlLength: number = 23 // Twitter's t.co length
  ): number {
    const totalUsed = urlLength + (hashtags ? hashtags.length + 1 : 0) + 1; // +1 for spaces
    return maxLength - totalUsed - text.length;
  }
}
