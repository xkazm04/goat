import { NextRequest, NextResponse } from 'next/server';
import type { AIGenerationRequest, AIGenerationResponse, GeneratedImage } from '@/app/features/Match/lib/ai/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Maximum timeout for AI generation (30 seconds)
export const maxDuration = 30;

/**
 * AI Provider types we support
 */
type AIProvider = 'replicate' | 'openai' | 'stability' | 'mock';

/**
 * Request body structure
 */
interface GenerateRequestBody {
  request: AIGenerationRequest;
  prompt: string;
  negativePrompt?: string;
  provider: AIProvider;
}

/**
 * Mock image generation for development/demo
 * Returns placeholder images styled to match the requested style
 */
async function generateMockImage(
  request: AIGenerationRequest,
  prompt: string
): Promise<AIGenerationResponse> {
  // Simulate generation time (2-5 seconds)
  const delay = 2000 + Math.random() * 3000;
  await new Promise(resolve => setTimeout(resolve, delay));

  // Generate a deterministic seed based on request
  const seed = hashCode(JSON.stringify(request));

  // Create placeholder image URL using a gradient service
  // In production, this would be replaced with actual AI generation
  const placeholderImages: GeneratedImage[] = [];
  const numVariations = request.numVariations || 1;

  for (let i = 0; i < numVariations; i++) {
    placeholderImages.push({
      id: `mock-${seed}-${i}`,
      url: generatePlaceholderUrl(request, seed + i),
      width: request.dimensions.width,
      height: request.dimensions.height,
      seed: seed + i,
      variationIndex: i,
    });
  }

  return {
    images: placeholderImages,
    generationId: `mock-gen-${seed}`,
    generationTime: delay,
    creditsUsed: 0, // Mock doesn't use credits
    promptUsed: prompt,
  };
}

/**
 * Generate a placeholder URL for demo purposes
 */
