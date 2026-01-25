/**
 * EmbedCodeGenerator
 * Generates embed codes for widgets in various formats
 */

import {
  WidgetConfig,
  EmbedCode,
  EmbedFormat,
  WIDGET_DIMENSIONS,
  DEFAULT_WIDGET_CONFIG,
} from './types';

/**
 * Base URL for the application
 * In production, this should be the actual domain
 */
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';
};

/**
 * Serialize config to URL parameters
 */
function configToParams(config: WidgetConfig): URLSearchParams {
  const params = new URLSearchParams();

  params.set('id', config.listId);
  params.set('size', config.size);
  params.set('theme', config.theme);
  params.set('display', config.displayStyle);
  params.set('count', config.itemCount.toString());

  if (!config.showRanks) params.set('ranks', '0');
  if (!config.showImages) params.set('images', '0');
  if (!config.showTitle) params.set('title', '0');
  if (!config.showBranding) params.set('branding', '0');
  if (!config.interactive) params.set('interactive', '0');

  if (config.borderRadius !== undefined && config.borderRadius !== 12) {
    params.set('radius', config.borderRadius.toString());
  }

  if (config.locale) {
    params.set('locale', config.locale);
  }

  if (config.theme === 'custom' && config.customColors) {
    // Encode custom colors as a compact string
    const colors = [
      config.customColors.background,
      config.customColors.surface,
      config.customColors.text,
      config.customColors.textSecondary,
      config.customColors.accent,
      config.customColors.border,
    ].map(c => c.replace('#', '')).join('-');
    params.set('colors', colors);
  }

  return params;
}

/**
 * Generate widget URL
 */
export function generateWidgetUrl(config: WidgetConfig): string {
  const baseUrl = getBaseUrl();
  const params = configToParams(config);
  return `${baseUrl}/api/embed?${params.toString()}`;
}

/**
 * Generate full ranking URL
 */
