/**
 * ImageEnhancer
 * Quality improvement and smart cropping for images
 * Handles quality detection, enhancement, and focal point cropping
 */

import type {
  ImageQualityMetrics,
  EnhancementResult,
  EnhancementOptions,
  CropRegion,
  FocalPoint,
  ExtractedColors,
} from './types';

/**
 * Default enhancement options
 */
const DEFAULT_ENHANCEMENT_OPTIONS: EnhancementOptions = {
  targetBrightness: 0.5,
  targetContrast: 0.5,
  targetSaturation: 0.5,
  sharpenAmount: 0.3,
  autoEnhance: true,
};

/**
 * Quality thresholds for categorization
 */
const QUALITY_THRESHOLDS = {
  excellent: 0.8,
  good: 0.6,
  acceptable: 0.4,
  poor: 0.2,
};

/**
 * ImageEnhancer class
 * Provides image quality analysis and enhancement suggestions
 */
export class ImageEnhancer {
  private readonly options: EnhancementOptions;

  constructor(options: Partial<EnhancementOptions> = {}) {
    this.options = { ...DEFAULT_ENHANCEMENT_OPTIONS, ...options };
  }

  /**
   * Analyze image quality from pixel data
   * In a browser environment, this would work with canvas data
   * For server-side, we work with metadata and estimates
   */
  analyzeQuality(
    width: number,
    height: number,
    pixelData?: Uint8ClampedArray
  ): ImageQualityMetrics {
    // Resolution-based quality estimate
    const totalPixels = width * height;
    const resolutionScore = this.calculateResolutionScore(width, height);

    // If we have pixel data, analyze it
    if (pixelData && pixelData.length > 0) {
      return this.analyzePixelData(width, height, pixelData, resolutionScore);
    }

    // Return estimates based on resolution alone
    return {
      resolution: { width, height },
      qualityScore: resolutionScore,
      brightness: 0.5, // Neutral estimate
      contrast: 0.5,
      saturation: 0.5,
      sharpness: 0.5,
      noiseLevel: 0.2,
      isLowQuality: resolutionScore < QUALITY_THRESHOLDS.acceptable,
      needsEnhancement: resolutionScore < QUALITY_THRESHOLDS.good,
    };
  }

  /**
   * Analyze actual pixel data for quality metrics
   */
  private analyzePixelData(
    width: number,
    height: number,
    pixelData: Uint8ClampedArray,
    resolutionScore: number
  ): ImageQualityMetrics {
    const pixelCount = width * height;

    let totalBrightness = 0;
    let totalSaturation = 0;
    const luminanceValues: number[] = [];
    const saturationValues: number[] = [];

    // Sample pixels for performance (every 4th pixel for large images)
    const sampleStep = pixelCount > 250000 ? 4 : 1;
    let sampledCount = 0;

    for (let i = 0; i < pixelData.length; i += 4 * sampleStep) {
      const r = pixelData[i] / 255;
      const g = pixelData[i + 1] / 255;
      const b = pixelData[i + 2] / 255;

      // Calculate luminance (perceived brightness)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      luminanceValues.push(luminance);
      totalBrightness += luminance;

      // Calculate saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      saturationValues.push(saturation);
      totalSaturation += saturation;

      sampledCount++;
    }

    const avgBrightness = totalBrightness / sampledCount;
    const avgSaturation = totalSaturation / sampledCount;

    // Calculate contrast (standard deviation of luminance)
    const contrast = this.calculateStandardDeviation(luminanceValues);

    // Estimate sharpness using edge detection approximation
    const sharpness = this.estimateSharpness(pixelData, width, height, sampleStep);

    // Estimate noise level
    const noiseLevel = this.estimateNoise(luminanceValues);

    // Calculate overall quality score
    const qualityScore = this.calculateOverallQuality(
      resolutionScore,
      avgBrightness,
      contrast,
      avgSaturation,
      sharpness,
      noiseLevel
    );

    return {
      resolution: { width, height },
      qualityScore,
      brightness: avgBrightness,
      contrast,
      saturation: avgSaturation,
      sharpness,
      noiseLevel,
      isLowQuality: qualityScore < QUALITY_THRESHOLDS.acceptable,
      needsEnhancement: qualityScore < QUALITY_THRESHOLDS.good,
    };
  }

