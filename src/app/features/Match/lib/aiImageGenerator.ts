/**
 * AI Image Generator Orchestration
 *
 * Core orchestration layer for AI-powered image generation.
 * Handles API communication, caching, and fallback logic.
 */

import type {
  AIGenerationRequest,
  AIGenerationResponse,
  GeneratedImage,
  GenerationProgress,
  GenerationStatus,
  GenerationHistoryEntry,
} from './ai/types';
import { buildSDPrompt, buildDALLEPrompt, sanitizeCustomPrompt } from './promptBuilder';
import { getAIStyleConfig } from './ai/stylePresets';

/**
 * AI provider configuration
 */
export type AIProvider = 'replicate' | 'openai' | 'stability' | 'mock';

/**
 * Generator configuration
 */
export interface AIGeneratorConfig {
  provider: AIProvider;
  apiEndpoint: string;
  maxRetries: number;
  timeoutMs: number;
  enableCaching: boolean;
  fallbackToTemplate: boolean;
}

const DEFAULT_CONFIG: AIGeneratorConfig = {
  provider: 'replicate',
  apiEndpoint: '/api/generate-ai-image',
  maxRetries: 2,
  timeoutMs: 60000, // 60 seconds
  enableCaching: true,
  fallbackToTemplate: true,
};

/**
 * Generation cache for cost optimization
 */
const generationCache = new Map<string, AIGenerationResponse>();

/**
 * Generation history (in-memory, could be persisted)
 */
let generationHistory: GenerationHistoryEntry[] = [];

/**
 * Progress callback type
 */
type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Generate a cache key for a request
 */
function generateCacheKey(request: AIGenerationRequest): string {
  const itemsKey = request.items.map(i => `${i.position}:${i.title}`).join('|');
  const customKey = request.customPrompt || '';
  return `${request.listTitle}:${request.category}:${request.style}:${itemsKey}:${customKey}`;
}

/**
 * Check if a cached result exists
 */
export function getCachedGeneration(request: AIGenerationRequest): AIGenerationResponse | null {
  const key = generateCacheKey(request);
  return generationCache.get(key) || null;
}

/**
 * Save a result to cache
 */
function cacheGeneration(request: AIGenerationRequest, response: AIGenerationResponse): void {
  const key = generateCacheKey(request);
  generationCache.set(key, response);

  // Limit cache size (LRU-like, just remove oldest)
  if (generationCache.size > 50) {
    const firstKey = generationCache.keys().next().value;
    if (firstKey) generationCache.delete(firstKey);
  }
}

/**
 * Main AI image generation function
 */
export async function generateAIImage(
  request: AIGenerationRequest,
  onProgress?: ProgressCallback,
  config: Partial<AIGeneratorConfig> = {}
): Promise<AIGenerationResponse> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Sanitize custom prompt if provided
  if (request.customPrompt) {
    request.customPrompt = sanitizeCustomPrompt(request.customPrompt);
  }

  // Check cache first
  if (fullConfig.enableCaching) {
    const cached = getCachedGeneration(request);
    if (cached) {
      onProgress?.({
        status: 'completed',
        progress: 100,
        message: 'Loaded from cache',
      });
      return cached;
    }
  }

  // Start generation
  onProgress?.({
    status: 'queued',
    progress: 0,
    message: 'Preparing generation request...',
  });

  try {
    const response = await executeGeneration(request, fullConfig, onProgress);

    // Cache successful result
    if (fullConfig.enableCaching) {
      cacheGeneration(request, response);
    }

    // Add to history
    addToHistory(request, response);

    return response;
  } catch (error) {
    // If fallback is enabled and we have a template-based fallback
    if (fullConfig.fallbackToTemplate) {
      onProgress?.({
        status: 'processing',
        progress: 80,
        message: 'Using template fallback...',
      });

      // Return a fallback response that signals to use template
      return createFallbackResponse(request, error as Error);
    }

    throw error;
  }
}

/**
 * Execute the actual API call
 */
async function executeGeneration(
  request: AIGenerationRequest,
  config: AIGeneratorConfig,
  onProgress?: ProgressCallback
): Promise<AIGenerationResponse> {
  const startTime = Date.now();

  onProgress?.({
    status: 'generating',
    progress: 10,
    message: 'Building prompt...',
    estimatedTimeRemaining: 25000,
  });

  // Build the appropriate prompt based on provider
  const builtPrompt = config.provider === 'openai'
    ? buildDALLEPrompt(request)
    : buildSDPrompt(request);

  onProgress?.({
    status: 'generating',
    progress: 20,
    message: 'Sending to AI service...',
    estimatedTimeRemaining: 22000,
  });

  // Make API call with retry logic
  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts < config.maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request,
          prompt: builtPrompt.prompt,
          negativePrompt: builtPrompt.negativePrompt,
          provider: config.provider,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      // Handle streaming progress updates if supported
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return await handleStreamingResponse(response, onProgress, startTime);
      }

      // Regular JSON response
      const data = await response.json();

      onProgress?.({
        status: 'completed',
        progress: 100,
        message: 'Generation complete!',
      });

      return {
        images: data.images || [],
        generationId: data.generationId || crypto.randomUUID(),
        generationTime: Date.now() - startTime,
        creditsUsed: data.creditsUsed || 1,
        promptUsed: builtPrompt.prompt,
      };
    } catch (error) {
      lastError = error as Error;
      attempts++;

      if (attempts < config.maxRetries) {
        onProgress?.({
          status: 'generating',
          progress: 20 + attempts * 10,
          message: `Retrying... (attempt ${attempts + 1}/${config.maxRetries})`,
        });
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
  }

  throw lastError || new Error('Generation failed after retries');
}

