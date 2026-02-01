/**
 * ImageSelector
 *
 * Selects the best image from multiple candidates based on quality,
 * dimensions, aspect ratio, and source priority.
 */

import type { ImageMetadata, DataSource, EnrichmentConfig } from './types';

/**
 * Image scoring weights
 */
interface ImageScoringWeights {
  resolution: number;
  aspectRatio: number;
  sourcePriority: number;
  qualityLabel: number;
}

const DEFAULT_WEIGHTS: ImageScoringWeights = {
  resolution: 0.35,
  aspectRatio: 0.25,
  sourcePriority: 0.25,
  qualityLabel: 0.15,
};

/**
 * Source priority for images (higher = better)
 */
const IMAGE_SOURCE_PRIORITIES: Record<DataSource, number> = {
  tmdb: 95, // Best quality for movies/TV
  igdb: 90, // Best for games
  spotify: 90, // Good for music
  openlibrary: 70, // Decent for books
  googlebooks: 65, // Lower quality
  musicbrainz: 60, // Often no images
  wikipedia: 50, // Variable quality
  gemini: 30, // AI-generated, least preferred
};

/**
 * Quality label scores
 */
const QUALITY_SCORES: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

/**
 * Common aspect ratios and their purposes
 */
const ASPECT_RATIO_CONFIGS = {
  poster: {
    ratio: 0.67, // 2:3 (movie/TV posters)
    tolerance: 0.1,
  },
  square: {
    ratio: 1.0, // 1:1 (album art)
    tolerance: 0.1,
  },
  landscape: {
    ratio: 1.78, // 16:9 (screenshots, backdrops)
    tolerance: 0.15,
  },
  portrait: {
    ratio: 0.75, // 3:4 (some book covers)
    tolerance: 0.1,
  },
};

type AspectRatioType = keyof typeof ASPECT_RATIO_CONFIGS;

class ImageSelectorClass {
  private weights: ImageScoringWeights;

