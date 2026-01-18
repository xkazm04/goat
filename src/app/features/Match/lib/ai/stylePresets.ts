/**
 * AI Style Presets Configuration
 *
 * Curated style configurations optimized for ranking image generation.
 * Each style includes prompt modifiers, negative prompts, and color schemes.
 */

import type { AIStylePreset, AIStyleConfig, CategoryTheme } from './types';

/**
 * All available AI style presets
 */
export const AI_STYLE_PRESETS: Record<AIStylePreset, AIStyleConfig> = {
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, modern design with elegant typography',
    promptModifiers: [
      'minimalist design',
      'clean typography',
      'white space',
      'modern sans-serif font',
      'subtle shadows',
      'geometric shapes',
      'professional layout',
    ],
    negativePrompt: 'cluttered, busy, noisy, complex patterns, decorative, ornate',
    colorScheme: ['#FFFFFF', '#F8F9FA', '#212529', '#6C757D', '#E9ECEF'],
    thumbnailGradient: 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%)',
    recommendedFor: ['technology', 'books', 'general'],
  },

  fantasy: {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Epic fantasy artwork with magical elements',
    promptModifiers: [
      'epic fantasy art',
      'magical atmosphere',
      'golden light rays',
      'mystical symbols',
      'ethereal glow',
      'ornate borders',
      'medieval fantasy style',
    ],
    negativePrompt: 'modern, minimalist, plain, simple, technology',
    colorScheme: ['#1A1A2E', '#4A3F6B', '#9B7DCE', '#FFD700', '#2D1B4E'],
    thumbnailGradient: 'linear-gradient(135deg, #1A1A2E 0%, #4A3F6B 50%, #9B7DCE 100%)',
    recommendedFor: ['games', 'anime', 'books'],
  },

  retro_80s: {
    id: 'retro_80s',
    name: 'Retro 80s',
    description: 'Synthwave inspired with neon grids',
    promptModifiers: [
      '80s synthwave aesthetic',
      'neon grid horizon',
      'chrome text',
      'sunset gradient',
      'retro futurism',
      'VHS scan lines',
      'palm trees silhouette',
    ],
    negativePrompt: 'modern flat design, minimalist, natural colors',
    colorScheme: ['#FF00FF', '#00FFFF', '#FF6B6B', '#4A0E4E', '#000033'],
    thumbnailGradient: 'linear-gradient(180deg, #FF00FF 0%, #000033 50%, #00FFFF 100%)',
    recommendedFor: ['music', 'movies', 'games'],
  },

  retro_90s: {
    id: 'retro_90s',
    name: 'Retro 90s',
    description: 'Bold 90s nostalgia with geometric shapes',
    promptModifiers: [
      '90s aesthetic',
      'bold geometric shapes',
      'memphis design style',
      'squiggly lines',
      'primary colors',
      'funky patterns',
      'radical typography',
    ],
    negativePrompt: 'minimalist, elegant, subdued colors, modern',
    colorScheme: ['#FF6B35', '#F7C59F', '#2EC4B6', '#E71D36', '#011627'],
    thumbnailGradient: 'linear-gradient(135deg, #FF6B35 0%, #2EC4B6 50%, #E71D36 100%)',
    recommendedFor: ['music', 'sports', 'games'],
  },

  vaporwave: {
    id: 'vaporwave',
    name: 'Vaporwave',
    description: 'Aesthetic vaporwave with glitch effects',
    promptModifiers: [
      'vaporwave aesthetic',
      'greek statues',
      'glitch art effects',
      'pastel gradients',
      'japanese text',
      'windows 95 style',
      'palm trees',
      'checkered floor',
    ],
    negativePrompt: 'natural, realistic, modern design, simple',
    colorScheme: ['#FF71CE', '#01CDFE', '#05FFA1', '#B967FF', '#FFFB96'],
    thumbnailGradient: 'linear-gradient(135deg, #FF71CE 0%, #01CDFE 50%, #B967FF 100%)',
    recommendedFor: ['music', 'games', 'technology'],
  },

  neon_noir: {
    id: 'neon_noir',
    name: 'Neon Noir',
    description: 'Dark cyberpunk with neon accents',
    promptModifiers: [
      'cyberpunk noir',
      'neon lights in rain',
      'dark city atmosphere',
      'holographic elements',
      'blade runner style',
      'moody lighting',
      'futuristic typography',
    ],
    negativePrompt: 'bright, cheerful, daylight, natural, warm colors',
    colorScheme: ['#0D0D0D', '#1A1A2E', '#FF2A6D', '#05D9E8', '#D1F7FF'],
    thumbnailGradient: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A2E 50%, #FF2A6D 100%)',
    recommendedFor: ['movies', 'games', 'technology'],
  },

  watercolor: {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting style',
    promptModifiers: [
      'watercolor painting style',
      'soft brush strokes',
      'paper texture',
      'flowing colors',
      'artistic splashes',
      'hand-painted feel',
      'delicate gradients',
    ],
    negativePrompt: 'digital, sharp edges, neon, geometric, harsh',
    colorScheme: ['#E8D5B7', '#F5E6D3', '#7EB5A6', '#C06C84', '#F67280'],
    thumbnailGradient: 'linear-gradient(135deg, #E8D5B7 0%, #7EB5A6 50%, #F67280 100%)',
    recommendedFor: ['books', 'food', 'travel'],
  },

  comic_book: {
    id: 'comic_book',
    name: 'Comic Book',
    description: 'Bold comic book art with halftone',
    promptModifiers: [
      'comic book art style',
      'halftone dots',
      'bold outlines',
      'speech bubbles',
      'action lines',
      'POW BAM effects',
      'vibrant flat colors',
    ],
    negativePrompt: 'realistic, photograph, 3D render, gradient, soft',
    colorScheme: ['#FFEB3B', '#FF5252', '#2196F3', '#000000', '#FFFFFF'],
    thumbnailGradient: 'linear-gradient(135deg, #FFEB3B 0%, #FF5252 50%, #2196F3 100%)',
    recommendedFor: ['anime', 'movies', 'games'],
  },

  pixel_art: {
    id: 'pixel_art',
    name: 'Pixel Art',
    description: 'Retro pixel art game aesthetic',
    promptModifiers: [
      '16-bit pixel art style',
      'retro game aesthetic',
      'pixelated graphics',
      'dithering patterns',
      'limited color palette',
      'crisp pixel edges',
      'nostalgic gaming',
    ],
    negativePrompt: 'smooth, high resolution, realistic, photograph, 3D',
    colorScheme: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F', '#CADC9F'],
    thumbnailGradient: 'linear-gradient(135deg, #0F380F 0%, #306230 50%, #9BBC0F 100%)',
    recommendedFor: ['games', 'technology', 'anime'],
  },

  sports_arena: {
    id: 'sports_arena',
    name: 'Sports Arena',
    description: 'Dynamic sports broadcast style',
    promptModifiers: [
      'sports broadcast graphics',
      'stadium lights',
      'dynamic angles',
      'motion blur effects',
      'metallic textures',
      'scoreboard style',
      'championship trophy',
    ],
    negativePrompt: 'static, calm, natural, watercolor, hand-drawn',
    colorScheme: ['#1A1A1A', '#C9A227', '#FFFFFF', '#B22222', '#004D40'],
    thumbnailGradient: 'linear-gradient(135deg, #1A1A1A 0%, #C9A227 50%, #B22222 100%)',
    recommendedFor: ['sports'],
  },

  movie_poster: {
    id: 'movie_poster',
    name: 'Movie Poster',
    description: 'Cinematic movie poster design',
    promptModifiers: [
      'cinematic movie poster',
      'dramatic lighting',
      'film grain texture',
      'Hollywood style',
      'epic scale',
      'professional photography',
      'lens flare effects',
    ],
    negativePrompt: 'cartoon, anime, pixel art, minimalist, simple',
    colorScheme: ['#0A0A0A', '#1C1C1C', '#C49B26', '#8B0000', '#F5F5F5'],
    thumbnailGradient: 'linear-gradient(180deg, #0A0A0A 0%, #1C1C1C 50%, #C49B26 100%)',
    recommendedFor: ['movies', 'music'],
  },

  album_cover: {
    id: 'album_cover',
    name: 'Album Cover',
    description: 'Artistic album artwork style',
    promptModifiers: [
      'album cover art',
      'artistic composition',
      'vinyl record aesthetic',
      'music industry style',
      'iconic imagery',
      'dramatic contrast',
      'record label quality',
    ],
    negativePrompt: 'plain, boring, generic, clipart, simple text',
    colorScheme: ['#1D1D1D', '#3D3D3D', '#D4AF37', '#8B4513', '#FFFAF0'],
    thumbnailGradient: 'linear-gradient(135deg, #1D1D1D 0%, #3D3D3D 50%, #D4AF37 100%)',
    recommendedFor: ['music'],
  },

  gaming: {
    id: 'gaming',
    name: 'Gaming',
    description: 'Modern esports and gaming aesthetic',
    promptModifiers: [
      'esports graphics style',
      'gaming HUD elements',
      'RGB lighting effects',
      'futuristic tech',
      'level up effects',
      'achievement badge style',
      'gaming tournament',
    ],
    negativePrompt: 'natural, organic, vintage, hand-drawn, watercolor',
    colorScheme: ['#0D0D0D', '#1E1E2F', '#00FF87', '#FF00FF', '#00D4FF'],
    thumbnailGradient: 'linear-gradient(135deg, #0D0D0D 0%, #00FF87 50%, #FF00FF 100%)',
    recommendedFor: ['games', 'technology'],
  },

  elegant: {
    id: 'elegant',
    name: 'Elegant',
    description: 'Sophisticated luxury design',
    promptModifiers: [
      'luxury elegant design',
      'gold accents',
      'marble texture',
      'serif typography',
      'art deco elements',
      'premium quality',
      'sophisticated layout',
    ],
    negativePrompt: 'casual, playful, bright colors, cartoon, pixel',
    colorScheme: ['#0D0D0D', '#1A1A1A', '#D4AF37', '#FFFFFF', '#8B7355'],
    thumbnailGradient: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 50%, #D4AF37 100%)',
    recommendedFor: ['food', 'travel', 'movies'],
    isPremium: true,
  },

  graffiti: {
    id: 'graffiti',
    name: 'Graffiti',
    description: 'Urban street art style',
    promptModifiers: [
      'graffiti street art',
      'spray paint texture',
      'urban wall background',
      'bold dripping letters',
      'stencil art',
      'hip hop culture',
      'rebellious style',
    ],
    negativePrompt: 'clean, minimal, elegant, corporate, professional',
    colorScheme: ['#FF4500', '#FFD700', '#32CD32', '#1E90FF', '#000000'],
    thumbnailGradient: 'linear-gradient(135deg, #FF4500 0%, #FFD700 50%, #32CD32 100%)',
    recommendedFor: ['music', 'sports'],
  },

  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Poster',
    description: 'Hollywood movie poster with dramatic lighting',
    promptModifiers: [
      'cinematic movie poster style',
      'dramatic lighting',
      'epic scale composition',
      'film grain texture',
      'lens flare effects',
      'award-winning cinematography',
      'professional color grading',
    ],
    negativePrompt: 'cartoon, anime, pixel art, flat design, simple',
    colorScheme: ['#0A0A0A', '#1C1C1C', '#D4AF37', '#8B0000', '#F5F5F5'],
    thumbnailGradient: 'linear-gradient(180deg, #0A0A0A 0%, #1C1C1C 50%, #D4AF37 100%)',
    recommendedFor: ['movies', 'music', 'sports'],
  },

  anime: {
    id: 'anime',
    name: 'Anime',
    description: 'Vibrant anime illustration style',
    promptModifiers: [
      'anime illustration style',
      'vibrant colors',
      'manga aesthetics',
      'dramatic speed lines',
      'expressive character art',
      'sakura petals',
      'studio quality anime',
    ],
    negativePrompt: 'realistic, photograph, 3D render, western cartoon',
    colorScheme: ['#FF6B9D', '#C085F7', '#7DD3FC', '#FDE047', '#4ADE80'],
    thumbnailGradient: 'linear-gradient(135deg, #FF6B9D 0%, #C085F7 50%, #7DD3FC 100%)',
    recommendedFor: ['anime', 'games', 'music'],
  },

  vintage_film: {
    id: 'vintage_film',
    name: 'Vintage Film',
    description: 'Classic old Hollywood aesthetic',
    promptModifiers: [
      'vintage film photography',
      'sepia tones',
      'film grain overlay',
      'classic Hollywood glamour',
      'art deco borders',
      '1940s movie poster style',
      'timeless elegance',
    ],
    negativePrompt: 'modern, digital, neon, colorful, bright',
    colorScheme: ['#2C1810', '#8B7355', '#D4AF37', '#F5DEB3', '#1A1A1A'],
    thumbnailGradient: 'linear-gradient(135deg, #2C1810 0%, #8B7355 50%, #D4AF37 100%)',
    recommendedFor: ['movies', 'music', 'books'],
    isPremium: true,
  },

  neon_pop: {
    id: 'neon_pop',
    name: 'Neon Pop',
    description: 'Bold pop art with neon accents',
    promptModifiers: [
      'neon pop art style',
      'bold contrasting colors',
      'Andy Warhol inspired',
      'electric glow effects',
      'screen print aesthetic',
      'vibrant saturation',
      'iconic pop culture',
    ],
    negativePrompt: 'subtle, muted, natural, realistic, minimal',
    colorScheme: ['#FF00FF', '#00FF00', '#FFFF00', '#FF6600', '#00FFFF'],
    thumbnailGradient: 'linear-gradient(135deg, #FF00FF 0%, #00FF00 50%, #FFFF00 100%)',
    recommendedFor: ['music', 'sports', 'food'],
  },

  kawaii: {
    id: 'kawaii',
    name: 'Kawaii',
    description: 'Cute Japanese kawaii style',
    promptModifiers: [
      'kawaii cute style',
      'pastel colors',
      'rounded shapes',
      'sparkles and stars',
      'chibi characters',
      'adorable aesthetic',
      'soft gradients',
    ],
    negativePrompt: 'dark, edgy, serious, realistic, scary',
    colorScheme: ['#FFB6C1', '#87CEEB', '#DDA0DD', '#FFFACD', '#98FB98'],
    thumbnailGradient: 'linear-gradient(135deg, #FFB6C1 0%, #87CEEB 50%, #DDA0DD 100%)',
    recommendedFor: ['anime', 'food', 'games'],
  },
};

