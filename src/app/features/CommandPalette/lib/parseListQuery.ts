/**
 * Natural Language Parser for List Queries
 *
 * Parses user input like "top 10 basketball all-time" into structured list creation data
 */

import {
  CATEGORY_CONFIG,
  CATEGORIES,
  getInitialSubcategory,
  getDefaultSubcategory
} from '@/lib/config/category-config';

export interface ParsedListQuery {
  category: string;
  subcategory?: string;
  hierarchy: number;
  timePeriod: 'all-time' | 'decade' | 'year';
  decade?: string;
  year?: string;
  title?: string;
  confidence: number; // 0-1 how confident we are in the parse
  originalQuery: string;
}

// Default color palette
const DEFAULT_COLOR = {
  primary: "#f59e0b",
  secondary: "#d97706",
  accent: "#fbbf24"
};

// Size patterns
const SIZE_PATTERNS = [
  /top\s*(\d+)/i,
  /(\d+)\s*best/i,
  /best\s*(\d+)/i,
  /(\d+)\s*greatest/i,
  /greatest\s*(\d+)/i,
];

// Valid list sizes
const VALID_SIZES = [5, 10, 20, 25, 50];

// Time period patterns
const TIME_PATTERNS = {
  allTime: /all[- ]?time|ever|history|all time/i,
  decade: /(\d{4})s|in the (\d{4})s/i,
  year: /in (\d{4})|from (\d{4})|(\d{4}) edition/i,
  thisYear: /this year|current year|2024|2025/i,
  lastDecade: /last decade|recent|modern|2020s/i,
};

// Category keywords (lowercase for matching)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Sports: ['sports', 'sport', 'athletes', 'players', 'teams'],
  Music: ['music', 'songs', 'albums', 'artists', 'bands', 'musicians', 'tracks'],
  Games: ['games', 'gaming', 'video games', 'videogames', 'esports'],
  Stories: ['stories', 'movies', 'films', 'books', 'shows', 'tv', 'series', 'anime', 'manga'],
};

// Subcategory keywords for Sports
const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  Basketball: ['basketball', 'nba', 'hoops', 'bball', 'dunks', 'lebron', 'jordan'],
  'Ice-Hockey': ['hockey', 'nhl', 'ice hockey', 'puck'],
  Soccer: ['soccer', 'football', 'fifa', 'premier league', 'messi', 'ronaldo', 'futbol'],
};

/**
 * Normalize a number to the closest valid list size
 */
function normalizeSize(size: number): number {
  if (size <= 5) return 5;
  if (size <= 10) return 10;
  if (size <= 20) return 20;
  if (size <= 25) return 25;
  return 50;
}

/**
 * Extract the list size from query
 */
function extractSize(query: string): { size: number; confidence: number } {
  const lowerQuery = query.toLowerCase();

  for (const pattern of SIZE_PATTERNS) {
    const match = lowerQuery.match(pattern);
    if (match) {
      const rawSize = parseInt(match[1] || match[2], 10);
      return {
        size: normalizeSize(rawSize),
        confidence: VALID_SIZES.includes(rawSize) ? 1 : 0.8
      };
    }
  }

  // Default to 10 if no size specified
  return { size: 10, confidence: 0.5 };
}

/**
 * Extract the time period from query
 */
