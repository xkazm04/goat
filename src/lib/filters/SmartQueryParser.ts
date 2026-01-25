/**
 * SmartQueryParser
 * Natural language query parser that converts human-readable queries
 * to FilterConfig objects and vice versa.
 *
 * Supports patterns like:
 * - "action movies 2020+" → category:action AND year >= 2020
 * - "rating > 4" → ranking > 4
 * - "batman or superman" → title contains batman OR superman
 * - "not horror" → category != horror
 * - "movies with tags comedy" → tags contains comedy
 * - "released after 2015" → year > 2015
 * - "unranked items" → ranking is empty
 */

import type {
  FilterConfig,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  FilterValueType,
  FilterCombinator,
} from './types';
import { EMPTY_FILTER_CONFIG } from './constants';

/**
 * Parsed query token
 */
interface QueryToken {
  type: 'term' | 'operator' | 'value' | 'field' | 'combinator' | 'negation';
  value: string;
  position: number;
}

/**
 * Pattern match result
 */
interface PatternMatch {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | null;
  valueType: FilterValueType;
  confidence: number; // 0-1 how confident we are in this match
}

/**
 * Query parsing result
 */
export interface ParseResult {
  config: FilterConfig;
  searchTerm: string; // Remaining text for full-text search
  matches: PatternMatch[];
  suggestions: QuerySuggestion[];
}

/**
 * Query suggestion for autocomplete
 */
export interface QuerySuggestion {
  text: string;
  description: string;
  type: 'field' | 'operator' | 'value' | 'template';
}

/**
 * Field aliases for natural language mapping
 */
const FIELD_ALIASES: Record<string, string> = {
  // Title variants
  name: 'title',
  movie: 'title',
  show: 'title',
  item: 'title',

  // Category variants
  type: 'category',
  genre: 'category',
  kind: 'category',

  // Rating variants
  rating: 'ranking',
  stars: 'ranking',
  score: 'ranking',
  rank: 'ranking',

  // Tags variants
  tag: 'tags',
  labels: 'tags',
  label: 'tags',

  // Year/date variants
  year: 'release_year',
  released: 'release_year',
  date: 'created_at',
  added: 'created_at',

  // Status variants
  used: 'used',
  placed: 'used',
  'in grid': 'used',
  ranked: 'used',
  unranked: 'used',
};

/**
 * Operator patterns for natural language
 */