  /**
   * Calculate resolution-based quality score
   */
  private calculateResolutionScore(width: number, height: number): number {
    const totalPixels = width * height;

    // Ideal resolution targets for sharing images
    const minGood = 640 * 480;      // 307k pixels
    const idealMin = 1280 * 720;    // 921k pixels
    const idealMax = 1920 * 1080;   // 2M pixels

    if (totalPixels >= idealMin) {
      // Good to excellent resolution
      return Math.min(1, 0.8 + (totalPixels - idealMin) / (idealMax - idealMin) * 0.2);
    } else if (totalPixels >= minGood) {
      // Acceptable resolution
      return 0.6 + (totalPixels - minGood) / (idealMin - minGood) * 0.2;
    } else {
      // Below acceptable
      return Math.max(0.1, totalPixels / minGood * 0.6);
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Estimate sharpness using gradient approximation
   */
  private estimateSharpness(
    pixelData: Uint8ClampedArray,
    width: number,
    height: number,
    sampleStep: number
  ): number {
    let totalGradient = 0;
    let gradientCount = 0;

    // Sample gradients across the image
    const rowStep = Math.max(1, Math.floor(height / 50)) * sampleStep;
    const colStep = Math.max(1, Math.floor(width / 50)) * sampleStep;

    for (let y = 1; y < height - 1; y += rowStep) {
      for (let x = 1; x < width - 1; x += colStep) {
        const idx = (y * width + x) * 4;
        const idxRight = (y * width + x + 1) * 4;
        const idxDown = ((y + 1) * width + x) * 4;

        // Horizontal gradient
        const gx = Math.abs(
          (pixelData[idx] - pixelData[idxRight]) +
          (pixelData[idx + 1] - pixelData[idxRight + 1]) +
          (pixelData[idx + 2] - pixelData[idxRight + 2])
        ) / 3;

        // Vertical gradient
        const gy = Math.abs(
          (pixelData[idx] - pixelData[idxDown]) +
          (pixelData[idx + 1] - pixelData[idxDown + 1]) +
          (pixelData[idx + 2] - pixelData[idxDown + 2])
        ) / 3;

        totalGradient += Math.sqrt(gx * gx + gy * gy);
        gradientCount++;
      }
    }

    // Normalize sharpness score (higher gradient = sharper)
    const avgGradient = gradientCount > 0 ? totalGradient / gradientCount : 0;
    return Math.min(1, avgGradient / 50); // Normalize to 0-1 range
  }

  /**
   * Estimate noise level from luminance variance
   */
  private estimateNoise(luminanceValues: number[]): number {
    if (luminanceValues.length < 10) return 0.2;

    // Sort values and look at local variance
    const sorted = [...luminanceValues].sort((a, b) => a - b);

    // Take middle 80% to avoid outliers
    const start = Math.floor(sorted.length * 0.1);
    const end = Math.floor(sorted.length * 0.9);
    const middle = sorted.slice(start, end);

    // Calculate local variance
    let localVariance = 0;
    for (let i = 1; i < middle.length; i++) {
      localVariance += Math.abs(middle[i] - middle[i - 1]);
    }
    localVariance /= middle.length;

    // Higher local variance = more noise
    return Math.min(1, localVariance * 5);
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQuality(
    resolutionScore: number,
    brightness: number,
    contrast: number,
    saturation: number,
    sharpness: number,
    noiseLevel: number
  ): number {
    // Brightness penalty (too dark or too bright)
    const brightnessPenalty = Math.abs(brightness - 0.5) * 0.3;

    // Contrast bonus (good contrast is desirable)
    const contrastBonus = Math.min(contrast * 0.5, 0.15);

    // Saturation bonus (moderate saturation is good)
    const saturationBonus = saturation > 0.1 && saturation < 0.8
      ? saturation * 0.1
      : 0;

    // Sharpness bonus
    const sharpnessBonus = sharpness * 0.15;

    // Noise penalty
    const noisePenalty = noiseLevel * 0.2;

    // Combine scores
    const score = (
      resolutionScore * 0.4 +
      contrastBonus +
      saturationBonus +
      sharpnessBonus -
      brightnessPenalty -
      noisePenalty +
      0.3 // Base score
    );

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate enhancement suggestions based on quality analysis
   */
  generateEnhancementSuggestions(
    metrics: ImageQualityMetrics
  ): EnhancementResult {
    const adjustments: EnhancementResult['adjustments'] = {};
    const suggestions: string[] = [];

    // Brightness adjustment
    if (metrics.brightness < 0.35) {
      adjustments.brightness = 0.15 + (0.35 - metrics.brightness);
      suggestions.push('Increase brightness to improve visibility');
    } else if (metrics.brightness > 0.65) {
      adjustments.brightness = -(metrics.brightness - 0.65) - 0.1;
      suggestions.push('Reduce brightness to prevent overexposure');
    }

    // Contrast adjustment
    if (metrics.contrast < 0.15) {
      adjustments.contrast = 0.2;
      suggestions.push('Increase contrast for better definition');
    }

    // Saturation adjustment
    if (metrics.saturation < 0.2) {
      adjustments.saturation = 0.15;
      suggestions.push('Boost saturation for more vibrant colors');
    } else if (metrics.saturation > 0.85) {
      adjustments.saturation = -0.1;
      suggestions.push('Reduce saturation to prevent color clipping');
    }

    // Sharpness adjustment
    if (metrics.sharpness < 0.3) {
      adjustments.sharpness = 0.3;
      suggestions.push('Apply sharpening to improve clarity');
    }

    // Noise reduction
    if (metrics.noiseLevel > 0.5) {
      suggestions.push('Consider noise reduction filter');
    }

    // Resolution warning
    if (metrics.resolution.width < 400 || metrics.resolution.height < 400) {
      suggestions.push('Image resolution is low - consider using a higher quality source');
    }

    const estimatedImprovement = this.estimateImprovement(metrics, adjustments);

    return {
      originalMetrics: metrics,
      adjustments,
      suggestions,
      estimatedImprovement,
    };
  }

  /**
   * Estimate quality improvement from adjustments
   */
  private estimateImprovement(
    metrics: ImageQualityMetrics,
    adjustments: EnhancementResult['adjustments']
  ): number {
    let improvement = 0;

    if (adjustments.brightness !== undefined) {
      improvement += 0.1;
    }
    if (adjustments.contrast !== undefined) {
      improvement += 0.15;
    }
    if (adjustments.saturation !== undefined) {
      improvement += 0.05;
    }
    if (adjustments.sharpness !== undefined) {
      improvement += 0.1;
    }

    // Cap improvement based on original quality
    const maxImprovement = 1 - metrics.qualityScore;
    return Math.min(improvement, maxImprovement * 0.8);
  }

  /**
   * Calculate smart crop region for an image
   * Focuses on the most important part of the image
   */
  calculateSmartCrop(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    focalPoint?: FocalPoint
  ): CropRegion {
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = targetWidth / targetHeight;

    let cropWidth: number;
    let cropHeight: number;

    if (sourceAspect > targetAspect) {
      // Source is wider - crop sides
      cropHeight = sourceHeight;
      cropWidth = sourceHeight * targetAspect;
    } else {
      // Source is taller - crop top/bottom
      cropWidth = sourceWidth;
      cropHeight = sourceWidth / targetAspect;
    }

    // Default center crop
    let x = (sourceWidth - cropWidth) / 2;
    let y = (sourceHeight - cropHeight) / 2;

    // Adjust for focal point if provided
    if (focalPoint) {
      // Focal point is 0-1 relative coordinates
      const focalX = focalPoint.x * sourceWidth;
      const focalY = focalPoint.y * sourceHeight;

      // Try to center crop on focal point
      x = Math.max(0, Math.min(sourceWidth - cropWidth, focalX - cropWidth / 2));
      y = Math.max(0, Math.min(sourceHeight - cropHeight, focalY - cropHeight / 2));
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };
  }

  /**
   * Detect potential focal point using color analysis
   * This is a simple heuristic - for better results use ML-based detection
   */
  detectFocalPoint(
    pixelData: Uint8ClampedArray,
    width: number,
    height: number
  ): FocalPoint {
    // Divide image into grid and find region with highest visual interest
    const gridSize = 5;
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;

    let maxInterest = 0;
    let focalX = 0.5;
    let focalY = 0.5;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const interest = this.calculateRegionInterest(
          pixelData,
          width,
          Math.floor(gx * cellWidth),
          Math.floor(gy * cellHeight),
          Math.floor(cellWidth),
          Math.floor(cellHeight)
        );

        // Apply rule of thirds bias (prefer intersections)
        const thirdsBias = this.getRuleOfThirdsBias(gx, gy, gridSize);
        const weightedInterest = interest * (1 + thirdsBias * 0.2);

        if (weightedInterest > maxInterest) {
          maxInterest = weightedInterest;
          focalX = (gx + 0.5) / gridSize;
          focalY = (gy + 0.5) / gridSize;
        }
      }
    }

    return {
      x: focalX,
      y: focalY,
      weight: Math.min(1, maxInterest),
    };
  }

  /**
   * Calculate visual interest of a region
   */
  private calculateRegionInterest(
    pixelData: Uint8ClampedArray,
    imageWidth: number,
    startX: number,
    startY: number,
    regionWidth: number,
    regionHeight: number
  ): number {
    let totalContrast = 0;
    let totalSaturation = 0;
    let sampleCount = 0;

    const sampleStep = Math.max(1, Math.floor((regionWidth * regionHeight) / 100));

    for (let y = startY; y < startY + regionHeight && y < imageWidth; y += sampleStep) {
      for (let x = startX; x < startX + regionWidth; x += sampleStep) {
        const idx = (y * imageWidth + x) * 4;
        if (idx + 3 >= pixelData.length) continue;

        const r = pixelData[idx] / 255;
        const g = pixelData[idx + 1] / 255;
        const b = pixelData[idx + 2] / 255;

        // Local contrast (difference from neighbors)
        if (x > startX && y > startY) {
          const prevIdx = ((y - sampleStep) * imageWidth + x - sampleStep) * 4;
          if (prevIdx >= 0) {
            const prevR = pixelData[prevIdx] / 255;
            const prevG = pixelData[prevIdx + 1] / 255;
            const prevB = pixelData[prevIdx + 2] / 255;
            totalContrast += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
          }
        }

        // Saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        totalSaturation += max > 0 ? (max - min) / max : 0;

        sampleCount++;
      }
    }

    if (sampleCount === 0) return 0;

    const avgContrast = totalContrast / sampleCount;
    const avgSaturation = totalSaturation / sampleCount;

    // Combine metrics for interest score
    return avgContrast * 0.6 + avgSaturation * 0.4;
  }

  /**
   * Get rule of thirds bias for a grid position
   */
  private getRuleOfThirdsBias(gx: number, gy: number, gridSize: number): number {
    // Power points at 1/3 and 2/3 intersections
    const thirdX1 = gridSize / 3;
    const thirdX2 = (gridSize * 2) / 3;
    const thirdY1 = gridSize / 3;
    const thirdY2 = (gridSize * 2) / 3;

    const distToThirdX = Math.min(
      Math.abs(gx - thirdX1),
      Math.abs(gx - thirdX2)
    );
    const distToThirdY = Math.min(
      Math.abs(gy - thirdY1),
      Math.abs(gy - thirdY2)
    );

    // Closer to thirds = higher bias
    const maxDist = gridSize / 3;
    const xBias = 1 - distToThirdX / maxDist;
    const yBias = 1 - distToThirdY / maxDist;

    return (xBias + yBias) / 2;
  }

  /**
   * Categorize quality level
   */
  categorizeQuality(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent';
    if (score >= QUALITY_THRESHOLDS.good) return 'good';
    if (score >= QUALITY_THRESHOLDS.acceptable) return 'acceptable';
    return 'poor';
  }
}

/**
 * Create an image enhancer instance
 */
export function createImageEnhancer(
  options?: Partial<EnhancementOptions>
): ImageEnhancer {
  return new ImageEnhancer(options);
}
