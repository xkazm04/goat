/**
 * Prompt Builder for AI Image Generation
 *
 * Context-aware prompt construction optimized for ranking image generation.
 * Builds prompts based on style presets, category themes, and user customization.
 */

import type { AIGenerationRequest, AIStylePreset, CategoryTheme } from './ai/types';
import { getAIStyleConfig, mapCategoryToTheme } from './ai/stylePresets';

/**
 * Built prompt result
 */
export interface BuiltPrompt {
  /** Main generation prompt */
  prompt: string;
  /** Negative prompt (things to avoid) */
  negativePrompt: string;
  /** Detected category theme */
  categoryTheme: CategoryTheme;
  /** Style modifiers applied */
  styleModifiers: string[];
}

/**
 * Category-specific prompt enhancements
 */
const CATEGORY_ENHANCEMENTS: Record<CategoryTheme, string[]> = {
  movies: [
    'cinematic composition',
    'film reel elements',
    'spotlight effects',
    'red carpet aesthetic',
  ],
  music: [
    'musical notes',
    'sound wave visualization',
    'concert lighting',
    'vinyl record textures',
  ],
  sports: [
    'athletic energy',
    'championship trophy elements',
    'stadium atmosphere',
    'dynamic action poses',
  ],
  games: [
    'gaming controller icons',
    'achievement badges',
    'pixel accents',
    'level progression elements',
  ],
  anime: [
    'manga style elements',
    'sakura petals',
    'dramatic speed lines',
    'chibi decorations',
  ],
  food: [
    'culinary presentation',
    'gourmet plating',
    'fresh ingredients',
    'restaurant ambiance',
  ],
  travel: [
    'world map elements',
    'compass rose',
    'landmark silhouettes',
    'passport stamp aesthetic',
  ],
  technology: [
    'circuit board patterns',
    'digital interface elements',
    'holographic displays',
    'futuristic icons',
  ],
  books: [
    'library shelves',
    'open book pages',
    'literary quotes',
    'vintage paper texture',
  ],
  general: [
    'professional design',
    'versatile composition',
    'balanced layout',
    'clean hierarchy',
  ],
};

/**
 * Base prompt template for ranking images
 */
const BASE_PROMPT_TEMPLATE = `Create a stunning social media shareable ranking list image.

TITLE: "{title}"
CATEGORY: {category}
STYLE: {styleName}

TOP RANKED ITEMS:
{itemsList}

DESIGN REQUIREMENTS:
- Image optimized for social sharing (1200x630px aspect ratio)
- Clear visual hierarchy with #1 being most prominent
- Title prominently displayed at top
- All rankings clearly readable
- Professional, shareable quality
- Subtle "GOAT Rankings" branding in corner

STYLE ELEMENTS:
{styleElements}

CATEGORY ENHANCEMENTS:
{categoryElements}

{customPrompt}

COMPOSITION:
- Header (top 15%): Title and category
- Main content (70%): Ranked items with visual hierarchy
- Footer (15%): Branding and decorative elements

Create a cohesive, visually striking design that people will want to share.`;

/**
 * Build a complete prompt for AI image generation
 */
export function buildPrompt(request: AIGenerationRequest): BuiltPrompt {
  const styleConfig = getAIStyleConfig(request.style);
  const categoryTheme = mapCategoryToTheme(request.category);

  // Build items list
  const itemsList = request.items
    .slice(0, 10)
    .map((item, idx) => `${item.position}. ${item.title}`)
    .join('\n');

  // Get style elements
  const styleElements = styleConfig.promptModifiers.map(mod => `- ${mod}`).join('\n');

  // Get category enhancements
  const categoryElements = CATEGORY_ENHANCEMENTS[categoryTheme]
    .map(enh => `- ${enh}`)
    .join('\n');

  // Build custom prompt section
  const customPromptSection = request.customPrompt
    ? `\nCUSTOM REQUIREMENTS:\n${request.customPrompt}\n`
    : '';

  // Assemble the main prompt
  const prompt = BASE_PROMPT_TEMPLATE
    .replace('{title}', request.listTitle)
    .replace('{category}', `${request.category}${request.subcategory ? ` - ${request.subcategory}` : ''}`)
    .replace('{styleName}', styleConfig.name)
    .replace('{itemsList}', itemsList)
    .replace('{styleElements}', styleElements)
    .replace('{categoryElements}', categoryElements)
    .replace('{customPrompt}', customPromptSection);

  return {
    prompt,
    negativePrompt: styleConfig.negativePrompt,
    categoryTheme,
    styleModifiers: styleConfig.promptModifiers,
  };
}

/**
 * Build a short prompt for faster generation (fewer tokens)
 */
