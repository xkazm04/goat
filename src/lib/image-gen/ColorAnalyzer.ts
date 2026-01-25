/**
 * ColorAnalyzer
 * Color harmony analysis and optimization
 * Extracts colors, analyzes harmony, and suggests improvements
 */

import type {
  ExtractedColors,
  ColorHarmony,
  HarmonyType,
  ColorAdjustment,
} from './types';

/**
 * Common harmony types and their hue relationships
 */
const HARMONY_DEFINITIONS: Record<HarmonyType, { angles: number[]; tolerance: number }> = {
  complementary: { angles: [180], tolerance: 30 },
  analogous: { angles: [30, -30], tolerance: 15 },
  triadic: { angles: [120, 240], tolerance: 20 },
  'split-complementary': { angles: [150, 210], tolerance: 20 },
  tetradic: { angles: [90, 180, 270], tolerance: 15 },
  monochromatic: { angles: [], tolerance: 10 },
};

/**
 * ColorAnalyzer class
 * Analyzes colors for harmony and provides optimization suggestions
 */
export class ColorAnalyzer {
  /**
   * Extract dominant colors from pixel data
   * Uses a simplified k-means-like clustering approach
   */
  extractColors(
    pixelData: Uint8ClampedArray,
    maxColors: number = 5
  ): ExtractedColors {
    // Sample pixels and build color histogram
    const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();

    const sampleStep = Math.max(1, Math.floor(pixelData.length / (4 * 10000)));

    for (let i = 0; i < pixelData.length; i += 4 * sampleStep) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      // Skip transparent pixels
      if (a < 128) continue;

      // Quantize to reduce color space
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;

      const key = `${qr},${qg},${qb}`;

      const existing = colorCounts.get(key);
      if (existing) {
        // Average with existing
        existing.r = (existing.r * existing.count + r) / (existing.count + 1);
        existing.g = (existing.g * existing.count + g) / (existing.count + 1);
        existing.b = (existing.b * existing.count + b) / (existing.count + 1);
        existing.count++;
      } else {
        colorCounts.set(key, { r, g, b, count: 1 });
      }
    }

    // Sort by count and get top colors
    const sortedColors = Array.from(colorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, maxColors * 2);

    // Filter similar colors
    const distinctColors = this.filterSimilarColors(sortedColors, maxColors);

    // Convert to hex
    const palette = distinctColors.map(c => this.rgbToHex(c.r, c.g, c.b));

    // Find dominant and accent colors
    const dominant = palette[0] || '#1a1a2e';

    // Accent is most visually distinct from dominant
    let accent = palette[1] || dominant;
    let maxDifference = 0;

    for (let i = 1; i < palette.length; i++) {
      const diff = this.colorDifference(dominant, palette[i]);
      if (diff > maxDifference) {
        maxDifference = diff;
        accent = palette[i];
      }
    }

