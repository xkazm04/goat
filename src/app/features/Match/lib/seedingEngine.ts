/**
 * Seeding Engine - Multiple seeding algorithms for tournament brackets
 *
 * Provides different strategies for assigning seeds to participants:
 * - Random: Shuffled seeding for unpredictable matchups
 * - Alphabetical: Sorted by name
 * - Consensus: Based on community ranking data
 * - Year: Sorted by item year (for movies, albums, etc.)
 */

import { BacklogItemType } from '@/types/match';
import { BracketParticipant, BracketSize } from './bracketGenerator';

export type SeedingStrategy = 'random' | 'alphabetical' | 'year' | 'consensus' | 'reverse-alphabetical';

export interface SeedingOptions {
  strategy: SeedingStrategy;
  consensusData?: Record<string, number>; // item id -> consensus rank
}

/**
 * Fisher-Yates shuffle for random seeding
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get item title for sorting
 */
function getItemTitle(item: BacklogItemType): string {
  return (item.title || item.name || '').toLowerCase();
}

/**
 * Get item year for sorting
 */
function getItemYear(item: BacklogItemType): number {
  return item.item_year || 0;
}

/**
 * Sort items alphabetically
 */
function sortAlphabetically(items: BacklogItemType[]): BacklogItemType[] {
  return [...items].sort((a, b) => {
    const titleA = getItemTitle(a);
    const titleB = getItemTitle(b);
    return titleA.localeCompare(titleB);
  });
}

/**
 * Sort items reverse alphabetically
 */
function sortReverseAlphabetically(items: BacklogItemType[]): BacklogItemType[] {
  return [...items].sort((a, b) => {
    const titleA = getItemTitle(a);
    const titleB = getItemTitle(b);
    return titleB.localeCompare(titleA);
  });
}

/**
 * Sort items by year (oldest first, items without year at end)
 */
function sortByYear(items: BacklogItemType[]): BacklogItemType[] {
  return [...items].sort((a, b) => {
    const yearA = getItemYear(a);
    const yearB = getItemYear(b);

    // Items without year go to end
    if (!yearA && !yearB) return 0;
    if (!yearA) return 1;
    if (!yearB) return -1;

    return yearA - yearB;
  });
}

/**
 * Sort items by consensus ranking (best ranked first)
 */
function sortByConsensus(
  items: BacklogItemType[],
  consensusData: Record<string, number>
): BacklogItemType[] {
  return [...items].sort((a, b) => {
    const rankA = consensusData[a.id] ?? Number.MAX_VALUE;
    const rankB = consensusData[b.id] ?? Number.MAX_VALUE;
    return rankA - rankB;
  });
}

/**
 * Apply seeding strategy and create participants
 */
export function seedParticipants(
  items: BacklogItemType[],
  bracketSize: BracketSize,
  options: SeedingOptions
): BracketParticipant[] {
  let sortedItems: BacklogItemType[];

  switch (options.strategy) {
    case 'random':
      sortedItems = shuffleArray(items);
      break;
    case 'alphabetical':
      sortedItems = sortAlphabetically(items);
      break;
    case 'reverse-alphabetical':
      sortedItems = sortReverseAlphabetically(items);
      break;
    case 'year':
      sortedItems = sortByYear(items);
      break;
    case 'consensus':
      sortedItems = options.consensusData
        ? sortByConsensus(items, options.consensusData)
        : shuffleArray(items);
      break;
    default:
      sortedItems = shuffleArray(items);
  }

  // Create participants with seeds
  const participants: BracketParticipant[] = sortedItems
    .slice(0, bracketSize)
    .map((item, index) => ({
      id: item.id,
      item,
      seed: index + 1,
      isBye: false,
    }));

  return participants;
}

/**
 * Calculate required byes for a bracket
 */
export function calculateByes(itemCount: number, bracketSize: BracketSize): number {
  return Math.max(0, bracketSize - itemCount);
}

/**
 * Get human-readable seeding strategy name
 */
export function getSeedingStrategyName(strategy: SeedingStrategy): string {
  switch (strategy) {
    case 'random':
      return 'Random';
    case 'alphabetical':
      return 'A-Z';
    case 'reverse-alphabetical':
      return 'Z-A';
    case 'year':
      return 'By Year';
    case 'consensus':
      return 'Community Rank';
    default:
      return 'Random';
  }
}

/**
 * Get seeding strategy description
 */
export function getSeedingStrategyDescription(strategy: SeedingStrategy): string {
  switch (strategy) {
    case 'random':
      return 'Randomized seeding for unpredictable matchups';
    case 'alphabetical':
      return 'Seeded A to Z by title';
    case 'reverse-alphabetical':
      return 'Seeded Z to A by title';
    case 'year':
      return 'Seeded by release year (oldest first)';
    case 'consensus':
      return 'Seeded by community ranking (favorites get top seeds)';
    default:
      return 'Randomized seeding';
  }
}

/**
 * Get all available seeding strategies
 */
export function getAvailableSeedingStrategies(): {
  id: SeedingStrategy;
  name: string;
  description: string;
}[] {
  return [
    {
      id: 'random',
      name: getSeedingStrategyName('random'),
      description: getSeedingStrategyDescription('random'),
    },
    {
      id: 'alphabetical',
      name: getSeedingStrategyName('alphabetical'),
      description: getSeedingStrategyDescription('alphabetical'),
    },
    {
      id: 'reverse-alphabetical',
      name: getSeedingStrategyName('reverse-alphabetical'),
      description: getSeedingStrategyDescription('reverse-alphabetical'),
    },
    {
      id: 'year',
      name: getSeedingStrategyName('year'),
      description: getSeedingStrategyDescription('year'),
    },
    {
      id: 'consensus',
      name: getSeedingStrategyName('consensus'),
      description: getSeedingStrategyDescription('consensus'),
    },
  ];
}

/**
 * Validate items for bracket participation
 */
export function validateItemsForBracket(
  items: BacklogItemType[],
  minItems: number = 4
): { valid: boolean; error?: string } {
  if (!items || items.length === 0) {
    return { valid: false, error: 'No items provided' };
  }

  if (items.length < minItems) {
    return { valid: false, error: `Need at least ${minItems} items for a bracket` };
  }

  // Check for duplicates
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      return { valid: false, error: 'Duplicate items detected' };
    }
    ids.add(item.id);
  }

  return { valid: true };
}
