/**
 * Embeddable Widget Types
 * Type definitions for the ranking widget embed system
 */

/**
 * Widget size presets
 */
export type WidgetSize = 'compact' | 'standard' | 'full';

/**
 * Widget theme options
 */
export type WidgetTheme = 'light' | 'dark' | 'auto' | 'custom';

/**
 * Widget display style
 */
export type WidgetDisplayStyle = 'list' | 'grid' | 'podium' | 'minimal';

/**
 * Widget dimensions by size
 */
export const WIDGET_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  compact: { width: 320, height: 200 },
  standard: { width: 400, height: 400 },
  full: { width: 600, height: 600 },
};

/**
 * Widget configuration
 */
export interface WidgetConfig {
  /** The list ID to embed */
  listId: string;
  /** Widget size preset */
  size: WidgetSize;
  /** Theme setting */
  theme: WidgetTheme;
  /** Custom theme colors (when theme is 'custom') */
  customColors?: CustomThemeColors;
  /** Display style */
  displayStyle: WidgetDisplayStyle;
  /** Number of items to show */
  itemCount: number;
  /** Show ranking numbers */
  showRanks: boolean;
  /** Show item images */
  showImages: boolean;
  /** Show list title */
  showTitle: boolean;
  /** Show "Powered by GOAT" branding */
  showBranding: boolean;
  /** Enable interactivity (hover effects, click-through) */
  interactive: boolean;
  /** Custom border radius */
  borderRadius?: number;
  /** Widget locale */
  locale?: string;
}

/**
 * Custom theme color configuration
 */
export interface CustomThemeColors {
  /** Background color */
  background: string;
  /** Surface/card color */
  surface: string;
  /** Primary text color */
  text: string;
  /** Secondary text color */
  textSecondary: string;
  /** Accent/highlight color */
  accent: string;
  /** Border color */
  border: string;
}

/**
 * Default theme presets
 */
export const THEME_PRESETS: Record<'light' | 'dark', CustomThemeColors> = {
  light: {
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#1a1a2e',
    textSecondary: '#6c757d',
    accent: '#e94560',
    border: '#e9ecef',
  },
  dark: {
    background: '#1a1a2e',
    surface: '#16213e',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    accent: '#e94560',
    border: '#2d4059',
  },
};

/**
 * Default widget configuration
 */
export const DEFAULT_WIDGET_CONFIG: Omit<WidgetConfig, 'listId'> = {
  size: 'standard',
  theme: 'dark',
  displayStyle: 'list',
  itemCount: 5,
  showRanks: true,
  showImages: true,
  showTitle: true,
  showBranding: true,
  interactive: true,
  borderRadius: 12,
};

/**
 * Embed code output format
 */
export type EmbedFormat = 'iframe' | 'script' | 'oembed';

/**
 * Generated embed code
 */
export interface EmbedCode {
  /** Format type */
  format: EmbedFormat;
  /** The embed code string */
  code: string;
  /** Preview URL */
  previewUrl: string;
  /** Direct link to full ranking */
  fullUrl: string;
}

/**
 * oEmbed response format
 * Following the oEmbed specification: https://oembed.com/
 */
export interface OEmbedResponse {
  /** The resource type (always 'rich' for widgets) */
  type: 'rich';
  /** oEmbed format version */
  version: '1.0';
  /** Title of the ranking */
  title: string;
  /** Author/creator name */
  author_name?: string;
  /** Author URL */
  author_url?: string;
  /** Provider name */
  provider_name: 'GOAT Rankings';
  /** Provider URL */
  provider_url: string;
  /** Cache duration in seconds */
  cache_age?: number;
  /** Thumbnail URL */
  thumbnail_url?: string;
  /** Thumbnail width */
  thumbnail_width?: number;
  /** Thumbnail height */
  thumbnail_height?: number;
  /** Widget HTML */
  html: string;
  /** Widget width */
  width: number;
  /** Widget height */
  height: number;
}

/**
 * Widget analytics event
 */
export interface WidgetAnalyticsEvent {
  /** Event type */
  type: 'impression' | 'interaction' | 'click_through' | 'share';
  /** List ID */
  listId: string;
  /** Widget configuration hash */
  configHash: string;
  /** Referring domain */
  referrer?: string;
  /** Timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Widget data for rendering
 */
export interface WidgetData {
  /** List metadata */
  list: {
    id: string;
    title: string;
    category: string;
    subcategory?: string;
    createdAt: string;
    author?: {
      name: string;
      avatar?: string;
    };
  };
  /** Ranked items to display */
  items: WidgetItem[];
  /** Total item count */
  totalItems: number;
  /** Full ranking URL */
  fullUrl: string;
}

/**
 * Individual item in widget
 */
export interface WidgetItem {
  /** Position/rank */
  rank: number;
  /** Item title */
  title: string;
  /** Item subtitle/description */
  subtitle?: string;
  /** Image URL */
  imageUrl?: string;
  /** Score (if applicable) */
  score?: number;
}

/**
 * PostMessage communication types for widget
 */
export type WidgetMessage =
  | { type: 'ready' }
  | { type: 'resize'; width: number; height: number }
  | { type: 'click'; itemRank: number; itemTitle: string }
  | { type: 'navigate'; url: string }
  | { type: 'analytics'; event: WidgetAnalyticsEvent };

/**
 * Parent page message types
 */
export type ParentMessage =
  | { type: 'config'; config: Partial<WidgetConfig> }
  | { type: 'theme'; theme: WidgetTheme; customColors?: CustomThemeColors };
