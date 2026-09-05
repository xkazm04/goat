/**
 * EmbedCodeGenerator
 * Generates embed codes for widgets in various formats
 */

import { getBaseUrl, getShareUrl, getOGImageUrl } from '@/lib/sharing/share-urls';

import {
  WidgetConfig,
  EmbedCode,
  EmbedFormat,
  WIDGET_DIMENSIONS,
  WIDGET_DEFAULT_BORDER_RADIUS,
  normalizeWidgetConfig,
} from './types';

/**
 * A list id is DATA. Every snippet below puts it into a slot with its own
 * grammar — a URL path segment, an HTML attribute, a JS string literal, a
 * shortcode attribute — and each slot gets the encoding that slot needs.
 * Ids are UUIDs today; the guard is for the day they are not.
 */
// RFC 3986 strict: encodeURIComponent leaves !'()* alone, and a bare ")" is
// exactly the byte that closes a markdown link.
const encodePathSegment = (s: string): string =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Token safe for an HTML id attribute AND a single-quoted JS string. */
const elementToken = (s: string): string => encodeURIComponent(s).replace(/[^A-Za-z0-9_-]/g, '_');

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

  if (config.borderRadius !== undefined && config.borderRadius !== WIDGET_DEFAULT_BORDER_RADIUS) {
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
  return getShareUrl(encodePathSegment(listId));
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
  const mount = `goat-widget-${elementToken(config.listId)}`;

  return `<div id="${mount}" data-goat-widget></div>
<script>
(function() {
  var d = document;
  var s = d.createElement('script');
  s.src = '${baseUrl}/widget.js';
  s.async = true;
  s.dataset.config = '${params.toString()}';
  s.dataset.width = '${dimensions.width}';
  s.dataset.height = '${dimensions.height}';
  d.getElementById('${mount}').appendChild(s);
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
  return `[goat_ranking id="${escapeAttr(config.listId)}" width="${dimensions.width}" height="${dimensions.height}" theme="${config.theme}"]`;
}

/**
 * Generate Markdown embed (for GitHub, etc.)
 */
export function generateMarkdownEmbed(config: WidgetConfig): string {
  const fullUrl = generateFullUrl(config.listId);
  return `[![GOAT Ranking](${getOGImageUrl(encodePathSegment(config.listId))})](${fullUrl})`;
}

/**
 * EmbedCodeGenerator class
 * Generates all embed code formats
 */
export class EmbedCodeGenerator {
  private config: WidgetConfig;

  constructor(listId: string, options: Partial<Omit<WidgetConfig, 'listId'>> = {}) {
    this.config = normalizeWidgetConfig({ listId, ...options });
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
    this.config = normalizeWidgetConfig({ ...this.config, ...options });
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

    // Read raw strings here; membership, clamping and the custom-palette rule
    // are the normalizer's job, so a hostile URL cannot yield a config that
    // indexes WIDGET_DIMENSIONS with a key that does not exist.
    const raw: Parameters<typeof normalizeWidgetConfig>[0] = {
      listId,
      size: (params.get('size') ?? undefined) as WidgetConfig['size'] | undefined,
      theme: (params.get('theme') ?? undefined) as WidgetConfig['theme'] | undefined,
      displayStyle: (params.get('display') ?? undefined) as WidgetConfig['displayStyle'] | undefined,
      itemCount: params.has('count') ? Number.parseInt(params.get('count')!, 10) : undefined,
      showRanks: params.get('ranks') !== '0',
      showImages: params.get('images') !== '0',
      showTitle: params.get('title') !== '0',
      showBranding: params.get('branding') !== '0',
      interactive: params.get('interactive') !== '0',
      borderRadius: params.has('radius') ? Number.parseInt(params.get('radius')!, 10) : undefined,
    };

    const locale = params.get('locale');
    if (locale) raw.locale = locale;

    const colorsStr = params.get('colors');
    if (colorsStr) {
      const colors = colorsStr.split('-').map(c => `#${c}`);
      if (colors.length === 6) {
        raw.customColors = {
          background: colors[0],
          surface: colors[1],
          text: colors[2],
          textSecondary: colors[3],
          accent: colors[4],
          border: colors[5],
        };
      }
    }

    return normalizeWidgetConfig(raw);
  } catch {
    return null;
  }
}
