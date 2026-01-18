/**
 * AI Image Generation Types
 *
 * Type definitions for the AI-powered artwork generation system.
 */

/**
 * AI style presets for image generation
 */
export type AIStylePreset =
  | 'minimalist'
  | 'fantasy'
  | 'retro_80s'
  | 'retro_90s'
  | 'vaporwave'
  | 'neon_noir'
  | 'watercolor'
  | 'comic_book'
  | 'pixel_art'
  | 'sports_arena'
  | 'movie_poster'
  | 'album_cover'
  | 'gaming'
  | 'elegant'
  | 'graffiti'
  | 'cinematic'
  | 'anime'
  | 'vintage_film'
  | 'neon_pop'
  | 'kawaii';

/**
 * Category themes for context-aware generation
 */
export type CategoryTheme =
  | 'movies'
  | 'music'
  | 'sports'
  | 'games'
  | 'anime'
  | 'food'
  | 'travel'
  | 'technology'
  | 'books'
  | 'general';

/**
 * AI style configuration
 */
export interface AIStyleConfig {
  id: AIStylePreset;
  name: string;
  description: string;
  promptModifiers: string[];
  negativePrompt: string;
  colorScheme: string[];
  thumbnailGradient: string;
  recommendedFor: CategoryTheme[];
  isPremium?: boolean;
}

/**
 * AI generation request configuration
 */
export interface AIGenerationRequest {
  /** List title for the ranking */
  listTitle: string;
  /** Category of the ranking */
  category: string;
  /** Subcategory if available */
  subcategory?: string;
  /** Ranked items (top 10) */
  items: { position: number; title: string }[];
  /** Selected AI style preset */
  style: AIStylePreset;
  /** Custom user prompt (optional) */
  customPrompt?: string;
  /** Image dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Number of variations to generate */
  numVariations?: number;
}

/**
 * AI generation response
 */
export interface AIGenerationResponse {
  /** Generated image URLs */
  images: GeneratedImage[];
  /** Generation ID for tracking */
  generationId: string;
  /** Time taken to generate (ms) */
  generationTime: number;
  /** Credits/cost used */
  creditsUsed: number;
  /** Prompt that was used */
  promptUsed: string;
}

/**
 * Generated image data
 */
export interface GeneratedImage {
  /** Unique image ID */
  id: string;
  /** Image URL (temporary) */
  url: string;
  /** Base64 data (for caching) */
  base64?: string;
  /** Image dimensions */
  width: number;
  height: number;
  /** Generation seed for reproducibility */
  seed?: number;
  /** Variation index */
  variationIndex: number;
}

/**
 * Generation history entry
 */
export interface GenerationHistoryEntry {
  id: string;
  createdAt: string;
  request: AIGenerationRequest;
  response: AIGenerationResponse;
  favorited: boolean;
  listId?: string;
}

/**
 * Image editing operations
 */
export type ImageEditOperation =
  | { type: 'crop'; x: number; y: number; width: number; height: number }
  | { type: 'brightness'; value: number }
  | { type: 'contrast'; value: number }
  | { type: 'saturation'; value: number }
  | { type: 'blur'; value: number }
  | { type: 'sharpen'; value: number }
  | { type: 'filter'; filter: ImageFilter }
  | { type: 'overlay'; text: string; position: 'top' | 'bottom' | 'center' };

/**
 * Preset image filters
 */
export type ImageFilter =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'dramatic'
  | 'vivid';

/**
 * AI generation status
 */
export type GenerationStatus =
  | 'idle'
  | 'queued'
  | 'generating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Generation progress update
 */
export interface GenerationProgress {
  status: GenerationStatus;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // ms
}

/**
 * Export format options
 */
export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0-100 for jpeg/webp
  scale: 1 | 2 | 3; // Resolution multiplier
}