  constructor(weights: Partial<ImageScoringWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Calculate resolution score (0-1)
   */
  private calculateResolutionScore(
    image: ImageMetadata,
    config: EnrichmentConfig['preferredImageSize']
  ): number {
    const width = image.width || 0;
    const height = image.height || 0;

    if (width === 0 && height === 0) {
      // Unknown dimensions - assume medium quality
      return 0.5;
    }

    const minWidth = config.minWidth;
    const minHeight = config.minHeight;

    // Calculate how well it meets minimum requirements
    const widthRatio = width / minWidth;
    const heightRatio = height / minHeight;

    // Score based on exceeding minimums (diminishing returns above 2x)
    const widthScore = Math.min(widthRatio, 2) / 2;
    const heightScore = Math.min(heightRatio, 2) / 2;

    return (widthScore + heightScore) / 2;
  }

  /**
   * Calculate aspect ratio score (0-1)
   */
  private calculateAspectRatioScore(
    image: ImageMetadata,
    preferredRatio: number
  ): number {
    const ratio = image.aspectRatio;

    if (!ratio) {
      // If we have dimensions, calculate ratio
      if (image.width && image.height) {
        const calculatedRatio = image.width / image.height;
        const diff = Math.abs(calculatedRatio - preferredRatio);
        return Math.max(0, 1 - diff * 2);
      }
      // Unknown ratio - assume acceptable
      return 0.5;
    }

    const diff = Math.abs(ratio - preferredRatio);
    return Math.max(0, 1 - diff * 2);
  }

  /**
   * Calculate source priority score (0-1)
   */
  private calculateSourceScore(source: DataSource): number {
    return IMAGE_SOURCE_PRIORITIES[source] / 100;
  }

  /**
   * Calculate quality label score (0-1)
   */
  private calculateQualityScore(quality?: 'low' | 'medium' | 'high'): number {
    if (!quality) return 0.5;
    return QUALITY_SCORES[quality] || 0.5;
  }

  /**
   * Calculate total score for an image
   */
  scoreImage(
    image: ImageMetadata,
    config: EnrichmentConfig['preferredImageSize']
  ): number {
    const resolutionScore = this.calculateResolutionScore(image, config);
    const aspectScore = this.calculateAspectRatioScore(
      image,
      config.preferredAspectRatio
    );
    const sourceScore = this.calculateSourceScore(image.source);
    const qualityScore = this.calculateQualityScore(image.quality);

    return (
      resolutionScore * this.weights.resolution +
      aspectScore * this.weights.aspectRatio +
      sourceScore * this.weights.sourcePriority +
      qualityScore * this.weights.qualityLabel
    );
  }

  /**
   * Select the best image from a list of candidates
   */
  selectBest(
    images: ImageMetadata[],
    config: EnrichmentConfig['preferredImageSize']
  ): ImageMetadata | undefined {
    if (images.length === 0) return undefined;
    if (images.length === 1) return images[0];

    let bestImage = images[0];
    let bestScore = this.scoreImage(bestImage, config);

    for (let i = 1; i < images.length; i++) {
      const score = this.scoreImage(images[i], config);
      if (score > bestScore) {
        bestScore = score;
        bestImage = images[i];
      }
    }

    return bestImage;
  }

  /**
   * Select best image for a specific aspect ratio type
   */
  selectBestForType(
    images: ImageMetadata[],
    type: AspectRatioType,
    minSize: { width: number; height: number } = { width: 300, height: 300 }
  ): ImageMetadata | undefined {
    const config = ASPECT_RATIO_CONFIGS[type];

    return this.selectBest(images, {
      minWidth: minSize.width,
      minHeight: minSize.height,
      preferredAspectRatio: config.ratio,
    });
  }

  /**
   * Select best poster image (2:3 ratio)
   */
  selectBestPoster(images: ImageMetadata[]): ImageMetadata | undefined {
    return this.selectBestForType(images, 'poster', { width: 300, height: 450 });
  }

  /**
   * Select best square image (1:1 ratio, for album art)
   */
  selectBestSquare(images: ImageMetadata[]): ImageMetadata | undefined {
    return this.selectBestForType(images, 'square', { width: 300, height: 300 });
  }

  /**
   * Select best landscape image (16:9 ratio, for backdrops)
   */
  selectBestLandscape(images: ImageMetadata[]): ImageMetadata | undefined {
    return this.selectBestForType(images, 'landscape', { width: 640, height: 360 });
  }

  /**
   * Rank all images by score
   */
  rankImages(
    images: ImageMetadata[],
    config: EnrichmentConfig['preferredImageSize']
  ): Array<{ image: ImageMetadata; score: number }> {
    return images
      .map((image) => ({
        image,
        score: this.scoreImage(image, config),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Filter images that meet minimum quality requirements
   */
  filterQualified(
    images: ImageMetadata[],
    config: EnrichmentConfig['preferredImageSize']
  ): ImageMetadata[] {
    return images.filter((image) => {
      // Must have dimensions or be from a trusted source
      if (!image.width && !image.height) {
        return IMAGE_SOURCE_PRIORITIES[image.source] >= 70;
      }

      // Must meet minimum dimensions
      const width = image.width || 0;
      const height = image.height || 0;

      return width >= config.minWidth && height >= config.minHeight;
    });
  }

  /**
   * Get images grouped by aspect ratio type
   */
  groupByAspectRatio(
    images: ImageMetadata[]
  ): Record<AspectRatioType | 'other', ImageMetadata[]> {
    const groups: Record<AspectRatioType | 'other', ImageMetadata[]> = {
      poster: [],
      square: [],
      landscape: [],
      portrait: [],
      other: [],
    };

    for (const image of images) {
      let ratio = image.aspectRatio;

      if (!ratio && image.width && image.height) {
        ratio = image.width / image.height;
      }

      if (!ratio) {
        groups.other.push(image);
        continue;
      }

      let matched = false;
      for (const [type, config] of Object.entries(ASPECT_RATIO_CONFIGS)) {
        const diff = Math.abs(ratio - config.ratio);
        if (diff <= config.tolerance) {
          groups[type as AspectRatioType].push(image);
          matched = true;
          break;
        }
      }

      if (!matched) {
        groups.other.push(image);
      }
    }

    return groups;
  }

  /**
   * Get best image per source
   */
  getBestPerSource(
    images: ImageMetadata[],
    config: EnrichmentConfig['preferredImageSize']
  ): Map<DataSource, ImageMetadata> {
    const sourceImages = new Map<DataSource, ImageMetadata[]>();

    // Group by source
    for (const image of images) {
      const current = sourceImages.get(image.source) || [];
      current.push(image);
      sourceImages.set(image.source, current);
    }

    // Select best from each source
    const bestPerSource = new Map<DataSource, ImageMetadata>();

    sourceImages.forEach((imgs, source) => {
      const best = this.selectBest(imgs, config);
      if (best) {
        bestPerSource.set(source, best);
      }
    });

    return bestPerSource;
  }

  /**
   * Update weights for scoring
   */
  setWeights(weights: Partial<ImageScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get current weights
   */
  getWeights(): ImageScoringWeights {
    return { ...this.weights };
  }
}

// Export singleton instance
export const ImageSelector = new ImageSelectorClass();

// Export class for testing and custom instances
export { ImageSelectorClass, type ImageScoringWeights, type AspectRatioType };
