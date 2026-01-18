/**
 * AI Generated Images Types
 *
 * Types for Direction 3: AI Results - Leonardo AI image generation
 */

/**
 * AI provider options
 */
export type AIProvider = 'leonardo' | 'replicate' | 'openai' | 'mock';

/**
 * AI generated image database record
 */
export interface AIGeneratedImage {
  id: string;
  list_id: string | null;
  user_id: string | null;
  list_title: string;
  category: string | null;

  // Generation config
  style_preset: string;
  custom_prompt: string | null;
  provider: AIProvider;
  model_id: string | null;

  // Image data
  image_url: string;
  thumbnail_url: string | null;
  width: number;
  height: number;

  // Cache key
  items_hash: string;
  items_snapshot: AIImageItemSnapshot[];

  // Metrics
  generation_time_ms: number | null;
  prompt_used: string | null;

  // User interaction
  is_favorited: boolean;
  download_count: number;
  share_count: number;

  // Timestamps
  created_at: string;
  expires_at: string;
}

/**
 * Item snapshot stored with generated image
 */
export interface AIImageItemSnapshot {
  position: number;
  itemId: string;
  title: string;
  imageUrl?: string;
}

/**
 * AI image for client-side display (camelCase)
 */
export interface AIGeneratedImageClient {
  id: string;
  listId: string | null;
  userId: string | null;
  listTitle: string;
  category: string | null;

  stylePreset: string;
  customPrompt: string | null;
  provider: AIProvider;

  imageUrl: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;

  itemsHash: string;
  itemsSnapshot: AIImageItemSnapshot[];

  generationTimeMs: number | null;
  isFavorited: boolean;
  downloadCount: number;
  shareCount: number;

  createdAt: Date;
  expiresAt: Date;
}

/**
 * Request to generate AI image
 */
export interface AIImageGenerateRequest {
  listTitle: string;
  category: string;
  items: AIImageItemSnapshot[];
  stylePreset: string;
  customPrompt?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Response from AI image generation
 */
export interface AIImageGenerateResponse {
  success: boolean;
  image?: AIGeneratedImageClient;
  cached: boolean;
  generationTimeMs?: number;
  error?: string;
}

/**
 * AI image history query params
 */
export interface AIImageHistoryParams {
  userId?: string;
  limit?: number;
  offset?: number;
  favoritedOnly?: boolean;
}

/**
 * AI image history response
 */
export interface AIImageHistoryResponse {
  images: AIGeneratedImageClient[];
  total: number;
  hasMore: boolean;
}

/**
 * Convert database record to client format
 */
export function toClientAIImage(db: AIGeneratedImage): AIGeneratedImageClient {
  return {
    id: db.id,
    listId: db.list_id,
    userId: db.user_id,
    listTitle: db.list_title,
    category: db.category,
    stylePreset: db.style_preset,
    customPrompt: db.custom_prompt,
    provider: db.provider,
    imageUrl: db.image_url,
    thumbnailUrl: db.thumbnail_url,
    width: db.width,
    height: db.height,
    itemsHash: db.items_hash,
    itemsSnapshot: db.items_snapshot,
    generationTimeMs: db.generation_time_ms,
    isFavorited: db.is_favorited,
    downloadCount: db.download_count,
    shareCount: db.share_count,
    createdAt: new Date(db.created_at),
    expiresAt: new Date(db.expires_at),
  };
}

/**
 * Generate items hash for cache lookup
 */
export function generateItemsHash(items: AIImageItemSnapshot[]): string {
  const sortedIds = items
    .sort((a, b) => a.position - b.position)
    .map(i => `${i.position}:${i.itemId}`)
    .join('|');

  // Simple hash function (for real use, consider crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < sortedIds.length; i++) {
    const char = sortedIds.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Social media dimensions presets
 */
export const SOCIAL_DIMENSIONS = {
  twitter: { width: 1200, height: 675 },
  instagram: { width: 1080, height: 1080 },
  discord: { width: 800, height: 600 },
  reddit: { width: 1200, height: 800 },
  youtube: { width: 1280, height: 720 },
} as const;

export type SocialPlatform = keyof typeof SOCIAL_DIMENSIONS;