export function generateFullUrl(listId: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/share/${listId}`;
}

/**
 * Generate iframe embed code
 */
export function generateIframeEmbed(config: WidgetConfig): string {
  const url = generateWidgetUrl(config);
  const dimensions = WIDGET_DIMENSIONS[config.size];

  return `<iframe
  src="${url}"
  width="${dimensions.width}"
  height="${dimensions.height}"
  frameborder="0"
  scrolling="no"
  allow="clipboard-write"
  loading="lazy"
  style="border-radius: ${config.borderRadius || 12}px; max-width: 100%;"
  title="GOAT Rankings Widget"
></iframe>`.trim();
}

/**
 * Generate script embed code (for more dynamic embedding)
 */
export function generateScriptEmbed(config: WidgetConfig): string {
  const baseUrl = getBaseUrl();
  const params = configToParams(config);
  const dimensions = WIDGET_DIMENSIONS[config.size];

  return `<div id="goat-widget-${config.listId}" data-goat-widget></div>
<script>
(function() {
  var d = document;
  var s = d.createElement('script');
  s.src = '${baseUrl}/widget.js';
  s.async = true;
  s.dataset.config = '${params.toString()}';
  s.dataset.width = '${dimensions.width}';
  s.dataset.height = '${dimensions.height}';
  d.getElementById('goat-widget-${config.listId}').appendChild(s);
})();
</script>`.trim();
}

/**
 * Generate oEmbed URL
 */
export function generateOEmbedUrl(config: WidgetConfig): string {
  const baseUrl = getBaseUrl();
  const fullUrl = generateFullUrl(config.listId);
  const params = new URLSearchParams({
    url: fullUrl,
    format: 'json',
    maxwidth: WIDGET_DIMENSIONS[config.size].width.toString(),
    maxheight: WIDGET_DIMENSIONS[config.size].height.toString(),
  });
  return `${baseUrl}/api/oembed?${params.toString()}`;
}

/**
 * Generate WordPress shortcode
 */
export function generateWordPressShortcode(config: WidgetConfig): string {
  const dimensions = WIDGET_DIMENSIONS[config.size];
  return `[goat_ranking id="${config.listId}" width="${dimensions.width}" height="${dimensions.height}" theme="${config.theme}"]`;
}

/**
 * Generate Markdown embed (for GitHub, etc.)
 */
export function generateMarkdownEmbed(config: WidgetConfig): string {
  const fullUrl = generateFullUrl(config.listId);
  const baseUrl = getBaseUrl();
  return `[![GOAT Ranking](${baseUrl}/api/og/${config.listId})](${fullUrl})`;
}

/**
 * EmbedCodeGenerator class
 * Generates all embed code formats
 */
export class EmbedCodeGenerator {
  private config: WidgetConfig;

  constructor(listId: string, options: Partial<Omit<WidgetConfig, 'listId'>> = {}) {
    this.config = {
      listId,
      ...DEFAULT_WIDGET_CONFIG,
      ...options,
    };
  }

  /**
   * Get widget URL
   */
  getWidgetUrl(): string {
    return generateWidgetUrl(this.config);
  }

  /**
   * Get full ranking URL
   */
  getFullUrl(): string {
    return generateFullUrl(this.config.listId);
  }

  /**
   * Get oEmbed URL
   */
  getOEmbedUrl(): string {
    return generateOEmbedUrl(this.config);
  }

  /**
   * Generate embed code for specified format
   */
  generate(format: EmbedFormat): EmbedCode {
    const widgetUrl = generateWidgetUrl(this.config);
    const fullUrl = generateFullUrl(this.config.listId);

    let code: string;

    switch (format) {
      case 'iframe':
        code = generateIframeEmbed(this.config);
        break;
      case 'script':
        code = generateScriptEmbed(this.config);
        break;
      case 'oembed':
        code = generateOEmbedUrl(this.config);
        break;
      default:
        code = generateIframeEmbed(this.config);
    }

    return {
      format,
      code,
      previewUrl: widgetUrl,
      fullUrl,
    };
  }

  /**
   * Generate all embed formats
   */
  generateAll(): Record<EmbedFormat, EmbedCode> {
    return {
      iframe: this.generate('iframe'),
      script: this.generate('script'),
      oembed: this.generate('oembed'),
    };
  }

  /**
   * Get responsive iframe code
   */
  getResponsiveEmbed(): string {
    const dimensions = WIDGET_DIMENSIONS[this.config.size];
    const aspectRatio = (dimensions.height / dimensions.width * 100).toFixed(2);
    const url = generateWidgetUrl(this.config);

    return `<div style="position: relative; padding-bottom: ${aspectRatio}%; max-width: ${dimensions.width}px;">
  <iframe
    src="${url}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: ${this.config.borderRadius || 12}px;"
    loading="lazy"
    title="GOAT Rankings Widget"
  ></iframe>
</div>`.trim();
  }

  /**
   * Get additional embed formats
   */
  getAdditionalFormats(): { name: string; code: string }[] {
    return [
      {
        name: 'WordPress Shortcode',
        code: generateWordPressShortcode(this.config),
      },
      {
        name: 'Markdown (GitHub)',
        code: generateMarkdownEmbed(this.config),
      },
      {
        name: 'Responsive Embed',
        code: this.getResponsiveEmbed(),
      },
      {
        name: 'Direct Link',
        code: generateFullUrl(this.config.listId),
      },
    ];
  }

  /**
   * Update configuration
   */
  updateConfig(options: Partial<WidgetConfig>): void {
    this.config = { ...this.config, ...options };
  }

  /**
   * Get current configuration
   */
  getConfig(): WidgetConfig {
    return { ...this.config };
  }

  /**
   * Get widget dimensions
   */
  getDimensions(): { width: number; height: number } {
    return WIDGET_DIMENSIONS[this.config.size];
  }
}

/**
 * Create an embed code generator instance
 */
export function createEmbedCodeGenerator(
  listId: string,
  options?: Partial<Omit<WidgetConfig, 'listId'>>
): EmbedCodeGenerator {
  return new EmbedCodeGenerator(listId, options);
}

/**
 * Parse embed URL back to config
 */
export function parseEmbedUrl(url: string): WidgetConfig | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const listId = params.get('id');
    if (!listId) return null;

    const config: WidgetConfig = {
      listId,
      size: (params.get('size') as WidgetConfig['size']) || 'standard',
      theme: (params.get('theme') as WidgetConfig['theme']) || 'dark',
      displayStyle: (params.get('display') as WidgetConfig['displayStyle']) || 'list',
      itemCount: parseInt(params.get('count') || '5', 10),
      showRanks: params.get('ranks') !== '0',
      showImages: params.get('images') !== '0',
      showTitle: params.get('title') !== '0',
      showBranding: params.get('branding') !== '0',
      interactive: params.get('interactive') !== '0',
      borderRadius: parseInt(params.get('radius') || '12', 10),
    };

    const locale = params.get('locale');
    if (locale) config.locale = locale;

    // Parse custom colors
    const colorsStr = params.get('colors');
    if (colorsStr && config.theme === 'custom') {
      const colors = colorsStr.split('-').map(c => `#${c}`);
      if (colors.length === 6) {
        config.customColors = {
          background: colors[0],
          surface: colors[1],
          text: colors[2],
          textSecondary: colors[3],
          accent: colors[4],
          border: colors[5],
        };
      }
    }

    return config;
  } catch {
    return null;
  }
}
