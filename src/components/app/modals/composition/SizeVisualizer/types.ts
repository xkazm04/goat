/**
 * Size Visualizer Types
 * Types for the interactive list size visualizer system
 */

/**
 * Available list sizes
 */
export type ListSize = 10 | 20 | 25 | 50 | 100;

/**
 * Ranking format types
 */
export type RankingFormat = 'standard' | 'tier' | 'bracket';

/**
 * Size option configuration
 */
export interface SizeOption {
  value: ListSize;
  label: string;
  description: string;
  estimatedMinutes: number;
  recommendedFor: string[];
  gridCols: number;
  gridRows: number;
}

/**
 * Time estimate factors
 */
export interface TimeEstimateFactor {
  category: string;
  multiplier: number;
  reason: string;
}

/**
 * Time estimate result
 */
export interface TimeEstimate {
  minutes: number;
  range: { min: number; max: number };
  factors: TimeEstimateFactor[];
  comparisons: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Size recommendation result
 */
export interface SizeRecommendation {
  recommended: ListSize;
  confidence: number;
  reason: string;
  alternatives: Array<{
    size: ListSize;
    reason: string;
  }>;
}

/**
 * Grid slot representation
 */
export interface GridSlot {
  position: number;
  row: number;
  col: number;
  isHighlighted: boolean;
  isActive: boolean;
  exampleItem?: string;
}

/**
 * Preview state
 */
export interface PreviewState {
  size: ListSize;
  format: RankingFormat;
  slots: GridSlot[];
  filledCount: number;
  isAnimating: boolean;
}

/**
 * Morph animation state
 */
export interface MorphState {
  fromSize: ListSize;
  toSize: ListSize;
  progress: number;
  isActive: boolean;
}

/**
 * Custom size configuration
 */
export interface CustomSizeConfig {
  enabled: boolean;
  min: number;
  max: number;
  step: number;
  value: number;
}

/**
 * Color configuration for visualizer
 */
export interface VisualizerColor {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Size visualizer props
 */
export interface SizeVisualizerProps {
  selectedSize: ListSize | number;
  onSizeChange: (size: ListSize | number) => void;
  category?: string;
  subcategory?: string;
  color: VisualizerColor;
  showRecommendation?: boolean;
  showTimeEstimate?: boolean;
  showCustomSlider?: boolean;
  showFormatSwitcher?: boolean;
  compact?: boolean;
}

/**
 * Standard size options with metadata
 */
export const SIZE_OPTIONS: SizeOption[] = [
  {
    value: 10,
    label: 'Top 10',
    description: 'Curated essentials',
    estimatedMinutes: 3,
    recommendedFor: ['Quick rankings', 'Definitive picks', 'Social sharing'],
    gridCols: 5,
    gridRows: 2,
  },
  {
    value: 20,
    label: 'Top 20',
    description: 'Extended favorites',
    estimatedMinutes: 6,
    recommendedFor: ['Balanced depth', 'Explore variety', 'Most categories'],
    gridCols: 5,
    gridRows: 4,
  },
  {
    value: 25,
    label: 'Top 25',
    description: 'Quarter century',
    estimatedMinutes: 8,
    recommendedFor: ['Sports seasons', 'Album rankings', 'Award nominees'],
    gridCols: 5,
    gridRows: 5,
  },
  {
    value: 50,
    label: 'Top 50',
    description: 'Comprehensive list',
    estimatedMinutes: 15,
    recommendedFor: ['Deep dives', 'Expert rankings', 'Large catalogs'],
    gridCols: 10,
    gridRows: 5,
  },
  {
    value: 100,
    label: 'Top 100',
    description: 'Ultimate collection',
    estimatedMinutes: 35,
    recommendedFor: ['Definitive guides', 'Genre masters', 'Completionists'],
    gridCols: 10,
    gridRows: 10,
  },
];

/**
 * Category-based time multipliers
 */
export const CATEGORY_TIME_MULTIPLIERS: Record<string, number> = {
  Movies: 1.0,
  Music: 0.9,
  Games: 1.2,
  Sports: 1.1,
  Television: 1.0,
  Food: 0.8,
  Art: 1.3,
  Technology: 1.0,
  Fashion: 0.9,
  Travel: 1.1,
  Stories: 1.0,
};

/**
 * Example items for preview slots by category
 */
export const CATEGORY_EXAMPLE_ITEMS: Record<string, string[]> = {
  Movies: ['The Godfather', 'Inception', 'Pulp Fiction', 'The Matrix', 'Titanic', 'Forrest Gump', 'The Dark Knight', 'Gladiator', 'Schindler\'s List', 'Fight Club'],
  Music: ['Bohemian Rhapsody', 'Stairway to Heaven', 'Imagine', 'Billie Jean', 'Smells Like Teen Spirit', 'Hotel California', 'Sweet Child O\'Mine', 'Yesterday', 'Purple Rain', 'Thriller'],
  Games: ['The Witcher 3', 'Red Dead 2', 'GTA V', 'Zelda: BOTW', 'Elden Ring', 'God of War', 'The Last of Us', 'Skyrim', 'Portal 2', 'Half-Life 2'],
  Sports: ['Michael Jordan', 'LeBron James', 'Muhammad Ali', 'Wayne Gretzky', 'Pelé', 'Tom Brady', 'Serena Williams', 'Usain Bolt', 'Tiger Woods', 'Lionel Messi'],
  Television: ['Breaking Bad', 'The Wire', 'Game of Thrones', 'The Sopranos', 'Friends', 'Seinfeld', 'The Office', 'Stranger Things', 'Mad Men', 'The Simpsons'],
  Food: ['Pizza', 'Sushi', 'Tacos', 'Pasta', 'Burger', 'Ramen', 'Steak', 'Curry', 'Dim Sum', 'BBQ'],
  Art: ['Mona Lisa', 'Starry Night', 'The Scream', 'Girl with Pearl', 'The Persistence', 'The Birth of Venus', 'The Kiss', 'Water Lilies', 'Guernica', 'American Gothic'],
  Technology: ['iPhone', 'Tesla Model S', 'MacBook Pro', 'PlayStation 5', 'AirPods', 'Nintendo Switch', 'Kindle', 'Apple Watch', 'DJI Drone', 'Oculus Quest'],
  Fashion: ['Chanel No. 5', 'Levi\'s 501', 'Air Jordan 1', 'Hermès Birkin', 'Ray-Ban Aviator', 'Rolex Submariner', 'LBD', 'Converse Chuck', 'Louis Vuitton', 'Gucci Loafers'],
  Travel: ['Paris', 'Tokyo', 'New York', 'London', 'Rome', 'Barcelona', 'Dubai', 'Sydney', 'Amsterdam', 'Singapore'],
  Stories: ['1984', 'To Kill a Mockingbird', 'Harry Potter', 'Lord of the Rings', 'Pride & Prejudice', 'The Great Gatsby', 'Moby Dick', 'War and Peace', 'Don Quixote', 'Crime & Punishment'],
};

/**
 * Get example items for a category with fallback
 */
export function getExampleItems(category?: string, count: number = 10): string[] {
  const defaultItems = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7', 'Item 8', 'Item 9', 'Item 10'];
  const categoryItems = category ? CATEGORY_EXAMPLE_ITEMS[category] : undefined;
  const items = categoryItems || defaultItems;

  // Repeat items if we need more than available
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(items[i % items.length]);
  }
  return result;
}

/**
 * Format configurations
 */
export const FORMAT_CONFIGS: Record<RankingFormat, { label: string; description: string; icon: string }> = {
  standard: {
    label: 'Standard',
    description: 'Classic numbered list',
    icon: 'list-ordered',
  },
  tier: {
    label: 'Tier List',
    description: 'Group by tiers (S, A, B...)',
    icon: 'layers',
  },
  bracket: {
    label: 'Bracket',
    description: 'Tournament style',
    icon: 'git-branch',
  },
};

/**
 * Get size option by value
 */
export function getSizeOption(size: ListSize): SizeOption | undefined {
  return SIZE_OPTIONS.find((opt) => opt.value === size);
}

/**
 * Get nearest standard size
 */
export function getNearestSize(value: number): ListSize {
  const sizes: ListSize[] = [10, 20, 25, 50, 100];
  return sizes.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

/**
 * Calculate comparisons needed for a given size
 * Uses n log n approximation for merge sort style ranking
 */
export function calculateComparisons(size: number): number {
  if (size <= 1) return 0;
  // Approximate comparisons for a sorting-based ranking
  return Math.ceil(size * Math.log2(size) * 0.8);
}
