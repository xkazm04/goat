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
  WidgetData,
  WidgetItem,
  WidgetMessage,
  ParentMessage,
} from './types';

export {
  WIDGET_DIMENSIONS,
  WIDGET_SIZES,
  WIDGET_THEMES,
  WIDGET_DISPLAY_STYLES,
  WIDGET_ITEM_COUNT,
  WIDGET_DEFAULT_BORDER_RADIUS,
  THEME_PRESETS,
  DEFAULT_WIDGET_CONFIG,
  normalizeWidgetConfig,
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

