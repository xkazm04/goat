/**
 * OG Card Types and Constants
 * Type definitions for dynamic Open Graph card generation
 */

/**
 * Card layout types available for OG image generation
 */
export type OGCardLayout = 'list' | 'grid' | 'featured' | 'minimal' | 'compact';

/**
 * Platform-specific card types
 */
export type SocialPlatform = 'twitter' | 'facebook' | 'discord' | 'linkedin' | 'default';

/**
 * Card dimensions for different platforms
 */
export interface CardDimensions {
  width: number;
  height: number;
  aspectRatio: string;
}

/**
 * Platform-specific OG card configurations
 */
export const PLATFORM_DIMENSIONS: Record<SocialPlatform, CardDimensions> = {
  twitter: { width: 1200, height: 628, aspectRatio: '1.91:1' },
  facebook: { width: 1200, height: 630, aspectRatio: '1.91:1' },
  discord: { width: 1200, height: 630, aspectRatio: '1.91:1' },
  linkedin: { width: 1200, height: 627, aspectRatio: '1.91:1' },
  default: { width: 1200, height: 630, aspectRatio: '1.91:1' },
};

/**
 * Twitter card types
 */
export type TwitterCardType = 'summary' | 'summary_large_image' | 'player';

/**
 * OG card theme configuration
 */
export interface OGCardTheme {
  /** Primary background gradient */
  backgroundGradient: string;
  /** Primary accent color */
  accentColor: string;
  /** Secondary accent color */
  secondaryAccent: string;
  /** Text colors */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Medal colors for top 3 */
  goldColor: string;
  silverColor: string;
  bronzeColor: string;
  /** Border colors */
  borderColor: string;
  borderAccent: string;
}

/**
 * Default dark theme for OG cards
 */
export const DEFAULT_THEME: OGCardTheme = {
  backgroundGradient: 'linear-gradient(135deg, #0f1423 0%, #1a1f35 50%, #0f1423 100%)',
  accentColor: '#22d3ee',
  secondaryAccent: '#a78bfa',
  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  goldColor: '#facc15',
  silverColor: '#e2e8f0',
  bronzeColor: '#b45309',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderAccent: 'rgba(6, 182, 212, 0.3)',
};

/**
 * Vibrant theme for OG cards
 */
export const VIBRANT_THEME: OGCardTheme = {
  backgroundGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
  accentColor: '#f472b6',
  secondaryAccent: '#818cf8',
  textPrimary: '#ffffff',
  textSecondary: '#e0e7ff',
  textMuted: '#a5b4fc',
  goldColor: '#fbbf24',
  silverColor: '#f1f5f9',
  bronzeColor: '#d97706',
  borderColor: 'rgba(255, 255, 255, 0.15)',
  borderAccent: 'rgba(244, 114, 182, 0.4)',
};

/**
 * Minimal light theme for OG cards
 */
export const MINIMAL_THEME: OGCardTheme = {
  backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  accentColor: '#0891b2',
  secondaryAccent: '#7c3aed',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  goldColor: '#ca8a04',
  silverColor: '#475569',
  bronzeColor: '#92400e',
  borderColor: 'rgba(0, 0, 0, 0.1)',
  borderAccent: 'rgba(8, 145, 178, 0.3)',
};

/**
 * OG card data for rendering
 */
export interface OGCardData {
  /** Card title (list name) */
  title: string;
  /** Category name */
  category: string;
  /** Optional subcategory */
  subcategory?: string;
  /** Time period (e.g., "2024", "All Time") */
  timePeriod?: string;
  /** Ranked items to display */
  items: OGCardItem[];
  /** Creator username */
  username?: string;
  /** Creator avatar URL */
  avatarUrl?: string;
  /** Total item count (if more than displayed) */
  totalItems?: number;
  /** View count for social proof */
  viewCount?: number;
  /** Challenge count */
  challengeCount?: number;
  /** Share code for the card */
  shareCode?: string;
  /** When the ranking was created */
  createdAt?: string;
}

/**
 * Individual item in OG card
 */
export interface OGCardItem {
  /** Position/rank */
  position: number;
  /** Item title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Item image URL */
  imageUrl?: string;
  /** Score if applicable */
  score?: number;
}

/**
 * OG card generation options
 */
export interface OGCardOptions {
  /** Card layout style */
  layout: OGCardLayout;
  /** Target platform */
  platform: SocialPlatform;
  /** Theme to use */
  theme?: OGCardTheme;
  /** Number of items to show */
  maxItems?: number;
  /** Show item images */
  showImages?: boolean;
  /** Show social proof (views, challenges) */
  showSocialProof?: boolean;
  /** Show creator info */
  showCreator?: boolean;
  /** Custom branding text */
  brandingText?: string;
  /** Call to action text */
  ctaText?: string;
}

/**
 * Default OG card options
 */
export const DEFAULT_OG_OPTIONS: OGCardOptions = {
  layout: 'list',
  platform: 'default',
  theme: DEFAULT_THEME,
  maxItems: 5,
  showImages: true,
  showSocialProof: false,
  showCreator: false,
  brandingText: 'G.O.A.T.',
  ctaText: 'Challenge this ranking',
};

/**
 * OG metadata for HTML head
 */
export interface OGMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName?: string;
  type?: string;
  locale?: string;
  /** Twitter-specific metadata */
  twitter?: {
    card: TwitterCardType;
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
  };
  /** Additional custom OG tags */
  custom?: Record<string, string>;
}

/**
 * Cache entry for OG cards
 */
export interface OGCacheEntry {
  /** Cache key (usually share code + options hash) */
  key: string;
  /** Generated image URL or base64 */
  imageUrl: string;
  /** When the cache entry was created */
  createdAt: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Hash of the source data for invalidation */
  dataHash: string;
  /** Associated metadata */
  metadata: OGMetadata;
}

/**
 * Cache configuration
 */
export interface OGCacheConfig {
  /** Maximum number of entries to cache */
  maxEntries: number;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Storage backend */
  storage: 'memory' | 'kv' | 'redis';
  /** Enable automatic cleanup */
  autoCleanup: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: OGCacheConfig = {
  maxEntries: 1000,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  storage: 'memory',
  autoCleanup: true,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
};

/**
 * Regeneration trigger event
 */
export interface RegenerationEvent {
  type: 'data_change' | 'manual' | 'cache_miss' | 'scheduled';
  shareCode: string;
  timestamp: number;
  reason?: string;
}
