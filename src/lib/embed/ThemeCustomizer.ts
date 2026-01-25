/**
 * ThemeCustomizer
 * Widget theme customization utilities
 * Handles theme generation, color manipulation, and CSS variable output
 */

import {
  WidgetTheme,
  CustomThemeColors,
  THEME_PRESETS,
  WidgetConfig,
} from './types';

/**
 * Color manipulation utilities
 */
export class ColorUtils {
  /**
   * Parse hex color to RGB
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  /**
   * Convert RGB to hex
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Convert RGB to HSL
   */
  static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * Convert HSL to RGB
   */
  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  /**
   * Adjust color lightness
   */
  static adjustLightness(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.max(0, Math.min(100, hsl.l + amount));

    const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  }

  /**
   * Get relative luminance for WCAG contrast calculation
   */
  static getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate WCAG contrast ratio
   */
  static getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if color is dark
   */
  static isDark(hex: string): boolean {
    return this.getRelativeLuminance(hex) < 0.5;
  }
}

/**
 * ThemeCustomizer class
 * Generates and manages widget themes
 */
export class ThemeCustomizer {
  private config: WidgetConfig;
  private colors: CustomThemeColors;

  constructor(config: WidgetConfig) {
    this.config = config;
    this.colors = this.resolveColors();
  }

  /**
   * Resolve theme colors based on config
   */
  private resolveColors(): CustomThemeColors {
    if (this.config.theme === 'custom' && this.config.customColors) {
      return this.config.customColors;
    }

    if (this.config.theme === 'auto') {
      // Default to dark for auto (could check prefers-color-scheme on client)
      return THEME_PRESETS.dark;
    }

    return THEME_PRESETS[this.config.theme as 'light' | 'dark'] || THEME_PRESETS.dark;
  }

  /**
   * Get current theme colors
   */
  getColors(): CustomThemeColors {
    return { ...this.colors };
  }

