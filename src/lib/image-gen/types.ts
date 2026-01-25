/**
 * Image Generation Types
 * Type definitions for smart image composition system
 */

/**
 * Layout type options
 */
export type LayoutType =
  | 'grid'          // Equal-sized grid cells
  | 'podium'        // Top 3 emphasized, rest in list
  | 'pyramid'       // Descending prominence
  | 'masonry'       // Pinterest-style varied sizes
  | 'featured'      // Single hero with supporting items
  | 'timeline'      // Horizontal scrolling style
  | 'cascade'       // Overlapping cascade effect
  | 'compact';      // Dense, minimal spacing

/**
 * Position within a layout
 */
export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  scale?: number;
}

/**
 * Layout cell definition
 */
export interface LayoutCell extends LayoutPosition {
  index: number;
  rank: number;
  emphasis: 'high' | 'medium' | 'low';
  showLabel: boolean;
  labelPosition: 'top' | 'bottom' | 'overlay' | 'none';
}

/**
 * Complete layout definition
 */
export interface Layout {
  type: LayoutType;
  cells: LayoutCell[];
  dimensions: {
    width: number;
    height: number;
  };
  metadata: {
    itemCount: number;
    aspectRatio: number;
    visualBalance: number; // 0-1 score
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

/**
 * Item data for layout
 */
export interface LayoutItem {
  id: string;
  rank?: number;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  score?: number;
  colors?: ExtractedColors;
  aspectRatio?: number;
  importance?: number;
  hasImage?: boolean;
}

/**
 * Extracted color palette from image
 */
export interface ExtractedColors {
  dominant: string;
  accent?: string;
  vibrant?: string;
  muted?: string;
  light?: string;
  dark?: string;
  palette?: string[];
}

/**
 * Harmony type for color relationships
 */
export type HarmonyType =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic'
  | 'monochromatic';

/**
 * Color harmony types (alias for compatibility)
 */
export type ColorHarmonyType = HarmonyType;

/**
 * Color harmony analysis result
 */
export interface ColorHarmony {
  type: HarmonyType;
  score: number; // 0-1
  colors: string[];
  contrastRatio: number;
  isAccessible: boolean;
  suggestedAdjustments: ColorAdjustment[];
}

/**
 * Color adjustment suggestion
 */
export interface ColorAdjustment {
  originalColor: string;
  adjustedColor: string;
  type: 'hue' | 'saturation' | 'lightness' | 'contrast';
  reason: string;
}

/**
 * Color scheme definition
 */
export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  harmony: HarmonyType;
  contrast: number; // WCAG contrast ratio
}

/**
 * Image quality metrics
 */
export interface ImageQualityMetrics {
  resolution: {
    width: number;
    height: number;
  };
  aspectRatio?: number;
  qualityScore: number; // 0-1
  brightness: number; // 0-1
  contrast: number; // 0-1
  saturation: number; // 0-1
  sharpness: number; // 0-1
  noiseLevel: number; // 0-1
  hasTransparency?: boolean;
  dominantColors?: string[];
  isLowQuality: boolean;
  needsEnhancement: boolean;
  suggestedEnhancements?: ImageEnhancementType[];
}

/**
 * Enhancement types
 */
export type ImageEnhancementType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'sharpness'
  | 'denoise'
  | 'upscale'
  | 'crop'
  | 'normalize';

/**
 * Enhancement options
 */
export interface EnhancementOptions {
  targetBrightness: number;
  targetContrast: number;
  targetSaturation: number;
  sharpenAmount: number;
  autoEnhance: boolean;
}

/**
 * Enhancement result
 */
export interface EnhancementResult {
  originalMetrics: ImageQualityMetrics;
  adjustments: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    sharpness?: number;
  };
  suggestions: string[];
  estimatedImprovement: number;
}

/**
 * Enhancement parameters
 */
export interface EnhancementParams {
  brightness?: number; // -1 to 1
  contrast?: number; // 0-2
  saturation?: number; // 0-2
  sharpness?: number; // 0-1
  denoise?: number; // 0-1
  scaleFactor?: number;
  crop?: CropRegion;
}

/**
 * Crop region definition
 */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Focal point for smart cropping
 */
export interface FocalPoint {
  x: number; // 0-1 relative position
  y: number; // 0-1 relative position
  weight: number; // 0-1 importance
}

