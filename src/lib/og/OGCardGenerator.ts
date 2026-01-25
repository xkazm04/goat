/**
 * OGCardGenerator
 * Core module for generating dynamic Open Graph card images
 * Supports multiple layouts, themes, and platform optimizations
 */

import type {
  OGCardData,
  OGCardOptions,
  OGCardLayout,
  OGCardTheme,
  OGMetadata,
  SocialPlatform,
  CardDimensions,
} from './types';
import {
  DEFAULT_THEME,
  DEFAULT_OG_OPTIONS,
  PLATFORM_DIMENSIONS,
} from './types';

/**
 * Hash function for cache invalidation
 */
export function hashData(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a unique cache key for OG card
 */
export function generateCacheKey(shareCode: string, options: OGCardOptions): string {
  const optionsHash = hashData({
    layout: options.layout,
    platform: options.platform,
    maxItems: options.maxItems,
    showImages: options.showImages,
  });
  return `og_${shareCode}_${optionsHash}`;
}

/**
 * Get dimensions for target platform
 */
export function getDimensionsForPlatform(platform: SocialPlatform): CardDimensions {
  return PLATFORM_DIMENSIONS[platform] || PLATFORM_DIMENSIONS.default;
}

/**
 * Get medal color based on position
 */
export function getMedalColor(position: number, theme: OGCardTheme): string {
  if (position === 1) return theme.goldColor;
  if (position === 2) return theme.silverColor;
  if (position === 3) return theme.bronzeColor;
  return theme.textMuted;
}

/**
 * Get medal background gradient based on position
 */
export function getMedalGradient(position: number, theme: OGCardTheme): string {
  if (position === 1) {
    return `linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(250, 204, 21, 0.05) 100%)`;
  }
  if (position === 2) {
    return `linear-gradient(135deg, rgba(226, 232, 240, 0.1) 0%, rgba(226, 232, 240, 0.03) 100%)`;
  }
  if (position === 3) {
    return `linear-gradient(135deg, rgba(180, 83, 9, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)`;
  }
  return 'rgba(255, 255, 255, 0.03)';
}

/**
 * Get border color based on position
 */
export function getMedalBorder(position: number, theme: OGCardTheme): string {
  if (position === 1) return `1px solid rgba(250, 204, 21, 0.3)`;
  if (position === 2) return `1px solid rgba(226, 232, 240, 0.2)`;
  if (position === 3) return `1px solid rgba(180, 83, 9, 0.3)`;
  return `1px solid ${theme.borderColor}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format view count for display
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

/**
 * Generate OG metadata tags for HTML head
 */
export function generateOGMetadata(
  data: OGCardData,
  imageUrl: string,
  shareUrl: string,
  options: Partial<OGCardOptions> = {}
): OGMetadata {
  const itemCount = data.totalItems || data.items.length;
  const description = data.items.slice(0, 3)
    .map((item, i) => `${i + 1}. ${item.title}`)
    .join(' • ');

  const fullDescription = itemCount > 3
    ? `${description} and ${itemCount - 3} more...`
    : description;

  const metadata: OGMetadata = {
    title: data.title,
    description: fullDescription,
    image: imageUrl,
    url: shareUrl,
    siteName: 'G.O.A.T.',
    type: 'website',
    locale: 'en_US',
    twitter: {
      card: 'summary_large_image',
      site: '@goat_rankings',
      title: data.title,
      description: fullDescription,
      image: imageUrl,
      imageAlt: `${data.title} - Top ${itemCount} ranking`,
    },
    custom: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/png',
    },
  };

  // Add creator info if available
  if (data.username) {
    metadata.twitter!.creator = `@${data.username}`;
    metadata.custom!['article:author'] = data.username;
  }

  return metadata;
}

/**
 * Generate HTML meta tags from OG metadata
 */
export function generateMetaTags(metadata: OGMetadata): string {
  const tags: string[] = [];

  // Basic OG tags
  tags.push(`<meta property="og:title" content="${escapeHtml(metadata.title)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(metadata.description)}" />`);
  tags.push(`<meta property="og:image" content="${metadata.image}" />`);
  tags.push(`<meta property="og:url" content="${metadata.url}" />`);

  if (metadata.siteName) {
    tags.push(`<meta property="og:site_name" content="${escapeHtml(metadata.siteName)}" />`);
  }
  if (metadata.type) {
    tags.push(`<meta property="og:type" content="${metadata.type}" />`);
  }
  if (metadata.locale) {
    tags.push(`<meta property="og:locale" content="${metadata.locale}" />`);
  }

  // Twitter tags
  if (metadata.twitter) {
    tags.push(`<meta name="twitter:card" content="${metadata.twitter.card}" />`);
    if (metadata.twitter.site) {
      tags.push(`<meta name="twitter:site" content="${metadata.twitter.site}" />`);
    }
    if (metadata.twitter.creator) {
      tags.push(`<meta name="twitter:creator" content="${metadata.twitter.creator}" />`);
    }
    if (metadata.twitter.title) {
      tags.push(`<meta name="twitter:title" content="${escapeHtml(metadata.twitter.title)}" />`);
    }
    if (metadata.twitter.description) {
      tags.push(`<meta name="twitter:description" content="${escapeHtml(metadata.twitter.description)}" />`);
    }
    if (metadata.twitter.image) {
      tags.push(`<meta name="twitter:image" content="${metadata.twitter.image}" />`);
    }
    if (metadata.twitter.imageAlt) {
      tags.push(`<meta name="twitter:image:alt" content="${escapeHtml(metadata.twitter.imageAlt)}" />`);
    }
  }

  // Custom tags
  if (metadata.custom) {
    for (const [key, value] of Object.entries(metadata.custom)) {
      const isProperty = key.startsWith('og:') || key.startsWith('article:');
      tags.push(`<meta ${isProperty ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}" />`);
    }
  }

  return tags.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * OGCardGenerator class for managing OG card generation
 */
