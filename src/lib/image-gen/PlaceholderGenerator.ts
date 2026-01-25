/**
 * PlaceholderGenerator
 * Generates visually appealing placeholders for missing images
 * Creates consistent, branded placeholders with customizable styles
 */

import type {
  PlaceholderStyle,
  PlaceholderOptions,
  ExtractedColors,
} from './types';

/**
 * Default placeholder options
 */
const DEFAULT_PLACEHOLDER_OPTIONS: Required<PlaceholderOptions> = {
  style: 'gradient',
  width: 400,
  height: 400,
  text: '',
  showRank: true,
  theme: 'dark',
  icon: 'default',
  backgroundColor: '#1a1a2e',
  foregroundColor: '#ffffff',
  pattern: 'gradient',
  rank: 0,
};

/**
 * Predefined color palettes for placeholders
 */
const COLOR_PALETTES = {
  dark: {
    backgrounds: ['#1a1a2e', '#16213e', '#0f3460', '#1b262c', '#2d4059'],
    accents: ['#e94560', '#00fff5', '#ff6b6b', '#4ecdc4', '#ffe66d'],
    text: '#ffffff',
  },
  light: {
    backgrounds: ['#f8f9fa', '#e9ecef', '#dee2e6', '#f1f3f5', '#e3f2fd'],
    accents: ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0'],
    text: '#1a1a2e',
  },
  vibrant: {
    backgrounds: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'],
    accents: ['#ffffff', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'],
    text: '#ffffff',
  },
};

/**
 * PlaceholderGenerator class
 * Creates styled placeholder images for missing content
 */
export class PlaceholderGenerator {
  private readonly options: Required<PlaceholderOptions>;

  constructor(options: Partial<PlaceholderOptions> = {}) {
    this.options = { ...DEFAULT_PLACEHOLDER_OPTIONS, ...options };
  }

  /**
   * Generate SVG placeholder
   * Returns SVG string that can be used directly or converted to data URL
   */
  generateSVG(
    rank?: number,
    text?: string,
    customColors?: ExtractedColors
  ): string {
    const { width, height, style, theme, showRank } = this.options;
    const displayText = text || this.options.text;
    const palette = COLOR_PALETTES[theme];

    switch (style) {
      case 'gradient':
        return this.generateGradientSVG(width, height, rank, displayText, palette, showRank);
      case 'pattern':
        return this.generatePatternSVG(width, height, rank, displayText, palette, showRank);
      case 'geometric':
        return this.generateGeometricSVG(width, height, rank, displayText, palette, showRank);
      case 'minimal':
        return this.generateMinimalSVG(width, height, rank, displayText, palette, showRank);
      case 'branded':
        return this.generateBrandedSVG(width, height, rank, displayText, customColors, showRank);
      default:
        return this.generateGradientSVG(width, height, rank, displayText, palette, showRank);
    }
  }

  /**
   * Generate data URL from SVG
   */
  generateDataURL(rank?: number, text?: string, customColors?: ExtractedColors): string {
    const svg = this.generateSVG(rank, text, customColors);
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * Generate gradient-style placeholder
   */
  private generateGradientSVG(
    width: number,
    height: number,
    rank: number | undefined,
    text: string,
    palette: typeof COLOR_PALETTES['dark'],
    showRank: boolean
  ): string {
    const bgIndex = rank ? (rank - 1) % palette.backgrounds.length : 0;
    const accentIndex = rank ? (rank - 1) % palette.accents.length : 0;
    const bg1 = palette.backgrounds[bgIndex];
    const bg2 = palette.backgrounds[(bgIndex + 1) % palette.backgrounds.length];
    const accent = palette.accents[accentIndex];

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bg1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${bg2};stop-opacity:1" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${accent};stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:${accent};stop-opacity:0" />
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.4}" ry="${height * 0.4}" fill="url(#glow)" />
        ${showRank && rank ? this.generateRankBadge(width, height, rank, accent, palette.text) : ''}
        ${text ? this.generateTextElement(width, height, text, palette.text, !!(showRank && rank)) : ''}
      </svg>
    `.trim();
  }

  /**
   * Generate pattern-style placeholder
   */
  private generatePatternSVG(
    width: number,
    height: number,
    rank: number | undefined,
    text: string,
    palette: typeof COLOR_PALETTES['dark'],
    showRank: boolean
  ): string {
    const bgIndex = rank ? (rank - 1) % palette.backgrounds.length : 0;
    const accentIndex = rank ? (rank - 1) % palette.accents.length : 0;
    const bg = palette.backgrounds[bgIndex];
    const accent = palette.accents[accentIndex];

    // Generate dots pattern
    const dotSpacing = 30;
    const dots: string[] = [];
    for (let y = dotSpacing / 2; y < height; y += dotSpacing) {
      for (let x = dotSpacing / 2; x < width; x += dotSpacing) {
        dots.push(`<circle cx="${x}" cy="${y}" r="2" fill="${accent}" opacity="0.3" />`);
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${bg}" />
        ${dots.join('')}
        ${showRank && rank ? this.generateRankBadge(width, height, rank, accent, palette.text) : ''}
        ${text ? this.generateTextElement(width, height, text, palette.text, !!(showRank && rank)) : ''}
      </svg>
    `.trim();
  }

  /**
   * Generate geometric-style placeholder
   */
  private generateGeometricSVG(
    width: number,
    height: number,
    rank: number | undefined,
    text: string,
    palette: typeof COLOR_PALETTES['dark'],
    showRank: boolean
  ): string {
    const bgIndex = rank ? (rank - 1) % palette.backgrounds.length : 0;
    const accentIndex = rank ? (rank - 1) % palette.accents.length : 0;
    const bg = palette.backgrounds[bgIndex];
    const accent = palette.accents[accentIndex];

    // Generate triangular pattern based on rank
    const seed = rank || 1;
    const shapes: string[] = [];

    // Add decorative triangles
    for (let i = 0; i < 3; i++) {
      const x = ((seed * 37 + i * 89) % width);
      const y = ((seed * 41 + i * 97) % height);
      const size = 40 + (seed * 13 + i * 23) % 60;
      const rotation = (seed * 17 + i * 31) % 360;
      const opacity = 0.1 + (i * 0.05);

      shapes.push(`
        <polygon
          points="${x},${y - size / 2} ${x - size / 2},${y + size / 2} ${x + size / 2},${y + size / 2}"
          fill="${accent}"
          opacity="${opacity}"
          transform="rotate(${rotation}, ${x}, ${y})"
        />
      `);
    }

    // Add circle accent
    shapes.push(`
      <circle
        cx="${width * 0.7}"
        cy="${height * 0.3}"
        r="${Math.min(width, height) * 0.15}"
        fill="none"
        stroke="${accent}"
        stroke-width="2"
        opacity="0.4"
      />
    `);

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${bg}" />
        ${shapes.join('')}
        ${showRank && rank ? this.generateRankBadge(width, height, rank, accent, palette.text) : ''}
        ${text ? this.generateTextElement(width, height, text, palette.text, !!(showRank && rank)) : ''}
      </svg>
    `.trim();
  }

  /**
   * Generate minimal-style placeholder
   */
  private generateMinimalSVG(
    width: number,
    height: number,
    rank: number | undefined,
    text: string,
    palette: typeof COLOR_PALETTES['dark'],
    showRank: boolean
  ): string {
    const bg = palette.backgrounds[0];
    const accent = palette.accents[0];

    // Simple icon placeholder
    const iconSize = Math.min(width, height) * 0.3;
    const iconX = width / 2;
    const iconY = height / 2 - (text ? 20 : 0);

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${bg}" />
        <rect
          x="${iconX - iconSize / 2}"
          y="${iconY - iconSize / 2}"
          width="${iconSize}"
          height="${iconSize * 0.7}"
          rx="8"
          fill="none"
          stroke="${accent}"
          stroke-width="2"
          opacity="0.5"
        />
        <circle
          cx="${iconX}"
          cy="${iconY - iconSize * 0.1}"
          r="${iconSize * 0.15}"
          fill="${accent}"
          opacity="0.5"
        />
        ${showRank && rank ? this.generateRankBadge(width, height, rank, accent, palette.text) : ''}
        ${text ? this.generateTextElement(width, height, text, palette.text, !!(showRank && rank)) : ''}
      </svg>
    `.trim();
  }

  /**
   * Generate branded-style placeholder using custom colors
   */
  private generateBrandedSVG(
    width: number,
    height: number,
    rank: number | undefined,
    text: string,
    customColors: ExtractedColors | undefined,
    showRank: boolean
  ): string {
    // Use custom colors or fall back to dark palette
    const palette = COLOR_PALETTES.dark;
    const bg = customColors?.dominant || palette.backgrounds[0];
    const accent = customColors?.accent || customColors?.palette?.[1] || palette.accents[0];
    const textColor = this.getContrastColor(bg);

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.adjustBrightness(bg, -20)};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#brandGrad)" />
        <rect
          x="${width * 0.1}"
          y="${height * 0.1}"
          width="${width * 0.8}"
          height="${height * 0.8}"
          rx="16"
          fill="${accent}"
          opacity="0.1"
        />
        ${showRank && rank ? this.generateRankBadge(width, height, rank, accent, textColor) : ''}
        ${text ? this.generateTextElement(width, height, text, textColor, !!(showRank && rank)) : ''}
      </svg>
    `.trim();
  }

  /**
   * Generate rank badge SVG element
   */
  private generateRankBadge(
    width: number,
    height: number,
    rank: number,
    accentColor: string,
    textColor: string
  ): string {
    const badgeSize = Math.min(width, height) * 0.25;
    const badgeX = width / 2;
    const badgeY = height / 2 - 10;

    return `
      <g>
        <circle cx="${badgeX}" cy="${badgeY}" r="${badgeSize / 2}" fill="${accentColor}" />
        <text
          x="${badgeX}"
          y="${badgeY}"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="${badgeSize * 0.5}"
          font-weight="700"
          fill="${textColor}"
          text-anchor="middle"
          dominant-baseline="central"
        >#${rank}</text>
      </g>
    `;
  }

  /**
   * Generate text element
   */
  private generateTextElement(
    width: number,
    height: number,
    text: string,
    textColor: string,
    hasRank: boolean | undefined
  ): string {
    const y = hasRank ? height * 0.75 : height / 2;
    const fontSize = Math.min(width, height) * 0.08;
    const maxChars = Math.floor(width / (fontSize * 0.6));
    const displayText = text.length > maxChars ? text.slice(0, maxChars - 2) + '...' : text;

    return `
      <text
        x="${width / 2}"
        y="${y}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="500"
        fill="${textColor}"
        text-anchor="middle"
        dominant-baseline="central"
        opacity="0.9"
      >${this.escapeXML(displayText)}</text>
    `;
  }

  /**
   * Get contrasting text color for a background
   */
  private getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#1a1a2e' : '#ffffff';
  }

  /**
   * Adjust brightness of a hex color
   */
  private adjustBrightness(hexColor: string, amount: number): string {
    const hex = hexColor.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate a unique placeholder based on text hash
   */
  generateFromText(text: string, rank?: number): string {
    // Create a simple hash from text for consistent colors
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }

    // Use hash to select colors
    const palette = COLOR_PALETTES.vibrant;
    const bgIndex = Math.abs(hash) % palette.backgrounds.length;
    const accentIndex = Math.abs(hash >> 4) % palette.accents.length;

    const customColors: ExtractedColors = {
      dominant: palette.backgrounds[bgIndex],
      accent: palette.accents[accentIndex],
      palette: [palette.backgrounds[bgIndex], palette.accents[accentIndex]],
    };

    return this.generateSVG(rank, text, customColors);
  }
}

/**
 * Create a placeholder generator instance
 */
export function createPlaceholderGenerator(
  options?: Partial<PlaceholderOptions>
): PlaceholderGenerator {
  return new PlaceholderGenerator(options);
}

/**
 * Quick placeholder generation functions
 */
export function generatePlaceholder(
  width: number,
  height: number,
  rank?: number,
  text?: string,
  style: PlaceholderStyle = 'gradient',
  theme: 'dark' | 'light' | 'vibrant' = 'dark'
): string {
  const generator = new PlaceholderGenerator({
    width,
    height,
    style,
    theme,
    showRank: rank !== undefined,
  });
  return generator.generateDataURL(rank, text);
}