  /**
   * Generate CSS variables for the theme
   */
  generateCSSVariables(): string {
    const vars: Record<string, string> = {
      '--widget-bg': this.colors.background,
      '--widget-surface': this.colors.surface,
      '--widget-text': this.colors.text,
      '--widget-text-secondary': this.colors.textSecondary,
      '--widget-accent': this.colors.accent,
      '--widget-border': this.colors.border,
      '--widget-border-radius': `${this.config.borderRadius || 12}px`,
      '--widget-shadow': ColorUtils.isDark(this.colors.background)
        ? '0 4px 20px rgba(0, 0, 0, 0.4)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)',
    };

    // Generate hover states
    vars['--widget-surface-hover'] = ColorUtils.adjustLightness(
      this.colors.surface,
      ColorUtils.isDark(this.colors.surface) ? 5 : -5
    );
    vars['--widget-accent-hover'] = ColorUtils.adjustLightness(
      this.colors.accent,
      ColorUtils.isDark(this.colors.accent) ? 10 : -10
    );

    return Object.entries(vars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n  ');
  }

  /**
   * Generate inline style object
   */
  generateStyleObject(): Record<string, string> {
    return {
      '--widget-bg': this.colors.background,
      '--widget-surface': this.colors.surface,
      '--widget-text': this.colors.text,
      '--widget-text-secondary': this.colors.textSecondary,
      '--widget-accent': this.colors.accent,
      '--widget-border': this.colors.border,
      '--widget-border-radius': `${this.config.borderRadius || 12}px`,
    };
  }

  /**
   * Generate complete widget CSS
   */
  generateWidgetCSS(): string {
    const cssVars = this.generateCSSVariables();
    const isDark = ColorUtils.isDark(this.colors.background);

    return `
      :root {
        ${cssVars}
      }

      .goat-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: var(--widget-bg);
        color: var(--widget-text);
        border-radius: var(--widget-border-radius);
        box-shadow: var(--widget-shadow);
        overflow: hidden;
        border: 1px solid var(--widget-border);
      }

      .goat-widget * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .goat-widget-header {
        padding: 16px;
        border-bottom: 1px solid var(--widget-border);
      }

      .goat-widget-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--widget-text);
        margin-bottom: 4px;
      }

      .goat-widget-subtitle {
        font-size: 12px;
        color: var(--widget-text-secondary);
      }

      .goat-widget-content {
        padding: 8px 0;
      }

      .goat-widget-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 12px;
        cursor: ${this.config.interactive ? 'pointer' : 'default'};
        transition: background 0.15s ease;
      }

      ${this.config.interactive ? `
      .goat-widget-item:hover {
        background: var(--widget-surface-hover);
      }
      ` : ''}

      .goat-widget-rank {
        font-size: 14px;
        font-weight: 700;
        color: var(--widget-accent);
        min-width: 24px;
        text-align: center;
      }

      .goat-widget-image {
        width: 40px;
        height: 40px;
        border-radius: 6px;
        object-fit: cover;
        background: var(--widget-surface);
      }

      .goat-widget-info {
        flex: 1;
        min-width: 0;
      }

      .goat-widget-item-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--widget-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .goat-widget-item-subtitle {
        font-size: 12px;
        color: var(--widget-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .goat-widget-footer {
        padding: 12px 16px;
        border-top: 1px solid var(--widget-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .goat-widget-cta {
        font-size: 12px;
        color: var(--widget-accent);
        text-decoration: none;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .goat-widget-cta:hover {
        text-decoration: underline;
      }

      .goat-widget-branding {
        font-size: 10px;
        color: var(--widget-text-secondary);
        text-decoration: none;
        opacity: 0.7;
      }

      .goat-widget-branding:hover {
        opacity: 1;
      }

      /* Compact size adjustments */
      .goat-widget--compact .goat-widget-header {
        padding: 12px;
      }

      .goat-widget--compact .goat-widget-item {
        padding: 6px 12px;
        gap: 8px;
      }

      .goat-widget--compact .goat-widget-image {
        width: 32px;
        height: 32px;
      }

      .goat-widget--compact .goat-widget-item-title {
        font-size: 13px;
      }

      .goat-widget--compact .goat-widget-footer {
        padding: 8px 12px;
      }

      /* Grid display style */
      .goat-widget--grid .goat-widget-content {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        padding: 12px;
      }

      .goat-widget--grid .goat-widget-item {
        flex-direction: column;
        padding: 8px;
        border-radius: 8px;
        background: var(--widget-surface);
      }

      .goat-widget--grid .goat-widget-image {
        width: 100%;
        height: auto;
        aspect-ratio: 1;
      }

      .goat-widget--grid .goat-widget-info {
        text-align: center;
        width: 100%;
      }

      /* Podium display style */
      .goat-widget--podium .goat-widget-content {
        display: flex;
        justify-content: center;
        align-items: flex-end;
        padding: 16px;
        gap: 8px;
      }

      .goat-widget--podium .goat-widget-item {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 12px;
        border-radius: 8px;
        background: var(--widget-surface);
      }

      .goat-widget--podium .goat-widget-item:nth-child(1) {
        order: 2;
        transform: scale(1.1);
      }

      .goat-widget--podium .goat-widget-item:nth-child(2) {
        order: 1;
      }

      .goat-widget--podium .goat-widget-item:nth-child(3) {
        order: 3;
      }

      /* Minimal display style */
      .goat-widget--minimal .goat-widget-header {
        display: none;
      }

      .goat-widget--minimal .goat-widget-item {
        padding: 6px 12px;
      }

      .goat-widget--minimal .goat-widget-footer {
        padding: 8px 12px;
      }

      /* Responsive adjustments */
      @media (max-width: 320px) {
        .goat-widget-item {
          padding: 6px 12px;
          gap: 8px;
        }

        .goat-widget-image {
          width: 32px;
          height: 32px;
        }
      }
    `.trim();
  }

  /**
   * Update theme
   */
  updateTheme(theme: WidgetTheme, customColors?: CustomThemeColors): void {
    this.config.theme = theme;
    if (customColors) {
      this.config.customColors = customColors;
    }
    this.colors = this.resolveColors();
  }

  /**
   * Validate custom colors
   */
  static validateColors(colors: Partial<CustomThemeColors>): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    const entries = Object.entries(colors);
    return entries.every(([, value]) => {
      if (typeof value !== 'string') return false;
      return hexRegex.test(value);
    });
  }

  /**
   * Generate accessible color palette from accent
   */
  static generatePaletteFromAccent(
    accent: string,
    isDark: boolean = true
  ): CustomThemeColors {
    const basePreset = isDark ? THEME_PRESETS.dark : THEME_PRESETS.light;

    return {
      ...basePreset,
      accent,
    };
  }

  /**
   * Get suggested accent colors
   */
  static getSuggestedAccents(): { name: string; color: string }[] {
    return [
      { name: 'Red', color: '#e94560' },
      { name: 'Blue', color: '#4361ee' },
      { name: 'Green', color: '#2ec4b6' },
      { name: 'Purple', color: '#7209b7' },
      { name: 'Orange', color: '#ff6b35' },
      { name: 'Pink', color: '#f72585' },
      { name: 'Teal', color: '#00b4d8' },
      { name: 'Yellow', color: '#ffc107' },
    ];
  }
}

/**
 * Create a theme customizer instance
 */
export function createThemeCustomizer(config: WidgetConfig): ThemeCustomizer {
  return new ThemeCustomizer(config);
}