function generatePlaceholderUrl(request: AIGenerationRequest, seed: number): string {
  // Use a gradient placeholder service
  const colors = getStyleColors(request.style);
  const width = request.dimensions.width;
  const height = request.dimensions.height;

  // Create an SVG-based placeholder that looks like a ranking image
  // In production, this would be an actual AI-generated image URL
  const svg = createRankingPlaceholderSVG(request, colors);
  const base64 = Buffer.from(svg).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get colors for a style
 */
function getStyleColors(style: string): string[] {
  const styleColors: Record<string, string[]> = {
    minimalist: ['#F8F9FA', '#E9ECEF', '#212529'],
    fantasy: ['#1A1A2E', '#4A3F6B', '#FFD700'],
    retro_80s: ['#FF00FF', '#00FFFF', '#000033'],
    retro_90s: ['#FF6B35', '#2EC4B6', '#011627'],
    vaporwave: ['#FF71CE', '#01CDFE', '#B967FF'],
    neon_noir: ['#0D0D0D', '#FF2A6D', '#05D9E8'],
    watercolor: ['#E8D5B7', '#7EB5A6', '#F67280'],
    comic_book: ['#FFEB3B', '#FF5252', '#2196F3'],
    pixel_art: ['#0F380F', '#306230', '#9BBC0F'],
    sports_arena: ['#1A1A1A', '#C9A227', '#B22222'],
    movie_poster: ['#0A0A0A', '#1C1C1C', '#C49B26'],
    album_cover: ['#1D1D1D', '#3D3D3D', '#D4AF37'],
    gaming: ['#0D0D0D', '#00FF87', '#FF00FF'],
    elegant: ['#0D0D0D', '#D4AF37', '#FFFFFF'],
    graffiti: ['#FF4500', '#FFD700', '#32CD32'],
    // New styles
    cinematic: ['#0A0A0A', '#1C1C1C', '#D4AF37'],
    anime: ['#FF6B9D', '#C085F7', '#7DD3FC'],
    vintage_film: ['#2C1810', '#8B7355', '#D4AF37'],
    neon_pop: ['#FF00FF', '#00FF00', '#FFFF00'],
    kawaii: ['#FFB6C1', '#87CEEB', '#DDA0DD'],
  };

  return styleColors[style] || styleColors.minimalist;
}

/**
 * Create an SVG placeholder that looks like a ranking image
 */
function createRankingPlaceholderSVG(request: AIGenerationRequest, colors: string[]): string {
  const { width, height, listTitle, items, style } = {
    width: request.dimensions.width,
    height: request.dimensions.height,
    listTitle: request.listTitle,
    items: request.items.slice(0, 5),
    style: request.style,
  };

  const [bgColor1, bgColor2, accentColor] = colors;

  // Generate item list
  const itemsHtml = items
    .map((item, i) => {
      const y = 180 + i * 60;
      return `
        <rect x="80" y="${y}" width="${width - 160}" height="50" rx="8" fill="rgba(255,255,255,0.1)"/>
        <text x="110" y="${y + 32}" fill="${accentColor}" font-size="24" font-weight="bold">${item.position}</text>
        <text x="160" y="${y + 32}" fill="white" font-size="18">${escapeXml(item.title.slice(0, 30))}</text>
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor1}"/>
          <stop offset="100%" style="stop-color:${bgColor2}"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Decorative elements -->
      <circle cx="${width * 0.1}" cy="${height * 0.2}" r="100" fill="${accentColor}" opacity="0.1"/>
      <circle cx="${width * 0.9}" cy="${height * 0.8}" r="150" fill="${accentColor}" opacity="0.1"/>

      <!-- Content container -->
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="20" fill="rgba(0,0,0,0.3)"/>

      <!-- Title -->
      <text x="${width / 2}" y="100" fill="white" font-size="36" font-weight="bold" text-anchor="middle" filter="url(#glow)">
        ${escapeXml(listTitle)}
      </text>

      <!-- Category badge -->
      <rect x="${width / 2 - 60}" y="115" width="120" height="24" rx="12" fill="${accentColor}" opacity="0.8"/>
      <text x="${width / 2}" y="132" fill="white" font-size="12" text-anchor="middle">
        ${escapeXml(request.category?.toUpperCase() || 'RANKING')}
      </text>

      <!-- Items -->
      ${itemsHtml}

      <!-- AI Generated badge -->
      <rect x="${width - 180}" y="${height - 60}" width="140" height="30" rx="15" fill="rgba(255,255,255,0.1)"/>
      <text x="${width - 110}" y="${height - 40}" fill="white" font-size="11" text-anchor="middle" opacity="0.7">
        ✨ AI Generated
      </text>

      <!-- GOAT branding -->
      <text x="80" y="${height - 45}" fill="white" font-size="12" opacity="0.5">
        GOAT Rankings
      </text>

      <!-- Style indicator -->
      <text x="${width / 2}" y="${height - 45}" fill="${accentColor}" font-size="10" text-anchor="middle" opacity="0.6">
        ${style.replace('_', ' ').toUpperCase()} STYLE
      </text>
    </svg>
  `;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Simple hash function for generating seeds
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate with Replicate API (Stable Diffusion)
 */
async function generateWithReplicate(
  request: AIGenerationRequest,
  prompt: string,
  negativePrompt?: string
): Promise<AIGenerationResponse> {
  const apiKey = process.env.REPLICATE_API_TOKEN;

  if (!apiKey) {
    console.warn('REPLICATE_API_TOKEN not set, falling back to mock');
    return generateMockImage(request, prompt);
  }

  const startTime = Date.now();

  try {
    // Use SDXL model for high quality
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        input: {
          prompt,
          negative_prompt: negativePrompt || 'low quality, blurry, distorted',
          width: Math.min(request.dimensions.width, 1024),
          height: Math.min(request.dimensions.height, 1024),
          num_outputs: request.numVariations || 1,
          scheduler: 'K_EULER',
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Replicate API error');
    }

    const prediction = await response.json();

    // Poll for completion
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pollResponse = await fetch(result.urls.get, {
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
      });

      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Generation failed');
    }

    const generatedImages: GeneratedImage[] = result.output.map(
      (url: string, index: number) => ({
        id: `replicate-${prediction.id}-${index}`,
        url,
        width: request.dimensions.width,
        height: request.dimensions.height,
        variationIndex: index,
      })
    );

    return {
      images: generatedImages,
      generationId: prediction.id,
      generationTime: Date.now() - startTime,
      creditsUsed: 1,
      promptUsed: prompt,
    };
  } catch (error) {
    console.error('Replicate generation error:', error);
    // Fall back to mock on error
    return generateMockImage(request, prompt);
  }
}

/**
 * Generate with OpenAI DALL-E 3
 */
async function generateWithOpenAI(
  request: AIGenerationRequest,
  prompt: string
): Promise<AIGenerationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set, falling back to mock');
    return generateMockImage(request, prompt);
  }

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1, // DALL-E 3 only supports 1 at a time
        size: '1792x1024', // Closest to social media aspect ratio
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API error');
    }

    const data = await response.json();

    const generatedImages: GeneratedImage[] = data.data.map(
      (item: { url: string }, index: number) => ({
        id: `openai-${Date.now()}-${index}`,
        url: item.url,
        width: 1792,
        height: 1024,
        variationIndex: index,
      })
    );

    return {
      images: generatedImages,
      generationId: `openai-${Date.now()}`,
      generationTime: Date.now() - startTime,
      creditsUsed: 1,
      promptUsed: prompt,
    };
  } catch (error) {
    console.error('OpenAI generation error:', error);
    return generateMockImage(request, prompt);
  }
}

/**
 * POST /api/generate-ai-image - Generate AI artwork for rankings
 *
 * Supports multiple AI providers:
 * - replicate: Stable Diffusion XL via Replicate
 * - openai: DALL-E 3 via OpenAI
 * - mock: Development placeholder images
 */
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequestBody = await req.json();
    const { request, prompt, negativePrompt, provider } = body;

    // Validate request
    if (!request || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: request, prompt' },
        { status: 400 }
      );
    }

    // Generate based on provider
    let response: AIGenerationResponse;

    switch (provider) {
      case 'openai':
        response = await generateWithOpenAI(request, prompt);
        break;
      case 'replicate':
        response = await generateWithReplicate(request, prompt, negativePrompt);
        break;
      case 'mock':
      default:
        response = await generateMockImage(request, prompt);
        break;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