    return {
      dominant,
      accent,
      palette,
    };
  }

  /**
   * Filter out similar colors to get distinct palette
   */
  private filterSimilarColors(
    colors: Array<{ r: number; g: number; b: number; count: number }>,
    maxColors: number
  ): Array<{ r: number; g: number; b: number; count: number }> {
    const distinct: Array<{ r: number; g: number; b: number; count: number }> = [];

    for (const color of colors) {
      let isSimilar = false;

      for (const existing of distinct) {
        const diff = Math.sqrt(
          Math.pow(color.r - existing.r, 2) +
          Math.pow(color.g - existing.g, 2) +
          Math.pow(color.b - existing.b, 2)
        );

        if (diff < 50) {
          isSimilar = true;
          break;
        }
      }

      if (!isSimilar) {
        distinct.push(color);
        if (distinct.length >= maxColors) break;
      }
    }

    return distinct;
  }

  /**
   * Analyze color harmony between multiple color sets
   */
  analyzeHarmony(colorSets: ExtractedColors[]): ColorHarmony {
    // Collect all unique colors
    const allColors = new Set<string>();
    colorSets.forEach(set => {
      allColors.add(set.dominant);
      if (set.accent) allColors.add(set.accent);
      set.palette?.forEach(c => allColors.add(c));
    });

    const colors = Array.from(allColors).slice(0, 8);

    // Detect harmony type
    const harmonyType = this.detectHarmonyType(colors);

    // Calculate harmony score
    const score = this.calculateHarmonyScore(colors, harmonyType);

    // Analyze contrast
    const contrastRatio = this.calculateOverallContrast(colors);

    // Check accessibility
    const isAccessible = contrastRatio >= 4.5;

    // Generate suggestions
    const suggestedAdjustments = this.generateAdjustments(colors, harmonyType, score);

    return {
      type: harmonyType,
      score,
      colors,
      contrastRatio,
      isAccessible,
      suggestedAdjustments,
    };
  }

  /**
   * Detect the harmony type of a color set
   */
  private detectHarmonyType(colors: string[]): HarmonyType {
    if (colors.length < 2) return 'monochromatic';

    // Convert to HSL for analysis
    const hslColors = colors.map(c => this.hexToHSL(c));

    // Check for monochromatic (similar hues)
    const hues = hslColors.map(h => h.h);
    const hueRange = Math.max(...hues) - Math.min(...hues);

    if (hueRange < 20) return 'monochromatic';

    // Check against harmony definitions
    let bestMatch: HarmonyType = 'analogous';
    let bestScore = 0;

    const entries = Object.entries(HARMONY_DEFINITIONS) as Array<[HarmonyType, { angles: number[]; tolerance: number }]>;

    entries.forEach(([type, definition]) => {
      if (type === 'monochromatic') return;

      const score = this.scoreHarmonyMatch(hues, definition);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = type;
      }
    });

    return bestMatch;
  }

  /**
   * Score how well hues match a harmony definition
   */
  private scoreHarmonyMatch(
    hues: number[],
    definition: { angles: number[]; tolerance: number }
  ): number {
    if (hues.length < 2) return 0;

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const hueDiff = this.normalizeHueDifference(hues[j] - hues[i]);

        // Check if this difference matches any expected angle
        let bestAngleMatch = Infinity;
        definition.angles.forEach(angle => {
          const diff = Math.abs(hueDiff - angle);
          const reverseDiff = Math.abs(hueDiff - (360 - angle));
          bestAngleMatch = Math.min(bestAngleMatch, diff, reverseDiff);
        });

        // Score based on how close to expected angle
        if (bestAngleMatch <= definition.tolerance) {
          totalScore += 1 - (bestAngleMatch / definition.tolerance);
        }

        comparisons++;
      }
    }

    return comparisons > 0 ? totalScore / comparisons : 0;
  }

  /**
   * Normalize hue difference to 0-360 range
   */
  private normalizeHueDifference(diff: number): number {
    let normalized = diff % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  }

  /**
   * Calculate overall harmony score
   */
  private calculateHarmonyScore(colors: string[], harmonyType: HarmonyType): number {
    if (colors.length < 2) return 1;

    const hslColors = colors.map(c => this.hexToHSL(c));

    // Factor 1: Saturation consistency
    const saturations = hslColors.map(h => h.s);
    const saturationVariance = this.calculateVariance(saturations);
    const saturationScore = 1 - Math.min(saturationVariance * 2, 1);

    // Factor 2: Lightness balance
    const lightnesses = hslColors.map(h => h.l);
    const avgLightness = lightnesses.reduce((a, b) => a + b, 0) / lightnesses.length;
    const lightnessScore = 1 - Math.abs(avgLightness - 0.5);

    // Factor 3: Hue relationship
    const hues = hslColors.map(h => h.h);
    const definition = HARMONY_DEFINITIONS[harmonyType];
    const hueScore = this.scoreHarmonyMatch(hues, definition);

    // Weighted combination
    return (
      saturationScore * 0.25 +
      lightnessScore * 0.25 +
      hueScore * 0.5
    );
  }

  /**
   * Calculate overall contrast between colors
   */
  private calculateOverallContrast(colors: string[]): number {
    if (colors.length < 2) return 21; // Max contrast

    let minContrast = 21;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const contrast = this.calculateContrastRatio(colors[i], colors[j]);
        minContrast = Math.min(minContrast, contrast);
      }
    }

    return minContrast;
  }

  /**
   * Calculate WCAG contrast ratio between two colors
   */
  calculateContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRGB(hex);

    const rsrgb = rgb.r / 255;
    const gsrgb = rgb.g / 255;
    const bsrgb = rgb.b / 255;

    const r = rsrgb <= 0.03928 ? rsrgb / 12.92 : Math.pow((rsrgb + 0.055) / 1.055, 2.4);
    const g = gsrgb <= 0.03928 ? gsrgb / 12.92 : Math.pow((gsrgb + 0.055) / 1.055, 2.4);
    const b = bsrgb <= 0.03928 ? bsrgb / 12.92 : Math.pow((bsrgb + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Generate color adjustment suggestions
   */
  private generateAdjustments(
    colors: string[],
    harmonyType: HarmonyType,
    currentScore: number
  ): ColorAdjustment[] {
    const adjustments: ColorAdjustment[] = [];

    if (currentScore >= 0.8) return adjustments;

    const hslColors = colors.map(c => this.hexToHSL(c));

    // Check saturation consistency
    const saturations = hslColors.map(h => h.s);
    const avgSaturation = saturations.reduce((a, b) => a + b, 0) / saturations.length;

    hslColors.forEach((hsl, i) => {
      if (Math.abs(hsl.s - avgSaturation) > 0.2) {
        const targetSaturation = avgSaturation;
        const adjustedHex = this.hslToHex(hsl.h, targetSaturation, hsl.l);

        adjustments.push({
          originalColor: colors[i],
          adjustedColor: adjustedHex,
          type: 'saturation',
          reason: 'Adjust saturation for better harmony',
        });
      }
    });

    // Check for contrast issues
    if (colors.length >= 2) {
      const contrast = this.calculateContrastRatio(colors[0], colors[1]);
      if (contrast < 3) {
        // Suggest lightening or darkening
        const hsl0 = hslColors[0];
        const hsl1 = hslColors[1];

        if (Math.abs(hsl0.l - hsl1.l) < 0.3) {
          const lighter = hsl0.l > hsl1.l ? 0 : 1;
          const darkerIdx = 1 - lighter;
          const darkerHsl = hslColors[darkerIdx];

          const adjustedHex = this.hslToHex(
            darkerHsl.h,
            darkerHsl.s,
            Math.max(0.1, darkerHsl.l - 0.2)
          );

          adjustments.push({
            originalColor: colors[darkerIdx],
            adjustedColor: adjustedHex,
            type: 'lightness',
            reason: 'Improve contrast for better readability',
          });
        }
      }
    }

    return adjustments.slice(0, 3);
  }

  /**
   * Generate harmonious color palette from a base color
   */
  generateHarmoniousPalette(
    baseColor: string,
    harmonyType: HarmonyType,
    count: number = 5
  ): string[] {
    const hsl = this.hexToHSL(baseColor);
    const palette: string[] = [baseColor];

    const definition = HARMONY_DEFINITIONS[harmonyType];

    if (harmonyType === 'monochromatic') {
      // Vary lightness and saturation
      for (let i = 1; i < count; i++) {
        const lightness = Math.max(0.1, Math.min(0.9, hsl.l + (i - count / 2) * 0.15));
        const saturation = Math.max(0.2, Math.min(1, hsl.s * (0.7 + i * 0.1)));
        palette.push(this.hslToHex(hsl.h, saturation, lightness));
      }
    } else {
      // Use harmony angles
      const angles = [0, ...definition.angles];

      for (let i = 1; i < count; i++) {
        const angleIndex = i % angles.length;
        const newHue = (hsl.h + angles[angleIndex]) % 360;

        // Vary saturation and lightness slightly
        const saturation = Math.max(0.3, Math.min(1, hsl.s + (Math.random() - 0.5) * 0.2));
        const lightness = Math.max(0.2, Math.min(0.8, hsl.l + (Math.random() - 0.5) * 0.2));

        palette.push(this.hslToHex(newHue, saturation, lightness));
      }
    }

    return palette.slice(0, count);
  }

  /**
   * Calculate color difference (distance in RGB space)
   */
  colorDifference(color1: string, color2: string): number {
    const rgb1 = this.hexToRGB(color1);
    const rgb2 = this.hexToRGB(color2);

    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Convert hex to RGB
   */
  hexToRGB(hex: string): { r: number; g: number; b: number } {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  /**
   * Convert RGB to hex
   */
  rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Convert hex to HSL
   */
  hexToHSL(hex: string): { h: number; s: number; l: number } {
    const rgb = this.hexToRGB(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

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
          h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / d + 2) * 60;
          break;
        case b:
          h = ((r - g) / d + 4) * 60;
          break;
      }
    }

    return { h, s, l };
  }

  /**
   * Convert HSL to hex
   */
  hslToHex(h: number, s: number, l: number): string {
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

      r = hue2rgb(p, q, h / 360 + 1 / 3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1 / 3);
    }

    return this.rgbToHex(r * 255, g * 255, b * 255);
  }
}

/**
 * Create a color analyzer instance
 */
export function createColorAnalyzer(): ColorAnalyzer {
  return new ColorAnalyzer();
}