function extractTimePeriod(query: string): {
  timePeriod: 'all-time' | 'decade' | 'year';
  decade?: string;
  year?: string;
  confidence: number;
} {
  const lowerQuery = query.toLowerCase();

  // Check for all-time
  if (TIME_PATTERNS.allTime.test(lowerQuery)) {
    return { timePeriod: 'all-time', confidence: 1 };
  }

  // Check for specific decade
  const decadeMatch = lowerQuery.match(TIME_PATTERNS.decade);
  if (decadeMatch) {
    const decade = (decadeMatch[1] || decadeMatch[2]).slice(0, 3) + '0';
    return { timePeriod: 'decade', decade, confidence: 1 };
  }

  // Check for last decade / modern
  if (TIME_PATTERNS.lastDecade.test(lowerQuery)) {
    return { timePeriod: 'decade', decade: '2020', confidence: 0.9 };
  }

  // Check for specific year
  const yearMatch = lowerQuery.match(TIME_PATTERNS.year);
  if (yearMatch) {
    const year = yearMatch[1] || yearMatch[2] || yearMatch[3];
    return { timePeriod: 'year', year, confidence: 1 };
  }

  // Check for this year
  if (TIME_PATTERNS.thisYear.test(lowerQuery)) {
    const currentYear = new Date().getFullYear().toString();
    return { timePeriod: 'year', year: currentYear, confidence: 0.9 };
  }

  // Default to all-time
  return { timePeriod: 'all-time', confidence: 0.5 };
}

/**
 * Extract category from query
 */
function extractCategory(query: string): {
  category: string;
  confidence: number;
} {
  const lowerQuery = query.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        return { category, confidence: 1 };
      }
    }
  }

  // Default to Sports
  return { category: 'Sports', confidence: 0.3 };
}

/**
 * Extract subcategory from query (only for categories that support them)
 */
function extractSubcategory(query: string, category: string): {
  subcategory?: string;
  confidence: number;
} {
  const config = CATEGORY_CONFIG[category];

  if (!config?.hasSubcategories) {
    return { subcategory: undefined, confidence: 1 };
  }

  const lowerQuery = query.toLowerCase();

  // Check subcategory keywords
  for (const [subcategory, keywords] of Object.entries(SUBCATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        // Verify it's a valid subcategory for this category
        const isValid = config.subcategories.some(s => s.value === subcategory);
        if (isValid) {
          return { subcategory, confidence: 1 };
        }
      }
    }
  }

  // Return default subcategory for category
  return {
    subcategory: getDefaultSubcategory(category),
    confidence: 0.5
  };
}

/**
 * Main parsing function - takes a natural language query and returns structured data
 */
export function parseListQuery(query: string): ParsedListQuery {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      category: 'Sports',
      subcategory: getDefaultSubcategory('Sports'),
      hierarchy: 10,
      timePeriod: 'all-time',
      confidence: 0,
      originalQuery: query,
    };
  }

  // Extract components
  const sizeResult = extractSize(trimmedQuery);
  const timeResult = extractTimePeriod(trimmedQuery);
  const categoryResult = extractCategory(trimmedQuery);
  const subcategoryResult = extractSubcategory(trimmedQuery, categoryResult.category);

  // Calculate overall confidence
  const confidence = (
    sizeResult.confidence * 0.2 +
    timeResult.confidence * 0.2 +
    categoryResult.confidence * 0.4 +
    subcategoryResult.confidence * 0.2
  );

  return {
    category: categoryResult.category,
    subcategory: subcategoryResult.subcategory,
    hierarchy: sizeResult.size,
    timePeriod: timeResult.timePeriod,
    decade: timeResult.decade,
    year: timeResult.year,
    confidence,
    originalQuery: query,
  };
}

/**
 * Generate a list title from parsed query
 */
export function generateListTitle(parsed: ParsedListQuery): string {
  let title = `Top ${parsed.hierarchy} ${parsed.category}`;

  if (parsed.subcategory) {
    title += ` - ${parsed.subcategory}`;
  }

  if (parsed.timePeriod === 'decade' && parsed.decade) {
    title += ` (${parsed.decade}s)`;
  } else if (parsed.timePeriod === 'year' && parsed.year) {
    title += ` (${parsed.year})`;
  } else if (parsed.timePeriod === 'all-time') {
    title += ' (All-Time)';
  }

  return title;
}

/**
 * Get example queries for the command palette
 */
export function getExampleQueries(): string[] {
  return [
    'top 10 basketball all-time',
    'best 25 NBA players',
    'top 50 songs 2024',
    'greatest 10 video games ever',
    'top 20 movies all time',
    'best 10 soccer players 2020s',
    'top 5 albums this year',
  ];
}
