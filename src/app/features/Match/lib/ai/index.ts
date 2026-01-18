/**
 * AI Image Generation Module
 *
 * Exports all AI-related types, utilities, and configurations
 * for the AI-powered artwork generation feature.
 */

// Types
export type {
  AIStylePreset,
  CategoryTheme,
  AIStyleConfig,
  AIGenerationRequest,
  AIGenerationResponse,
  GeneratedImage,
  GenerationHistoryEntry,
  ImageEditOperation,
  ImageFilter,
  GenerationStatus,
  GenerationProgress,
  ExportOptions,
} from './types';

// Style Presets
export {
  AI_STYLE_PRESETS,
  AI_STYLE_PRESET_LIST,
  getRecommendedStyles,
  mapCategoryToTheme,
  getAIStyleConfig,
  getFreeStyles,
  DEFAULT_AI_STYLE,
} from './stylePresets';
