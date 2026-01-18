/**
 * Leonardo AI Image Generation Service
 * Direct integration with Leonardo API (v1 and v2)
 *
 * Copied from story project for Direction 3: AI Results
 */

// Leonardo Models
export enum LeonardoModel {
  PHOENIX_1_0 = 'phoenix_1.0',
  PHOENIX_0_9 = 'phoenix_0.9',
  FLUX_SPEED = 'flux_speed',
  FLUX_DEV = 'flux_dev',
  FLUX_2 = 'flux_2', // Uses API v2
}

// Leonardo Presets
export enum LeonardoPreset {
  CREATIVE = 'Creative',
  DYNAMIC = 'Dynamic',
  RETRO = 'Retro',
  STOCK_PHOTO = 'Stock Photo',
  CINEMATIC = 'Cinematic',
  SKETCH_BW = 'Sketch (B&W)',
  SKETCH_COLOR = 'Sketch (Color)',
  ILLUSTRATION = 'Illustration',
}

// Model IDs mapping
export const MODEL_IDS: Record<LeonardoModel, string> = {
  [LeonardoModel.PHOENIX_1_0]: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3',
  [LeonardoModel.PHOENIX_0_9]: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
  [LeonardoModel.FLUX_SPEED]: '1dd50843-d653-4516-a8e3-f0238ee453ff',
  [LeonardoModel.FLUX_DEV]: 'b2614463-296c-462a-9586-aafdb8f00e36',
  [LeonardoModel.FLUX_2]: 'flux-pro-2.0', // API v2 model name
};

// Preset IDs mapping
export const PRESET_IDS: Record<LeonardoPreset, string> = {
  [LeonardoPreset.CREATIVE]: '6fedbf1f-4a17-45ec-84fb-92fe524a29ef',
  [LeonardoPreset.DYNAMIC]: '111dc692-d470-4eec-b791-3475abac4c46',
  [LeonardoPreset.RETRO]: '6105baa2-851b-446e-9db5-08a671a8c42f',
  [LeonardoPreset.STOCK_PHOTO]: '5bdc3f2a-1be6-4d1c-8e77-992a30824a2c',
  [LeonardoPreset.CINEMATIC]: 'a5632c7c-ddbb-4e2f-ba34-8456ab3ac436',
  [LeonardoPreset.SKETCH_BW]: 'be8c6b58-739c-4d44-b9c1-b032ed308b61',
  [LeonardoPreset.SKETCH_COLOR]: '093accc3-7633-4ffd-82da-d34000dfc0d6',
  [LeonardoPreset.ILLUSTRATION]: '645e4195-f63d-4715-a3f2-3fb1e6eb8c70',
};

// Models that use API v2
const API_V2_MODELS = new Set([LeonardoModel.FLUX_2]);

// Default values
export const DEFAULT_MODEL = LeonardoModel.PHOENIX_1_0;
export const DEFAULT_PRESET = LeonardoPreset.DYNAMIC;

// Request/Response types
export interface LeonardoGenerateRequest {
  prompt: string;
  width?: number;
  height?: number;
  numImages?: number;
  model?: string;
  presetStyle?: string;
  negativePrompt?: string;
  referenceImages?: string[];
  referenceStrength?: number;
}

export interface GeneratedImage {
  url: string;
  id?: string;
  width: number;
  height: number;
  nsfw?: boolean;
}

export interface LeonardoGenerateResponse {
  success: boolean;
  images: GeneratedImage[];
  generationId: string;
  provider: string;
  prompt: string;
  error?: string;
}

/**
 * Leonardo AI Service
 */
