/**
 * Sharing Types
 * Type definitions for multi-platform sharing
 */

/**
 * Supported sharing platforms
 */
export type SharePlatform =
  | 'twitter'
  | 'instagram'
  | 'tiktok'
  | 'reddit'
  | 'discord'
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'linkedin'
  | 'email'
  | 'copy'
  | 'native';

/**
 * Content type being shared
 */
export type ShareContentType = 'ranking' | 'challenge' | 'result' | 'profile' | 'list';

/**
 * Image format for platforms
 */
export type ImageFormat = 'square' | 'portrait' | 'landscape' | 'story';

/**
 * Share content configuration
 */
export interface ShareContent {
  /** Content type */
  type: ShareContentType;
  /** Title of the content */
  title: string;
  /** Description/text */
  description?: string;
  /** URL to share */
  url: string;
  /** Image URL */
  imageUrl?: string;
  /** Hashtags */
  hashtags?: string[];
  /** User handle/mention */
  via?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Platform-specific optimized content
 */
export interface OptimizedContent extends ShareContent {
  /** Optimized text for platform */
  text: string;
  /** Formatted hashtags */
  formattedHashtags: string;
  /** UTM-tagged URL */
  trackedUrl: string;
  /** Platform-optimized image URL */
  optimizedImageUrl?: string;
  /** Character count */
  characterCount: number;
  /** Whether content fits platform limits */
  fitsLimits: boolean;
}

/**
 * Platform configuration
 */
export interface PlatformConfig {
  /** Platform identifier */
  platform: SharePlatform;
  /** Display name */
  displayName: string;
  /** Icon name/component */
  icon: string;
  /** Primary color (hex) */
  color: string;
  /** Maximum text length */
  maxTextLength: number;
  /** Maximum hashtags */
  maxHashtags: number;
  /** Supported image formats */
  supportedImageFormats: ImageFormat[];
  /** Preferred image dimensions */
  imageDimensions: {
    width: number;
    height: number;
  };
  /** Whether platform supports direct share (vs intent URL) */
  supportsDirectShare: boolean;
  /** Whether platform requires authentication */
  requiresAuth: boolean;
  /** URL scheme for mobile deep link */
  urlScheme?: string;
  /** Web fallback URL template */
  webUrl: string;
}

/**
 * Share event for analytics
 */
export interface ShareEvent {
  /** Unique event ID */
  id: string;
  /** Platform shared to */
  platform: SharePlatform;
  /** Content type */
  contentType: ShareContentType;
  /** Content ID */
  contentId: string;
  /** User ID (if authenticated) */
  userId?: string;
  /** Timestamp */
  timestamp: string;
  /** Whether share was completed */
  completed: boolean;
  /** Referrer URL */
  referrer?: string;
  /** UTM parameters */
  utmParams?: {
    source: string;
    medium: string;
    campaign: string;
    content?: string;
    term?: string;
  };
  /** Device info */
  device?: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
  };
}

/**
 * Share result
 */
export interface ShareResult {
  /** Whether share was initiated */
  success: boolean;
  /** Platform shared to */
  platform: SharePlatform;
  /** Error message if failed */
  error?: string;
  /** Share event for tracking */
  event?: ShareEvent;
  /** Deep link used */
  deepLink?: string;
  /** Fallback URL used */
  fallbackUrl?: string;
}

/**
 * Share options
 */
export interface ShareOptions {
  /** Target platform */
  platform: SharePlatform;
  /** Content to share */
  content: ShareContent;
  /** Track analytics */
  trackAnalytics?: boolean;
  /** Force web fallback (no deep link) */
  forceWeb?: boolean;
  /** Custom UTM campaign */
  utmCampaign?: string;
  /** On share complete callback */
  onComplete?: (result: ShareResult) => void;
}

/**
 * Platform share capabilities
 */
export interface PlatformCapabilities {
  /** Can share text */
  text: boolean;
  /** Can share URL */
  url: boolean;
  /** Can share image */
  image: boolean;
  /** Can share video */
  video: boolean;
  /** Can share files */
  files: boolean;
  /** Supports rich previews */
  richPreview: boolean;
  /** Supports hashtags */
  hashtags: boolean;
  /** Supports mentions */
  mentions: boolean;
}

/**
 * Native Web Share API data
 */
export interface WebShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/**
 * Share analytics summary
 */
export interface ShareAnalyticsSummary {
  /** Total shares */
  totalShares: number;
  /** Shares by platform */
  byPlatform: Record<SharePlatform, number>;
  /** Shares by content type */
  byContentType: Record<ShareContentType, number>;
  /** Completion rate */
  completionRate: number;
  /** Top performing platform */
  topPlatform: SharePlatform;
  /** Period */
  period: {
    start: string;
    end: string;
  };
}