/**
 * Get all style presets as an array
 */
export const AI_STYLE_PRESET_LIST: AIStyleConfig[] = Object.values(AI_STYLE_PRESETS);

/**
 * Get style presets recommended for a category
 */
export function getRecommendedStyles(category: CategoryTheme): AIStyleConfig[] {
  return AI_STYLE_PRESET_LIST.filter(style =>
    style.recommendedFor.includes(category)
  );
}

/**
 * Map common category strings to CategoryTheme
 */
export function mapCategoryToTheme(category: string): CategoryTheme {
  const normalized = category.toLowerCase();

  if (normalized.includes('movie') || normalized.includes('film') || normalized.includes('tv')) {
    return 'movies';
  }
  if (normalized.includes('music') || normalized.includes('album') || normalized.includes('song') || normalized.includes('artist')) {
    return 'music';
  }
  if (normalized.includes('sport') || normalized.includes('athlete') || normalized.includes('team') || normalized.includes('player')) {
    return 'sports';
  }
  if (normalized.includes('game') || normalized.includes('video game') || normalized.includes('gaming')) {
    return 'games';
  }
  if (normalized.includes('anime') || normalized.includes('manga')) {
    return 'anime';
  }
  if (normalized.includes('food') || normalized.includes('restaurant') || normalized.includes('recipe') || normalized.includes('cuisine')) {
    return 'food';
  }
  if (normalized.includes('travel') || normalized.includes('place') || normalized.includes('destination') || normalized.includes('city')) {
    return 'travel';
  }
  if (normalized.includes('tech') || normalized.includes('software') || normalized.includes('gadget') || normalized.includes('app')) {
    return 'technology';
  }
  if (normalized.includes('book') || normalized.includes('novel') || normalized.includes('author')) {
    return 'books';
  }

  return 'general';
}