/**
 * Cropping focus point (alias for compatibility)
 */
export interface FocusPoint {
  x: number; // 0-1 relative position
  y: number; // 0-1 relative position
  weight: number; // 0-1 importance
}

/**
 * Smart crop options
 */
export interface SmartCropOptions {
  targetAspectRatio: number;
  focusPoints?: FocalPoint[];
  preserveEdges?: boolean;
  minScale?: number;
  maxScale?: number;
}

/**
 * Placeholder style options
 */
export type PlaceholderStyle =
  | 'gradient'
  | 'pattern'
  | 'geometric'
  | 'minimal'
  | 'branded';

/**
 * Placeholder generation options
 */
export interface PlaceholderOptions {
  width: number;
  height: number;
  text?: string;
  style?: PlaceholderStyle;
  theme?: 'dark' | 'light' | 'vibrant';
  showRank?: boolean;
  icon?: 'image' | 'user' | 'music' | 'movie' | 'game' | 'book' | 'default';
  backgroundColor?: string;
  foregroundColor?: string;
  pattern?: 'solid' | 'gradient' | 'noise' | 'geometric';
  rank?: number;
}

/**
 * Aspect ratio presets
 */
export type AspectRatio = '1:1' | '4:3' | '16:9' | '3:2' | '2:3' | '9:16' | 'custom';

/**
 * Layout suggestion
 */
export interface LayoutSuggestion {
  type: LayoutType;
  score: number;
  reason: string;
}

/**
 * Visual weight calculation result
 */
export interface VisualWeight {
  position: { x: number; y: number };
  weight: number;
  area: number;
  colorWeight: number;
  contrastWeight: number;
}

/**
 * Balance analysis result
 */
export interface BalanceAnalysis {
  centerOfMass: { x: number; y: number };
  symmetryScore: number; // 0-1
  distributionScore: number; // 0-1
  overallBalance: number; // 0-1
  suggestions: BalanceSuggestion[];
}

/**
 * Balance improvement suggestion
 */
export interface BalanceSuggestion {
  type: 'move' | 'resize' | 'add' | 'remove' | 'reorder';
  target: number; // cell index
  description: string;
  improvement: number; // expected improvement 0-1
  params?: Record<string, unknown>;
}

/**
 * Composition result
 */
export interface CompositionResult {
  layout: Layout;
  colorScheme: ColorScheme;
  balance: BalanceAnalysis;
  items: ProcessedItem[];
  renderInstructions: RenderInstruction[];
}

/**
 * Processed item with all computed properties
 */
export interface ProcessedItem extends LayoutItem {
  cell: LayoutCell;
  processedImageUrl?: string;
  placeholder?: string;
  enhancementApplied: ImageEnhancementType[];
  qualityMetrics?: ImageQualityMetrics;
}

/**
 * Render instruction for canvas/SVG
 */
export interface RenderInstruction {
  type: 'background' | 'image' | 'text' | 'shape' | 'decoration';
  layer: number;
  bounds: LayoutPosition;
  content: RenderContent;
  effects?: RenderEffect[];
}

/**
 * Content for render instruction
 */
export type RenderContent =
  | { type: 'image'; url: string; fit: 'cover' | 'contain' | 'fill' }
  | { type: 'text'; text: string; font: string; size: number; color: string; align: 'left' | 'center' | 'right' }
  | { type: 'rect'; color: string; radius?: number }
  | { type: 'gradient'; colors: string[]; direction: number }
  | { type: 'pattern'; patternType: string; colors: string[] };

/**
 * Visual effects for render
 */
export interface RenderEffect {
  type: 'shadow' | 'blur' | 'opacity' | 'border' | 'glow';
  params: Record<string, number | string>;
}

/**
 * Layout generation options
 */
export interface LayoutOptions {
  layoutType?: LayoutType | 'auto';
  targetWidth?: number;
  targetHeight?: number;
  itemCount?: number;
  emphasizeTop?: number; // how many top items to emphasize
  padding?: number;
  spacing?: number;
  gap?: number;
  maxColumns?: number;
  showRankNumbers?: boolean;
  showLabels?: boolean;
}

/**
 * Auto-layout selection criteria
 */
export interface AutoLayoutCriteria {
  itemCount: number;
  hasImages: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  category?: string;
  targetAspectRatio: number;
}
