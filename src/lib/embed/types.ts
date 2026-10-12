/**
 * Embeddable Widget Types
 * Type definitions for the ranking widget embed system
 */

/**
 * Closed vocabularies. Each is the ONE authority for its axis: the type is
 * derived from the list, and `normalizeWidgetConfig` checks membership against
 * the list, so a value that reaches `WIDGET_DIMENSIONS[size]` is always a key.
 * Before 2026-09-05 the types were bare unions and the URL parsers cast
 * `params.get('size') as WidgetSize`, so `?size=huge` produced
 * `WIDGET_DIMENSIONS.huge` → undefined → TypeError in every embed generator.
 */
export const WIDGET_SIZES = ['compact', 'standard', 'full'] as const;
export const WIDGET_THEMES = ['light', 'dark', 'auto', 'custom'] as const;
export const WIDGET_DISPLAY_STYLES = ['list', 'grid', 'podium', 'minimal'] as const;

/**
 * Widget size presets
 */
export type WidgetSize = (typeof WIDGET_SIZES)[number];

/**
 * Widget theme options
 */
export type WidgetTheme = (typeof WIDGET_THEMES)[number];

/**
 * Widget display style
 */
export type WidgetDisplayStyle = (typeof WIDGET_DISPLAY_STYLES)[number];

/** Inclusive bounds for `itemCount`. Mirrors the clamp the embed route applies. */
export const WIDGET_ITEM_COUNT = { min: 1, max: 20 } as const;

/** Default corner radius (px); also what a non-numeric or negative `radius` falls back to. */
export const WIDGET_DEFAULT_BORDER_RADIUS = 12;

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
 * Default theme presets.
 *
 * `accent` and `textSecondary` are painted as TEXT (rank numbers, footer CTA,
 * 12px subtitles) on both `background` and `surface`, so each preset holds the
 * WCAG AA floor (4.5:1) for every text role on every surface — pinned by
 * theme-contrast.test.ts. Retuned 2026-09-05: the shared accent #e94560 read at
 * 3.83:1 on the light background and 4.46:1 on the dark one, and the light
 * secondary text at 4.45:1 on its surface.
 */
export const THEME_PRESETS: Record<'light' | 'dark', CustomThemeColors> = {
  light: {
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#1a1a2e',
    textSecondary: '#677078',
    accent: '#dc1a3a',
    border: '#e9ecef',
  },
  dark: {
    background: '#1a1a2e',
    surface: '#16213e',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    accent: '#ec5870',
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
  borderRadius: WIDGET_DEFAULT_BORDER_RADIUS,
};

const HEX_COLOR = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function oneOf<T extends readonly string[]>(list: T, value: unknown, fallback: T[number]): T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function normalizeRadius(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : WIDGET_DEFAULT_BORDER_RADIUS;
}

/**
 * Coerce an untrusted, partial config (URL params, a caller's options object)
 * into a `WidgetConfig` whose every field is a member of its vocabulary.
 *
 * - enum fields outside their list fall back to `DEFAULT_WIDGET_CONFIG`
 * - `itemCount` is clamped to `WIDGET_ITEM_COUNT`; non-numeric → default
 * - `borderRadius` non-numeric or negative → `WIDGET_DEFAULT_BORDER_RADIUS`
 * - `theme: 'custom'` without six valid hex colors falls back to the default
 *   theme, because the custom palette is what that theme *means*
 *
 * This is the single normalizer for the config vocabulary. Parsers build a
 * `Partial` and hand it here rather than casting.
 */
export function normalizeWidgetConfig(
  input: Partial<Omit<WidgetConfig, 'listId'>> & { listId: string }
): WidgetConfig {
  const d = DEFAULT_WIDGET_CONFIG;
  const theme = oneOf(WIDGET_THEMES, input.theme, d.theme);
  const colors = input.customColors;
  const colorsValid =
    !!colors &&
    (['background', 'surface', 'text', 'textSecondary', 'accent', 'border'] as const).every(
      (k) => typeof colors[k] === 'string' && HEX_COLOR.test(colors[k])
    );

  const config: WidgetConfig = {
    listId: input.listId,
    size: oneOf(WIDGET_SIZES, input.size, d.size),
    theme: theme === 'custom' && !colorsValid ? d.theme : theme,
    displayStyle: oneOf(WIDGET_DISPLAY_STYLES, input.displayStyle, d.displayStyle),
    itemCount: clampInt(input.itemCount, WIDGET_ITEM_COUNT.min, WIDGET_ITEM_COUNT.max, d.itemCount),
    showRanks: input.showRanks ?? d.showRanks,
    showImages: input.showImages ?? d.showImages,
    showTitle: input.showTitle ?? d.showTitle,
    showBranding: input.showBranding ?? d.showBranding,
    interactive: input.interactive ?? d.interactive,
    borderRadius: normalizeRadius(input.borderRadius),
  };

  if (config.theme === 'custom' && colorsValid) config.customColors = colors;
  if (input.locale) config.locale = input.locale;

  return config;
}

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