export class LeonardoService {
  private apiKey: string;
  private baseUrlV1 = 'https://cloud.leonardo.ai/api/rest/v1';
  private baseUrlV2 = 'https://cloud.leonardo.ai/api/rest/v2';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LEONARDO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'Leonardo API key is required. Set LEONARDO_API_KEY environment variable.'
      );
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Check if Leonardo API is available
   */
  static isAvailable(): boolean {
    return !!process.env.LEONARDO_API_KEY;
  }

  /**
   * Normalize dimensions to Leonardo requirements (divisible by 8, 32-1536 range)
   */
  private normalizeDimensions(
    width: number,
    height: number
  ): { width: number; height: number } {
    const normalizedWidth = Math.max(
      32,
      Math.min(1536, Math.floor(width / 8) * 8)
    );
    const normalizedHeight = Math.max(
      32,
      Math.min(1536, Math.floor(height / 8) * 8)
    );
    return { width: normalizedWidth, height: normalizedHeight };
  }

  /**
   * Resolve model string to model ID
   */
  private resolveModelId(model?: string): string {
    if (!model) {
      return MODEL_IDS[DEFAULT_MODEL];
    }

    // Check if it's an enum value
    for (const [, value] of Object.entries(LeonardoModel)) {
      if (value === model) {
        return MODEL_IDS[value as LeonardoModel];
      }
    }

    // If it looks like a UUID, return as is
    if (model.includes('-') && model.length > 30) {
      return model;
    }

    return MODEL_IDS[DEFAULT_MODEL];
  }

  /**
   * Check if model requires API v2
   */
  private isV2Model(model?: string): boolean {
    if (!model) return false;
    return API_V2_MODELS.has(model as LeonardoModel);
  }

  /**
   * Resolve preset style to UUID
   */
  private resolvePresetStyle(preset?: string): string | undefined {
    if (!preset) {
      return PRESET_IDS[DEFAULT_PRESET];
    }

    // Check if it's an enum value
    for (const [, value] of Object.entries(LeonardoPreset)) {
      if (value === preset || value.toLowerCase() === preset.toLowerCase()) {
        return PRESET_IDS[value as LeonardoPreset];
      }
    }

    // If it looks like a UUID, return as is
    if (preset.includes('-') && preset.length > 30) {
      return preset;
    }

    return PRESET_IDS[DEFAULT_PRESET];
  }

  /**
   * Build API v1 request payload
   */
  private buildV1Request(
    request: LeonardoGenerateRequest
  ): Record<string, unknown> {
    const { width, height } = this.normalizeDimensions(
      request.width || 512,
      request.height || 512
    );

    const modelId = this.resolveModelId(request.model);
    const presetStyle = this.resolvePresetStyle(request.presetStyle);

    const payload: Record<string, unknown> = {
      alchemy: true,
      height,
      width,
      modelId,
      prompt: request.prompt,
      num_images: Math.min(Math.max(request.numImages || 1, 1), 8),
      contrast: 3.5,
    };

    if (presetStyle) {
      payload.styleUUID = presetStyle;
    }

    if (request.negativePrompt) {
      payload.negativePrompt = request.negativePrompt;
    }

    return payload;
  }

  /**
   * Build API v2 request payload (for Flux 2)
   */
  private buildV2Request(
    request: LeonardoGenerateRequest
  ): Record<string, unknown> {
    const { width, height } = this.normalizeDimensions(
      request.width || 512,
      request.height || 512
    );

    const payload: Record<string, unknown> = {
      public: false,
      model: MODEL_IDS[LeonardoModel.FLUX_2],
      parameters: {
        prompt: request.prompt,
        quantity: Math.min(Math.max(request.numImages || 1, 1), 8),
        width,
        height,
      },
    };

    // Add reference images if provided
    if (request.referenceImages && request.referenceImages.length > 0) {
      const imageReferences = request.referenceImages.slice(0, 4).map((url) => ({
        image: { url },
        strength: request.referenceStrength || 0.75,
      }));

      payload.guidances = {
        image_reference: imageReferences,
      };
    }

    return payload;
  }

  /**
   * Poll for generation completion (API v1)
   */
  private async pollGenerationV1(
    generationId: string,
    maxAttempts = 60,
    pollInterval = 2000
  ): Promise<GeneratedImage[]> {
    const url = `${this.baseUrlV1}/generations/${generationId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers,
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.statusText}`);
        }

        const data = await response.json();
        const generationData = data.generations_by_pk || {};
        const generatedImages = generationData.generated_images || [];

        if (generatedImages.length > 0) {
          return generatedImages.map(
            (img: { url: string; id: string; nsfw?: boolean }) => ({
              url: img.url,
              id: img.id,
              width: 0,
              height: 0,
              nsfw: img.nsfw || false,
            })
          );
        }

        const status = generationData.status;
        if (status === 'FAILED') {
          throw new Error('Leonardo generation failed');
        }
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Generation timed out after ${(maxAttempts * pollInterval) / 1000} seconds`
    );
  }

  /**
   * Poll for generation completion (API v2)
   */
  private async pollGenerationV2(
    generationId: string,
    maxAttempts = 60,
    pollInterval = 2000
  ): Promise<GeneratedImage[]> {
    const url = `${this.baseUrlV2}/generations/${generationId}`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers,
        });

        if (!response.ok) {
          throw new Error(`V2 Polling failed: ${response.statusText}`);
        }

        const data = await response.json();
        const generationData = data.generation || {};
        const status = generationData.status;

        if (status === 'COMPLETE') {
          const generatedImages = generationData.generated_images || [];
          return generatedImages.map(
            (img: { url: string; id: string; nsfw?: boolean }) => ({
              url: img.url,
              id: img.id,
              width: 0,
              height: 0,
              nsfw: img.nsfw || false,
            })
          );
        }

        if (status === 'FAILED') {
          throw new Error('Leonardo v2 generation failed');
        }
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `V2 generation timed out after ${(maxAttempts * pollInterval) / 1000} seconds`
    );
  }

  /**
   * Generate images using Leonardo API
   */
  async generateImages(
    request: LeonardoGenerateRequest
  ): Promise<LeonardoGenerateResponse> {
    const useV2 = this.isV2Model(request.model);
    const baseUrl = useV2 ? this.baseUrlV2 : this.baseUrlV1;
    const payload = useV2
      ? this.buildV2Request(request)
      : this.buildV1Request(request);

    // Start generation
    const generateResponse = await fetch(`${baseUrl}/generations`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Leonardo API error: ${generateResponse.statusText}`
      );
    }

    const generateData = await generateResponse.json();

    // Extract generation ID
    let generationId: string;
    if (useV2) {
      generationId =
        generateData.generation?.id ||
        generateData.generationId ||
        generateData.id;
    } else {
      generationId = generateData.sdGenerationJob?.generationId;
    }

    if (!generationId) {
      throw new Error('Failed to get generation ID from Leonardo API');
    }

    // Poll for completion
    const images = useV2
      ? await this.pollGenerationV2(generationId)
      : await this.pollGenerationV1(generationId);

    // Normalize dimensions for response
    const { width, height } = this.normalizeDimensions(
      request.width || 512,
      request.height || 512
    );

    return {
      success: true,
      images: images.map((img) => ({
        ...img,
        width,
        height,
      })),
      generationId,
      provider: 'leonardo',
      prompt: request.prompt,
    };
  }
}

/**
 * Get Leonardo service instance
 */
export function getLeonardoService(): LeonardoService {
  return new LeonardoService();
}

/**
 * Map category to recommended Leonardo preset
 */
export function getRecommendedPreset(category: string): LeonardoPreset {
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('movie') || categoryLower.includes('film') || categoryLower.includes('tv')) {
    return LeonardoPreset.CINEMATIC;
  }

  if (categoryLower.includes('sport') || categoryLower.includes('game') || categoryLower.includes('athlete')) {
    return LeonardoPreset.DYNAMIC;
  }

  if (categoryLower.includes('music') || categoryLower.includes('album') || categoryLower.includes('artist')) {
    return LeonardoPreset.CREATIVE;
  }

  if (categoryLower.includes('anime') || categoryLower.includes('manga')) {
    return LeonardoPreset.ILLUSTRATION;
  }

  if (categoryLower.includes('retro') || categoryLower.includes('classic') || categoryLower.includes('vintage')) {
    return LeonardoPreset.RETRO;
  }

  return LeonardoPreset.DYNAMIC;
}