/**
 * Get style config by ID
 */
export function getAIStyleConfig(styleId: AIStylePreset): AIStyleConfig {
  return AI_STYLE_PRESETS[styleId];
}

/**
 * Get free (non-premium) styles only
 */
export function getFreeStyles(): AIStyleConfig[] {
  return AI_STYLE_PRESET_LIST.filter(style => !style.isPremium);
}

/**
 * Default style to use
 */
export const DEFAULT_AI_STYLE: AIStylePreset = 'minimalist';

/**
 * Get premium (gated) styles only
 */
export function getPremiumStyles(): AIStyleConfig[] {
  return AI_STYLE_PRESET_LIST.filter(style => style.isPremium);
}

/**
 * Check if a style is premium
 */
export function isStylePremium(styleId: AIStylePreset): boolean {
  const style = AI_STYLE_PRESETS[styleId];
  return style?.isPremium ?? false;
}

/**
 * Get all styles grouped by premium status
 */
export function getStylesGrouped(): { free: AIStyleConfig[]; premium: AIStyleConfig[] } {
  return {
    free: getFreeStyles(),
    premium: getPremiumStyles(),
  };
}

/**
 * Check if user can access a style (considering premium status)
 */
export function canAccessStyle(styleId: AIStylePreset, isPremiumUser: boolean): boolean {
  if (isPremiumUser) return true;
  return !isStylePremium(styleId);
}

/**
 * Get style count summary
 */
export function getStyleCountSummary(): { total: number; free: number; premium: number } {
  const free = getFreeStyles().length;
  const premium = getPremiumStyles().length;
  return {
    total: AI_STYLE_PRESET_LIST.length,
    free,
    premium,
  };
}