export class OGCardGenerator {
  private readonly defaultOptions: OGCardOptions;
  private readonly baseUrl: string;

  constructor(baseUrl: string, defaultOptions: Partial<OGCardOptions> = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = { ...DEFAULT_OG_OPTIONS, ...defaultOptions };
  }

  /**
   * Get the OG image URL for a share code
   */
  getImageUrl(
    shareCode: string,
    options: Partial<OGCardOptions> = {}
  ): string {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const params = new URLSearchParams({
      code: shareCode,
      layout: mergedOptions.layout,
      platform: mergedOptions.platform,
    });

    if (mergedOptions.maxItems !== this.defaultOptions.maxItems) {
      params.set('maxItems', String(mergedOptions.maxItems));
    }
    if (!mergedOptions.showImages) {
      params.set('showImages', 'false');
    }

    return `${this.baseUrl}/api/og/${shareCode}?${params.toString()}`;
  }

  /**
   * Get share URL for a share code
   */
  getShareUrl(shareCode: string): string {
    return `${this.baseUrl}/share/${shareCode}`;
  }

  /**
   * Generate full OG metadata for a ranking
   */
  generateMetadata(
    data: OGCardData,
    shareCode: string,
    options: Partial<OGCardOptions> = {}
  ): OGMetadata {
    const imageUrl = this.getImageUrl(shareCode, options);
    const shareUrl = this.getShareUrl(shareCode);
    return generateOGMetadata(data, imageUrl, shareUrl, options);
  }

  /**
   * Get the optimal layout for given data
   */
  suggestLayout(data: OGCardData): OGCardLayout {
    const itemCount = data.items.length;
    const hasImages = data.items.some(item => item.imageUrl);

    // Featured layout for lists with few high-profile items
    if (itemCount <= 3 && hasImages) {
      return 'featured';
    }

    // Grid layout for items with images
    if (hasImages && itemCount >= 4) {
      return 'grid';
    }

    // Compact layout for long lists
    if (itemCount > 10) {
      return 'compact';
    }

    // Default to list layout
    return 'list';
  }

  /**
   * Validate OG card data
   */
  validateData(data: OGCardData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (!data.category || data.category.trim().length === 0) {
      errors.push('Category is required');
    }
    if (!data.items || data.items.length === 0) {
      errors.push('At least one item is required');
    }

    // Validate items
    data.items.forEach((item, index) => {
      if (!item.title || item.title.trim().length === 0) {
        errors.push(`Item ${index + 1} is missing a title`);
      }
      if (typeof item.position !== 'number' || item.position < 1) {
        errors.push(`Item ${index + 1} has an invalid position`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create a singleton OG card generator
 */
let generatorInstance: OGCardGenerator | null = null;

export function getOGCardGenerator(): OGCardGenerator {
  if (!generatorInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';
    generatorInstance = new OGCardGenerator(baseUrl);
  }
  return generatorInstance;
}
