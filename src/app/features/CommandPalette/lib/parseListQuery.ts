/**
 * Natural Language Parser for List Queries
 *
 * Parses user input like "top 10 basketball all-time" into structured list creation data
 */

import {
  CATEGORY_CONFIG,
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

// Time period patterns. The YEAR read is deliberately generic: any bare
// four-digit year (19xx/20xx) is the year the list is about. An earlier version
// listed `2024|2025` under "this year", so "top 50 songs 2024" — one of this
// module's own example queries — parsed to whatever year the clock said.
// Decade ("2020s") is checked before year so the suffix form wins.
const TIME_PATTERNS = {
  allTime: /\b(?:all[- ]?time|ever|history)\b/i,
  decade: /\b(\d{3})0s\b/i,
  thisYear: /\b(?:this|current) year\b/i,
  lastDecade: /\blast decade\b|\brecent\b|\bmodern\b/i,
  year: /\b((?:19|20)\d{2})\b/,
};

const currentYear = (): number => new Date().getFullYear();
const currentDecade = (): string => String(Math.floor(currentYear() / 10) * 10);

// Category keywords (lowercase for matching). Exported so a test can check the
// keys against CATEGORY_CONFIG — this table is hand-maintained.
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Sports: ['sports', 'sport', 'athletes', 'players', 'teams'],
  Music: ['music', 'songs', 'albums', 'artists', 'bands', 'musicians', 'tracks'],
  Games: ['games', 'gaming', 'video games', 'videogames', 'esports'],
  Stories: ['stories', 'movies', 'films', 'books', 'shows', 'tv', 'series', 'anime', 'manga'],
};

// Subcategory keywords for Sports. Exported for the same vocabulary test.
export const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
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

  // Check for a decade suffix ("2020s") before any year read
  const decadeMatch = lowerQuery.match(TIME_PATTERNS.decade);
  if (decadeMatch) {
    return { timePeriod: 'decade', decade: `${decadeMatch[1]}0`, confidence: 1 };
  }

  // Check for last decade / modern — the decade the clock is in
  if (TIME_PATTERNS.lastDecade.test(lowerQuery)) {
    return { timePeriod: 'decade', decade: currentDecade(), confidence: 0.9 };
  }

  // Check for this year — the year the clock is in
  if (TIME_PATTERNS.thisYear.test(lowerQuery)) {
    return { timePeriod: 'year', year: String(currentYear()), confidence: 0.9 };
  }

  // Check for a bare year ("songs 2024", "in 1999", "2019 edition")
  const yearMatch = lowerQuery.match(TIME_PATTERNS.year);
  if (yearMatch) {
    return { timePeriod: 'year', year: yearMatch[1], confidence: 1 };
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