/**
 * Handle streaming response for real-time progress
 */
async function handleStreamingResponse(
  response: Response,
  onProgress?: ProgressCallback,
  startTime: number = Date.now()
): Promise<AIGenerationResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let result: AIGenerationResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'progress') {
            onProgress?.({
              status: 'generating',
              progress: data.progress,
              message: data.message,
              estimatedTimeRemaining: data.estimatedTimeRemaining,
            });
          } else if (data.type === 'complete') {
            result = {
              images: data.images,
              generationId: data.generationId,
              generationTime: Date.now() - startTime,
              creditsUsed: data.creditsUsed || 1,
              promptUsed: data.promptUsed,
            };
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new Error('No result received from stream');
  }

  onProgress?.({
    status: 'completed',
    progress: 100,
    message: 'Generation complete!',
  });

  return result;
}

/**
 * Create a fallback response when AI generation fails
 */
function createFallbackResponse(request: AIGenerationRequest, error: Error): AIGenerationResponse {
  const styleConfig = getAIStyleConfig(request.style);

  // Return empty images array to signal fallback to template
  return {
    images: [],
    generationId: `fallback-${crypto.randomUUID()}`,
    generationTime: 0,
    creditsUsed: 0,
    promptUsed: `FALLBACK: ${error.message}`,
  };
}

/**
 * Add generation to history
 */
function addToHistory(request: AIGenerationRequest, response: AIGenerationResponse): void {
  const entry: GenerationHistoryEntry = {
    id: response.generationId,
    createdAt: new Date().toISOString(),
    request,
    response,
    favorited: false,
  };

  generationHistory.unshift(entry);

  // Keep only last 100 entries
  if (generationHistory.length > 100) {
    generationHistory = generationHistory.slice(0, 100);
  }
}

/**
 * Get generation history
 */
export function getGenerationHistory(): GenerationHistoryEntry[] {
  return [...generationHistory];
}

/**
 * Toggle favorite status for a generation
 */
export function toggleFavorite(generationId: string): boolean {
  const entry = generationHistory.find(e => e.id === generationId);
  if (entry) {
    entry.favorited = !entry.favorited;
    return entry.favorited;
  }
  return false;
}

/**
 * Get favorited generations
 */
export function getFavorites(): GenerationHistoryEntry[] {
  return generationHistory.filter(e => e.favorited);
}

/**
 * Delete a generation from history
 */
export function deleteFromHistory(generationId: string): boolean {
  const index = generationHistory.findIndex(e => e.id === generationId);
  if (index >= 0) {
    generationHistory.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Clear all generation history
 */
export function clearHistory(): void {
  generationHistory = [];
}

/**
 * Clear generation cache
 */
export function clearCache(): void {
  generationCache.clear();
}

/**
 * Estimate cost for a generation request
 */
export function estimateGenerationCost(request: AIGenerationRequest): {
  estimatedCredits: number;
  estimatedCostUSD: number;
  estimatedTimeSeconds: number;
} {
  const baseCredits = 1;
  const numVariations = request.numVariations || 1;

  // Higher resolution = more cost
  const resolutionMultiplier = request.dimensions.width > 1024 ? 1.5 : 1;

  const estimatedCredits = baseCredits * numVariations * resolutionMultiplier;

  return {
    estimatedCredits,
    estimatedCostUSD: estimatedCredits * 0.05, // ~$0.05 per credit
    estimatedTimeSeconds: 15 + (numVariations - 1) * 10, // ~15s base + 10s per variation
  };
}

/**
 * Generate multiple variations in batch
 */
export async function generateBatchVariations(
  request: AIGenerationRequest,
  numVariations: number,
  onProgress?: ProgressCallback
): Promise<AIGenerationResponse[]> {
  const results: AIGenerationResponse[] = [];

  for (let i = 0; i < numVariations; i++) {
    onProgress?.({
      status: 'generating',
      progress: (i / numVariations) * 100,
      message: `Generating variation ${i + 1} of ${numVariations}...`,
    });

    const result = await generateAIImage(
      {
        ...request,
        numVariations: 1,
      },
      undefined,
      { enableCaching: false } // Don't cache batch variations
    );

    results.push(result);
  }

  onProgress?.({
    status: 'completed',
    progress: 100,
    message: `Generated ${numVariations} variations!`,
  });

  return results;
}
