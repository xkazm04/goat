/**
 * Image Generation Module
 * Smart image composition with auto-layout and visual balance
 */

// Types
export type {
  LayoutType,
  LayoutItem,
  LayoutOptions,
  LayoutPosition,
  LayoutCell,
  Layout,
  LayoutSuggestion,
  AspectRatio,
  ImageQualityMetrics,
  EnhancementOptions,
  EnhancementResult,
  CropRegion,
  FocalPoint,
  FocusPoint,
  VisualWeight,
  BalanceAnalysis,
  BalanceSuggestion,
  PlaceholderStyle,
  PlaceholderOptions,
  ExtractedColors,
  ColorHarmony,
  ColorHarmonyType,
  HarmonyType,
  ColorAdjustment,
} from './types';

// Layout Engine
export { LayoutEngine, createLayoutEngine } from './LayoutEngine';

// Balance Optimizer
export { BalanceOptimizer, createBalanceOptimizer } from './BalanceOptimizer';

// Image Enhancer
export { ImageEnhancer, createImageEnhancer } from './ImageEnhancer';

// Placeholder Generator
export {
  PlaceholderGenerator,
  createPlaceholderGenerator,
  generatePlaceholder,
} from './PlaceholderGenerator';

// Color Analyzer
export { ColorAnalyzer, createColorAnalyzer } from './ColorAnalyzer';

/**
 * Convenience function to create a complete image composition pipeline
 */
export function createCompositionPipeline(
  targetWidth: number,
  targetHeight: number
) {
  const { LayoutEngine: LE } = require('./LayoutEngine');
  const { BalanceOptimizer: BO } = require('./BalanceOptimizer');
  const { ImageEnhancer: IE } = require('./ImageEnhancer');
  const { PlaceholderGenerator: PG } = require('./PlaceholderGenerator');
  const { ColorAnalyzer: CA } = require('./ColorAnalyzer');

  const layoutEngine = new LE({ targetWidth, targetHeight });
  const balanceOptimizer = new BO(targetWidth, targetHeight);
  const imageEnhancer = new IE();
  const placeholderGenerator = new PG({
    width: Math.floor(targetWidth / 3),
    height: Math.floor(targetHeight / 3),
  });
  const colorAnalyzer = new CA();

  return {
    layoutEngine,
    balanceOptimizer,
    imageEnhancer,
    placeholderGenerator,
    colorAnalyzer,

    /**
     * Generate an optimized layout for items
     */
    generateOptimizedLayout(items: import('./types').LayoutItem[]) {
      // Generate initial layout
      let layout = layoutEngine.generateLayout(items);

      // Optimize for visual balance
      layout = balanceOptimizer.optimizeLayout(layout);

      return layout;
    },

    /**
     * Get layout suggestions for items
     */
    getLayoutSuggestions(items: import('./types').LayoutItem[]) {
      return layoutEngine.suggestLayouts(items);
    },

    /**
     * Analyze overall color harmony
     */
    analyzeCompositionColors(colorSets: import('./types').ExtractedColors[]) {
      return colorAnalyzer.analyzeHarmony(colorSets);
    },

    /**
     * Generate placeholder for missing image
     */
    getPlaceholder(rank?: number, text?: string) {
      return placeholderGenerator.generateDataURL(rank, text);
    },
  };
}