export function buildShortPrompt(request: AIGenerationRequest): BuiltPrompt {
  const styleConfig = getAIStyleConfig(request.style);
  const categoryTheme = mapCategoryToTheme(request.category);

  const topItems = request.items.slice(0, 5).map(i => i.title).join(', ');

  const prompt = `${styleConfig.name} style ranking list image for "${request.listTitle}".
Category: ${request.category}.
Top items: ${topItems}.
${styleConfig.promptModifiers.slice(0, 3).join(', ')}.
Social media shareable, professional quality, clear hierarchy.
${request.customPrompt || ''}`.trim();

  return {
    prompt,
    negativePrompt: styleConfig.negativePrompt,
    categoryTheme,
    styleModifiers: styleConfig.promptModifiers.slice(0, 3),
  };
}

/**
 * Build prompt optimized for Stable Diffusion / SDXL
 */
export function buildSDPrompt(request: AIGenerationRequest): BuiltPrompt {
  const styleConfig = getAIStyleConfig(request.style);
  const categoryTheme = mapCategoryToTheme(request.category);

  // SD-optimized prompt format
  const positiveTokens = [
    'masterpiece',
    'best quality',
    'highly detailed',
    'professional design',
    `${styleConfig.name.toLowerCase()} style`,
    'social media ranking list',
    `"${request.listTitle}" title text`,
    `${request.category} theme`,
    ...styleConfig.promptModifiers,
    ...CATEGORY_ENHANCEMENTS[categoryTheme].slice(0, 2),
    'clear typography',
    'visual hierarchy',
    '1200x630 aspect ratio',
  ];

  if (request.customPrompt) {
    positiveTokens.push(request.customPrompt);
  }

  const negativeTokens = [
    'low quality',
    'blurry',
    'distorted text',
    'unreadable',
    'watermark',
    'signature',
    'cropped',
    styleConfig.negativePrompt,
  ];

  return {
    prompt: positiveTokens.join(', '),
    negativePrompt: negativeTokens.join(', '),
    categoryTheme,
    styleModifiers: styleConfig.promptModifiers,
  };
}

/**
 * Build prompt optimized for DALL-E 3
 */
export function buildDALLEPrompt(request: AIGenerationRequest): BuiltPrompt {
  const styleConfig = getAIStyleConfig(request.style);
  const categoryTheme = mapCategoryToTheme(request.category);

  const topItems = request.items.slice(0, 5);
  const itemDescriptions = topItems
    .map((item, idx) => `#${item.position} "${item.title}"`)
    .join(', ');

  // DALL-E prefers natural language descriptions
  const prompt = `Design a visually stunning ${styleConfig.name.toLowerCase()} style social media image for a ranking list titled "${request.listTitle}".

The image should display a "${request.category}" ranking with these top items: ${itemDescriptions}.

Visual style: ${styleConfig.description}

Include these design elements: ${styleConfig.promptModifiers.slice(0, 4).join(', ')}.

The design should be:
- Optimized for social media sharing (landscape orientation)
- Professional and shareable quality
- Clear visual hierarchy with #1 being most prominent
- Include subtle "GOAT Rankings" branding

${request.customPrompt ? `Additional requirements: ${request.customPrompt}` : ''}

Colors should use: ${styleConfig.colorScheme.slice(0, 3).join(', ')}.`;

  return {
    prompt,
    negativePrompt: '', // DALL-E 3 doesn't use negative prompts
    categoryTheme,
    styleModifiers: styleConfig.promptModifiers,
  };
}

/**
 * Validate and sanitize custom prompt input
 */
export function sanitizeCustomPrompt(input: string): string {
  // Remove potentially problematic content
  const sanitized = input
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/gi, '')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/gi, '')
    // Remove phone numbers
    .replace(/[\d\s()-]{10,}/g, '')
    // Remove excessive special characters
    .replace(/[^\w\s,.!?-]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Limit length
  return sanitized.slice(0, 500);
}

/**
 * Estimate token count for a prompt (rough estimate)
 */
export function estimateTokenCount(prompt: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(prompt.length / 4);
}

/**
 * Get a preview of what the prompt will look like
 */
export function getPromptPreview(request: AIGenerationRequest): {
  preview: string;
  tokenEstimate: number;
  styleInfo: {
    name: string;
    colorScheme: string[];
  };
} {
  const builtPrompt = buildShortPrompt(request);
  const styleConfig = getAIStyleConfig(request.style);

  return {
    preview: builtPrompt.prompt.slice(0, 200) + '...',
    tokenEstimate: estimateTokenCount(builtPrompt.prompt),
    styleInfo: {
      name: styleConfig.name,
      colorScheme: styleConfig.colorScheme,
    },
  };
}
