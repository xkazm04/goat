/**
 * Predefined Criteria Templates
 * Category-specific criteria profiles for common ranking scenarios
 */

import type { CriteriaProfile, Criterion } from '../types';

/**
 * Helper to create a criterion with defaults
 */
function criterion(
  id: string,
  name: string,
  description: string,
  weight: number,
  icon?: string,
  color?: string
): Criterion {
  return {
    id,
    name,
    description,
    weight,
    minScore: 1,
    maxScore: 10,
    icon,
    color,
  };
}

/**
 * Universal template - works for any category
 */
export const UNIVERSAL_TEMPLATE: CriteriaProfile = {
  id: 'template-universal',
  name: 'Universal Ranking',
  description: 'A balanced set of criteria that works for ranking anything',
  category: 'universal',
  criteria: [
    criterion('univ-impact', 'Impact', 'How significant or influential is this?', 30, 'zap', '#f59e0b'),
    criterion('univ-quality', 'Quality', 'Overall quality and execution', 25, 'star', '#eab308'),
    criterion('univ-enjoyment', 'Enjoyment', 'How much do you personally enjoy this?', 25, 'heart', '#ef4444'),
    criterion('univ-uniqueness', 'Uniqueness', 'How distinctive or original is this?', 20, 'sparkles', '#8b5cf6'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Sports Athletes template
 */
export const SPORTS_TEMPLATE: CriteriaProfile = {
  id: 'template-sports',
  name: 'Sports Athletes',
  description: 'Criteria for ranking athletes across any sport',
  category: 'sports',
  criteria: [
    criterion('sports-skill', 'Skill Level', 'Technical ability and mastery of the sport', 25, 'target', '#3b82f6'),
    criterion('sports-achievements', 'Achievements', 'Championships, records, and accolades', 25, 'trophy', '#f59e0b'),
    criterion('sports-dominance', 'Dominance', 'How dominant were they in their era?', 20, 'crown', '#eab308'),
    criterion('sports-longevity', 'Longevity', 'Career length and consistency', 15, 'clock', '#10b981'),
    criterion('sports-impact', 'Cultural Impact', 'Influence beyond the sport itself', 15, 'users', '#8b5cf6'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Movies template
 */
export const MOVIES_TEMPLATE: CriteriaProfile = {
  id: 'template-movies',
  name: 'Movies & Films',
  description: 'Professional film critic criteria for movie rankings',
  category: 'movies',
  criteria: [
    criterion('movies-story', 'Story & Writing', 'Plot, dialogue, and narrative structure', 25, 'book-open', '#3b82f6'),
    criterion('movies-acting', 'Acting', 'Performance quality of the cast', 20, 'users', '#ef4444'),
    criterion('movies-direction', 'Direction', 'Vision and execution by the director', 20, 'video', '#8b5cf6'),
    criterion('movies-visuals', 'Visuals', 'Cinematography, effects, and visual style', 15, 'eye', '#10b981'),
    criterion('movies-impact', 'Cultural Impact', 'Influence on cinema and culture', 10, 'globe', '#f59e0b'),
    criterion('movies-rewatch', 'Rewatchability', 'How enjoyable is it on repeat viewings?', 10, 'refresh-cw', '#ec4899'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Music template
 */
export const MUSIC_TEMPLATE: CriteriaProfile = {
  id: 'template-music',
  name: 'Music & Albums',
  description: 'Criteria for ranking songs, albums, or artists',
  category: 'music',
  criteria: [
    criterion('music-composition', 'Composition', 'Musical arrangement and songwriting', 25, 'music', '#3b82f6'),
    criterion('music-production', 'Production', 'Sound quality and production value', 20, 'headphones', '#8b5cf6'),
    criterion('music-emotion', 'Emotional Impact', 'How much does it move you?', 20, 'heart', '#ef4444'),
    criterion('music-originality', 'Originality', 'Innovation and uniqueness of sound', 15, 'sparkles', '#f59e0b'),
    criterion('music-replay', 'Replay Value', 'Do you keep coming back to it?', 20, 'repeat', '#10b981'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Food template
 */
export const FOOD_TEMPLATE: CriteriaProfile = {
  id: 'template-food',
  name: 'Food & Restaurants',
  description: 'Restaurant critic criteria for food rankings',
  category: 'food',
  criteria: [
    criterion('food-taste', 'Taste', 'Overall flavor and deliciousness', 30, 'utensils', '#ef4444'),
    criterion('food-quality', 'Quality', 'Ingredient quality and freshness', 25, 'star', '#f59e0b'),
    criterion('food-presentation', 'Presentation', 'Visual appeal and plating', 15, 'image', '#8b5cf6'),
    criterion('food-value', 'Value', 'Quality relative to price', 15, 'dollar-sign', '#10b981'),
    criterion('food-experience', 'Experience', 'Overall dining experience', 15, 'smile', '#3b82f6'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Video Games template
 */
export const GAMES_TEMPLATE: CriteriaProfile = {
  id: 'template-games',
  name: 'Video Games',
  description: 'Game reviewer criteria for video game rankings',
  category: 'games',
  criteria: [
    criterion('games-gameplay', 'Gameplay', 'Core mechanics and fun factor', 30, 'gamepad-2', '#3b82f6'),
    criterion('games-story', 'Story', 'Narrative and characters', 20, 'book-open', '#8b5cf6'),
    criterion('games-graphics', 'Graphics & Audio', 'Visual and audio quality', 15, 'monitor', '#10b981'),
    criterion('games-innovation', 'Innovation', 'New ideas and creativity', 15, 'lightbulb', '#f59e0b'),
    criterion('games-replayability', 'Replayability', 'Reasons to play again', 20, 'refresh-cw', '#ef4444'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Books template
 */
export const BOOKS_TEMPLATE: CriteriaProfile = {
  id: 'template-books',
  name: 'Books & Literature',
  description: 'Literary critic criteria for book rankings',
  category: 'books',
  criteria: [
    criterion('books-writing', 'Writing Quality', 'Prose, style, and language', 25, 'pen-tool', '#3b82f6'),
    criterion('books-story', 'Story & Plot', 'Narrative structure and pacing', 25, 'book-open', '#8b5cf6'),
    criterion('books-characters', 'Characters', 'Character development and depth', 20, 'users', '#ef4444'),
    criterion('books-themes', 'Themes', 'Ideas and messages explored', 15, 'lightbulb', '#f59e0b'),
    criterion('books-impact', 'Impact', 'Personal or cultural significance', 15, 'zap', '#10b981'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * TV Shows template
 */
export const TV_SHOWS_TEMPLATE: CriteriaProfile = {
  id: 'template-tv-shows',
  name: 'TV Shows & Series',
  description: 'Criteria for ranking television shows and series',
  category: 'tv-shows',
  criteria: [
    criterion('tv-writing', 'Writing', 'Scripts, dialogue, and story arcs', 25, 'pen-tool', '#3b82f6'),
    criterion('tv-acting', 'Acting', 'Cast performances', 20, 'users', '#ef4444'),
    criterion('tv-production', 'Production', 'Visual quality and production value', 15, 'video', '#8b5cf6'),
    criterion('tv-consistency', 'Consistency', 'Quality maintained across seasons', 20, 'check-circle', '#10b981'),
    criterion('tv-binge', 'Binge-worthiness', 'How compelling is it to watch?', 20, 'play-circle', '#f59e0b'),
  ],
  isTemplate: true,
  createdBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * All templates collection
 */
export const ALL_TEMPLATES: CriteriaProfile[] = [
  UNIVERSAL_TEMPLATE,
  SPORTS_TEMPLATE,
  MOVIES_TEMPLATE,
  MUSIC_TEMPLATE,
  FOOD_TEMPLATE,
  GAMES_TEMPLATE,
  BOOKS_TEMPLATE,
  TV_SHOWS_TEMPLATE,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CriteriaProfile | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates for a category
 */
export function getTemplatesForCategory(category: string): CriteriaProfile[] {
  return ALL_TEMPLATES.filter(
    (t) => t.category === category || t.category === 'universal'
  );
}

/**
 * Get suggested template for a category
 */
export function getSuggestedTemplate(category: string): CriteriaProfile {
  const categoryTemplate = ALL_TEMPLATES.find((t) => t.category === category);
  return categoryTemplate ?? UNIVERSAL_TEMPLATE;
}

/**
 * Map category names to template categories
 */
export const CATEGORY_MAPPING: Record<string, string> = {
  // Sports variations
  'Sports': 'sports',
  'Basketball': 'sports',
  'Football': 'sports',
  'Soccer': 'sports',
  'Baseball': 'sports',
  'Tennis': 'sports',
  'Golf': 'sports',
  'MMA': 'sports',
  'Boxing': 'sports',
  // Movies/TV
  'Movies': 'movies',
  'Films': 'movies',
  'Cinema': 'movies',
  'TV Shows': 'tv-shows',
  'Television': 'tv-shows',
  'Series': 'tv-shows',
  // Music
  'Music': 'music',
  'Albums': 'music',
  'Artists': 'music',
  'Songs': 'music',
  // Games
  'Video Games': 'games',
  'Games': 'games',
  'Gaming': 'games',
  // Food
  'Food': 'food',
  'Restaurants': 'food',
  'Cuisine': 'food',
  // Books
  'Books': 'books',
  'Literature': 'books',
  'Novels': 'books',
};

/**
 * Get template category from item category
 */
export function mapCategoryToTemplate(itemCategory: string): string {
  return CATEGORY_MAPPING[itemCategory] ?? 'universal';
}