const OPERATOR_PATTERNS: Array<{
  patterns: RegExp[];
  operator: FilterOperator;
  requiresValue: boolean;
}> = [
  // Comparison operators
  {
    patterns: [/^>=?$/, /^greater\s*than\s*or\s*equal/, /^at\s*least/, /^minimum/],
    operator: 'greater_equal',
    requiresValue: true,
  },
  {
    patterns: [/^<=?$/, /^less\s*than\s*or\s*equal/, /^at\s*most/, /^maximum/],
    operator: 'less_equal',
    requiresValue: true,
  },
  {
    patterns: [/^>$/, /^greater\s*than/, /^more\s*than/, /^above/, /^over/, /^after/],
    operator: 'greater_than',
    requiresValue: true,
  },
  {
    patterns: [/^<$/, /^less\s*than/, /^fewer\s*than/, /^below/, /^under/, /^before/],
    operator: 'less_than',
    requiresValue: true,
  },
  // Equality
  {
    patterns: [/^=$/, /^equals?$/, /^is$/, /^==$/, /^exactly/],
    operator: 'equals',
    requiresValue: true,
  },
  {
    patterns: [/^!=$/, /^not\s*equals?$/, /^isn't$/, /^is\s*not$/, /^<>$/],
    operator: 'not_equals',
    requiresValue: true,
  },
  // Contains
  {
    patterns: [/^contains?$/, /^includes?$/, /^has$/, /^with$/],
    operator: 'contains',
    requiresValue: true,
  },
  {
    patterns: [/^not\s*contains?$/, /^doesn't\s*include$/, /^without$/, /^excludes?$/],
    operator: 'not_contains',
    requiresValue: true,
  },
  // String position
  {
    patterns: [/^starts?\s*with$/, /^begins?\s*with$/, /^prefix$/],
    operator: 'starts_with',
    requiresValue: true,
  },
  {
    patterns: [/^ends?\s*with$/, /^suffix$/],
    operator: 'ends_with',
    requiresValue: true,
  },
  // Empty checks
  {
    patterns: [/^is\s*empty$/, /^empty$/, /^blank$/, /^unset$/, /^missing$/],
    operator: 'is_empty',
    requiresValue: false,
  },
  {
    patterns: [/^is\s*not\s*empty$/, /^not\s*empty$/, /^has\s*value$/, /^set$/],
    operator: 'is_not_empty',
    requiresValue: false,
  },
  // Range
  {
    patterns: [/^between$/],
    operator: 'between',
    requiresValue: true,
  },
  // In/not in
  {
    patterns: [/^in$/, /^one\s*of$/],
    operator: 'in',
    requiresValue: true,
  },
  {
    patterns: [/^not\s*in$/, /^none\s*of$/],
    operator: 'not_in',
    requiresValue: true,
  },
];

/**
 * Value patterns for specific fields
 */
const VALUE_PATTERNS: Record<string, RegExp> = {
  year: /\b(19|20)\d{2}\b/,
  rating: /\b[1-5](\.\d+)?\b/,
  boolean: /\b(true|false|yes|no)\b/i,
  number: /\b-?\d+(\.\d+)?\b/,
};

/**
 * Query templates for common patterns
 */
export const QUERY_TEMPLATES: QuerySuggestion[] = [
  { text: 'rating > 4', description: 'Items rated above 4 stars', type: 'template' },
  { text: 'not placed', description: 'Items not in the grid', type: 'template' },
  { text: 'category:action', description: 'Action category items', type: 'template' },
  { text: 'year >= 2020', description: 'Released 2020 or later', type: 'template' },
  { text: 'tags:favorite', description: 'Items tagged as favorite', type: 'template' },
  { text: 'unranked', description: 'Items without a rating', type: 'template' },
  { text: 'recently added', description: 'Items added recently', type: 'template' },
];

/**
 * SmartQueryParser class
 */
export class SmartQueryParser {
  private fieldAliases: Record<string, string>;
  private knownValues: Record<string, string[]>;

  constructor(
    customAliases?: Record<string, string>,
    knownValues?: Record<string, string[]>
  ) {
    this.fieldAliases = { ...FIELD_ALIASES, ...customAliases };
    this.knownValues = knownValues || {};
  }

  /**
   * Parse a natural language query into a FilterConfig
   */
  parse(query: string): ParseResult {
    const result: ParseResult = {
      config: { ...EMPTY_FILTER_CONFIG },
      searchTerm: '',
      matches: [],
      suggestions: [],
    };

    if (!query.trim()) {
      return result;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const conditions: FilterCondition[] = [];
    let combinator: FilterCombinator = 'AND';
    const remainingTerms: string[] = [];

    // Check for OR combinator
    if (/\bor\b/i.test(normalizedQuery)) {
      combinator = 'OR';
    }

    // Split by OR/AND for processing
    const segments = normalizedQuery
      .split(/\b(and|or)\b/i)
      .filter((s) => s.trim() && !/^(and|or)$/i.test(s.trim()));

    for (const segment of segments) {
      const trimmed = segment.trim();
      const match = this.parseSegment(trimmed);

      if (match) {
        result.matches.push(match);
        conditions.push(this.matchToCondition(match));
      } else {
        // This segment is a search term
        remainingTerms.push(trimmed);
      }
    }

    // Build the config
    result.config = {
      rootCombinator: combinator,
      conditions,
      groups: [],
    };

    // Remaining terms become the search term
    result.searchTerm = remainingTerms.join(' ').trim();

    // Generate suggestions
    result.suggestions = this.generateSuggestions(query, result.matches);

    return result;
  }

  /**
   * Parse a single query segment
   */
  private parseSegment(segment: string): PatternMatch | null {
    // Try field:value pattern first
    const fieldValueMatch = segment.match(/^(\w+)\s*[:=]\s*(.+)$/);
    if (fieldValueMatch) {
      const [, fieldRaw, valueRaw] = fieldValueMatch;
      const field = this.resolveField(fieldRaw);
      const { value, valueType } = this.parseValue(valueRaw.trim());

      return {
        field,
        operator: 'contains',
        value,
        valueType,
        confidence: 0.9,
      };
    }

    // Try comparison patterns: field > value, field >= value, etc.
    const comparisonMatch = segment.match(
      /^(\w+)\s*(>=?|<=?|!=|==?)\s*(.+)$/
    );
    if (comparisonMatch) {
      const [, fieldRaw, op, valueRaw] = comparisonMatch;
      const field = this.resolveField(fieldRaw);
      const operator = this.resolveOperator(op);
      const { value, valueType } = this.parseValue(valueRaw.trim());

      return {
        field,
        operator,
        value,
        valueType,
        confidence: 0.95,
      };
    }

    // Try "field operator value" pattern
    const naturalMatch = segment.match(
      /^(\w+)\s+(is|equals?|contains?|has|greater\s*than|less\s*than|above|below|after|before|with|without|starts?\s*with|ends?\s*with)\s+(.+)$/i
    );
    if (naturalMatch) {
      const [, fieldRaw, opRaw, valueRaw] = naturalMatch;
      const field = this.resolveField(fieldRaw);
      const operator = this.resolveOperator(opRaw);
      const { value, valueType } = this.parseValue(valueRaw.trim());

      return {
        field,
        operator,
        value,
        valueType,
        confidence: 0.85,
      };
    }

    // Try special keywords
    const specialMatch = this.parseSpecialKeywords(segment);
    if (specialMatch) {
      return specialMatch;
    }

    // Try "value+" pattern for year/rating (e.g., "2020+")
    const plusMatch = segment.match(/^(\d+)\+$/);
    if (plusMatch) {
      const numValue = parseInt(plusMatch[1], 10);
      // Determine if it's a year or rating
      const isYear = numValue >= 1900 && numValue <= 2100;

      return {
        field: isYear ? 'release_year' : 'ranking',
        operator: 'greater_equal',
        value: numValue,
        valueType: 'number',
        confidence: 0.7,
      };
    }

    return null;
  }

  /**
   * Parse special keywords like "unranked", "popular", etc.
   */
  private parseSpecialKeywords(segment: string): PatternMatch | null {
    const keywords: Record<string, PatternMatch> = {
      unranked: {
        field: 'ranking',
        operator: 'is_empty',
        value: null,
        valueType: 'number',
        confidence: 0.95,
      },
      ranked: {
        field: 'ranking',
        operator: 'is_not_empty',
        value: null,
        valueType: 'number',
        confidence: 0.95,
      },
      'not placed': {
        field: 'used',
        operator: 'equals',
        value: false,
        valueType: 'boolean',
        confidence: 0.95,
      },
      placed: {
        field: 'used',
        operator: 'equals',
        value: true,
        valueType: 'boolean',
        confidence: 0.95,
      },
      'in grid': {
        field: 'used',
        operator: 'equals',
        value: true,
        valueType: 'boolean',
        confidence: 0.95,
      },
      'not in grid': {
        field: 'used',
        operator: 'equals',
        value: false,
        valueType: 'boolean',
        confidence: 0.95,
      },
      'recently added': {
        field: 'created_at',
        operator: 'greater_than',
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        valueType: 'date',
        confidence: 0.8,
      },
      popular: {
        field: 'ranking',
        operator: 'greater_equal',
        value: 4,
        valueType: 'number',
        confidence: 0.7,
      },
      'top rated': {
        field: 'ranking',
        operator: 'equals',
        value: 5,
        valueType: 'number',
        confidence: 0.9,
      },
      favorites: {
        field: 'tags',
        operator: 'contains',
        value: 'favorite',
        valueType: 'array',
        confidence: 0.8,
      },
    };

    const normalized = segment.toLowerCase().trim();
    if (keywords[normalized]) {
      return keywords[normalized];
    }

    // Check for negation: "not X"
    if (normalized.startsWith('not ')) {
      const rest = normalized.slice(4).trim();
      const baseMatch = keywords[rest];
      if (baseMatch) {
        return {
          ...baseMatch,
          operator: this.negateOperator(baseMatch.operator),
          confidence: baseMatch.confidence * 0.9,
        };
      }
    }

    return null;
  }

  /**
   * Resolve field name from alias
   */
  private resolveField(fieldRaw: string): string {
    const normalized = fieldRaw.toLowerCase().trim();
    return this.fieldAliases[normalized] || normalized;
  }

  /**
   * Resolve operator from string
   */
  private resolveOperator(opRaw: string): FilterOperator {
    const normalized = opRaw.toLowerCase().trim();

    for (const { patterns, operator } of OPERATOR_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          return operator;
        }
      }
    }

    // Default to contains for text
    return 'contains';
  }

  /**
   * Negate an operator
   */
  private negateOperator(operator: FilterOperator): FilterOperator {
    const negations: Partial<Record<FilterOperator, FilterOperator>> = {
      equals: 'not_equals',
      not_equals: 'equals',
      contains: 'not_contains',
      not_contains: 'contains',
      is_empty: 'is_not_empty',
      is_not_empty: 'is_empty',
      in: 'not_in',
      not_in: 'in',
      greater_than: 'less_equal',
      less_than: 'greater_equal',
      greater_equal: 'less_than',
      less_equal: 'greater_than',
    };

    return negations[operator] || operator;
  }

  /**
   * Parse a value string to determine type
   */
  private parseValue(valueRaw: string): { value: string | number | boolean | null; valueType: FilterValueType } {
    const trimmed = valueRaw.trim();

    // Remove quotes
    const unquoted = trimmed.replace(/^["']|["']$/g, '');

    // Boolean
    if (/^(true|yes)$/i.test(unquoted)) {
      return { value: true, valueType: 'boolean' };
    }
    if (/^(false|no)$/i.test(unquoted)) {
      return { value: false, valueType: 'boolean' };
    }

    // Number
    if (/^-?\d+(\.\d+)?$/.test(unquoted)) {
      return { value: parseFloat(unquoted), valueType: 'number' };
    }

    // Date (ISO format or common patterns)
    if (/^\d{4}-\d{2}-\d{2}/.test(unquoted)) {
      return { value: new Date(unquoted).toISOString(), valueType: 'date' };
    }

    // Array (comma-separated) - stored as comma string for simplicity
    if (unquoted.includes(',')) {
      return {
        value: unquoted, // Keep as string, FilterEngine will handle array parsing
        valueType: 'array',
      };
    }

    // Default to string
    return { value: unquoted, valueType: 'string' };
  }

  /**
   * Convert a PatternMatch to a FilterCondition
   */
  private matchToCondition(match: PatternMatch): FilterCondition {
    return {
      id: `smart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      field: match.field,
      operator: match.operator,
      value: match.value,
      valueType: match.valueType,
      enabled: true,
    };
  }

  /**
   * Generate query suggestions
   */
  private generateSuggestions(
    query: string,
    matches: PatternMatch[]
  ): QuerySuggestion[] {
    const suggestions: QuerySuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Add field suggestions if typing a field
    const partialFieldMatch = queryLower.match(/(\w+)$/);
    if (partialFieldMatch) {
      const partial = partialFieldMatch[1];
      const fieldNames = Object.keys(this.fieldAliases);

      for (const field of fieldNames) {
        if (field.startsWith(partial) && field !== partial) {
          suggestions.push({
            text: `${field}:`,
            description: `Filter by ${field}`,
            type: 'field',
          });
        }
      }
    }

    // Add operator suggestions if field is typed
    const fieldColonMatch = queryLower.match(/(\w+):$/);
    if (fieldColonMatch) {
      suggestions.push(
        { text: 'contains ', description: 'Field contains value', type: 'operator' },
        { text: '= ', description: 'Field equals value', type: 'operator' },
        { text: '> ', description: 'Field greater than', type: 'operator' },
        { text: '< ', description: 'Field less than', type: 'operator' }
      );
    }

    // Add templates if query is short
    if (query.length < 10 && matches.length === 0) {
      suggestions.push(...QUERY_TEMPLATES.slice(0, 3));
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Convert a FilterConfig back to a human-readable query string
   */
  toQueryString(config: FilterConfig): string {
    const parts: string[] = [];

    const conditionToString = (cond: FilterCondition): string => {
      if (!cond.enabled) return '';

      const field = cond.field;
      const value = cond.value;

      switch (cond.operator) {
        case 'equals':
          return `${field}:${value}`;
        case 'not_equals':
          return `${field}!=${value}`;
        case 'contains':
          return `${field} contains ${value}`;
        case 'not_contains':
          return `${field} without ${value}`;
        case 'greater_than':
          return `${field} > ${value}`;
        case 'greater_equal':
          return `${field} >= ${value}`;
        case 'less_than':
          return `${field} < ${value}`;
        case 'less_equal':
          return `${field} <= ${value}`;
        case 'is_empty':
          return `${field} is empty`;
        case 'is_not_empty':
          return `${field} has value`;
        case 'starts_with':
          return `${field} starts with ${value}`;
        case 'ends_with':
          return `${field} ends with ${value}`;
        default:
          return `${field} ${cond.operator} ${value}`;
      }
    };

    // Process root conditions
    for (const cond of config.conditions) {
      const str = conditionToString(cond);
      if (str) parts.push(str);
    }

    // Process groups (simplified)
    for (const group of config.groups) {
      if (!group.enabled) continue;
      const groupParts: string[] = [];
      for (const cond of group.conditions) {
        const str = conditionToString(cond);
        if (str) groupParts.push(str);
      }
      if (groupParts.length > 0) {
        const groupStr = `(${groupParts.join(` ${group.combinator} `)})`;
        parts.push(groupStr);
      }
    }

    return parts.join(` ${config.rootCombinator} `);
  }

  /**
   * Update known values for better autocomplete
   */
  updateKnownValues(field: string, values: string[]): void {
    this.knownValues[field] = values;
  }

  /**
   * Get known values for a field
   */
  getKnownValues(field: string): string[] {
    return this.knownValues[field] || [];
  }
}

/**
 * Default parser instance
 */
export const defaultQueryParser = new SmartQueryParser();

/**
 * Convenience function to parse a query
 */
export function parseSmartQuery(query: string): ParseResult {
  return defaultQueryParser.parse(query);
}

/**
 * Convenience function to convert config to query string
 */
export function configToQueryString(config: FilterConfig): string {
  return defaultQueryParser.toQueryString(config);
}
