/**
 * Embed Module
 * Embeddable ranking widgets for external websites
 */

// Types
export type {
  WidgetSize,
  WidgetTheme,
  WidgetDisplayStyle,
  WidgetConfig,
  CustomThemeColors,
  EmbedFormat,
  EmbedCode,
  OEmbedResponse,
  WidgetAnalyticsEvent,
  WidgetData,
  WidgetItem,
  WidgetMessage,
  ParentMessage,
} from './types';

export {
  WIDGET_DIMENSIONS,
  THEME_PRESETS,
  DEFAULT_WIDGET_CONFIG,
} from './types';

// Theme Customizer
export {
  ThemeCustomizer,
  ColorUtils,
  createThemeCustomizer,
} from './ThemeCustomizer';

// Embed Code Generator
export {
  EmbedCodeGenerator,
  createEmbedCodeGenerator,
  generateWidgetUrl,
  generateFullUrl,
  generateIframeEmbed,
  generateScriptEmbed,
  generateOEmbedUrl,
  parseEmbedUrl,
} from './EmbedCodeGenerator';

// Widget Analytics
export {
  WidgetAnalytics,
  createWidgetAnalytics,
  trackServerImpression,
  getAnalyticsSummary,
  type WidgetAnalyticsSummary,
} from './WidgetAnalytics';
