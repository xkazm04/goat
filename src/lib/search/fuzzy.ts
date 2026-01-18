/**
 * Fuzzy Search Utilities
 *
 * Provides fuzzy matching algorithms for text search with scoring.
 */

export interface FuzzyMatchResult {
  /** Whether the pattern matches */
  matches: boolean;
  /** Relevance score (0-1) */
  score: number;
  /** Matched character indices for highlighting */
  matchedIndices?: number[];
}

/**
 * Simple fuzzy match with scoring
 *
 * Scoring factors:
 * - Exact match: 1.0
 * - Contains match: 0.9
 * - Word start match: 0.3 per word
 * - Character match with consecutive bonus: up to 0.7
 */
export function fuzzyMatch(pattern: string, text: string): FuzzyMatchResult {
  if (!pattern || !text) {
    return { matches: false, score: 0 };
  }

  const pLower = pattern.toLowerCase().trim();
  const tLower = text.toLowerCase();

  // Exact match gets highest score
  if (tLower === pLower) {
    return {
      matches: true,
      score: 1.0,
      matchedIndices: Array.from({ length: text.length }, (_, i) => i),
    };
  }

  // Contains match gets high score
  const containsIndex = tLower.indexOf(pLower);
  if (containsIndex !== -1) {
    return {
      matches: true,
      score: 0.9,
      matchedIndices: Array.from({ length: pLower.length }, (_, i) => containsIndex + i),
    };
  }

  // Word start matching
  const words = tLower.split(/\s+/);
  const patternWords = pLower.split(/\s+/);
  let wordMatchScore = 0;
  const wordMatchedIndices: number[] = [];

  for (const pw of patternWords) {
    let charOffset = 0;
    for (const word of words) {
      if (word.startsWith(pw)) {
        wordMatchScore += 0.3;
        const wordStart = tLower.indexOf(word, charOffset);
        if (wordStart !== -1) {
          for (let i = 0; i < pw.length; i++) {
            wordMatchedIndices.push(wordStart + i);
          }
        }
      }
      charOffset += word.length + 1; // +1 for space
    }
  }

  if (wordMatchScore > 0) {
    return {
      matches: true,
      score: Math.min(wordMatchScore, 0.8),
      matchedIndices: wordMatchedIndices,
    };
  }

  // Fuzzy character matching
  let patternIdx = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;
  const matchedIndices: number[] = [];

  for (let i = 0; i < tLower.length && patternIdx < pLower.length; i++) {
    if (tLower[i] === pLower[patternIdx]) {
      if (i === lastMatchIdx + 1) {
        consecutiveBonus += 0.1;
      }
      lastMatchIdx = i;
      matchedIndices.push(i);
      patternIdx++;
    }
  }

  if (patternIdx === pLower.length) {
    const baseScore = pLower.length / tLower.length;
    return {
      matches: true,
      score: Math.min(baseScore + consecutiveBonus, 0.7),
      matchedIndices,
    };
  }

  return { matches: false, score: 0 };
}

/**
 * Multi-field fuzzy match with weighted scoring
 */
export function fuzzyMatchFields(
  pattern: string,
  fields: Array<{ text: string; weight: number }>
): FuzzyMatchResult {
  if (!pattern || fields.length === 0) {
    return { matches: false, score: 0 };
  }

  let bestMatch: FuzzyMatchResult = { matches: false, score: 0 };
  let totalWeight = 0;
  let weightedScore = 0;

  for (const field of fields) {
    if (!field.text) continue;

    const result = fuzzyMatch(pattern, field.text);
    if (result.matches) {
      totalWeight += field.weight;
      weightedScore += result.score * field.weight;

      // Track best match for indices
      if (result.score > (bestMatch.score || 0)) {
        bestMatch = result;
      }
    }
  }

  if (totalWeight > 0) {
    return {
      matches: true,
      score: weightedScore / totalWeight,
      matchedIndices: bestMatch.matchedIndices,
    };
  }

  return { matches: false, score: 0 };
}

/**
 * Highlight matched characters in text
 */
export function highlightMatches(
  text: string,
  matchedIndices?: number[]
): Array<{ text: string; highlighted: boolean }> {
  if (!matchedIndices || matchedIndices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const indexSet = new Set(matchedIndices);
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let currentSegment = '';
  let currentHighlighted = false;

  for (let i = 0; i < text.length; i++) {
    const isHighlighted = indexSet.has(i);

    if (i === 0) {
      currentHighlighted = isHighlighted;
    } else if (isHighlighted !== currentHighlighted) {
      if (currentSegment) {
        segments.push({ text: currentSegment, highlighted: currentHighlighted });
      }
      currentSegment = '';
      currentHighlighted = isHighlighted;
    }

    currentSegment += text[i];
  }

  if (currentSegment) {
    segments.push({ text: currentSegment, highlighted: currentHighlighted });
  }

  return segments;
}

/**
 * Score recency boost based on timestamp
 */
export function recencyBoost(
  timestamp: string | undefined,
  maxBoost = 0.2,
  decayDays = 30
): number {
  if (!timestamp) return 0;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 0;

  const now = Date.now();
  const age = now - date.getTime();
  const ageDays = age / (1000 * 60 * 60 * 24);

  // Exponential decay
  return maxBoost * Math.exp(-ageDays / decayDays);
}

/**
 * Score popularity boost based on usage count
 */
export function popularityBoost(
  count: number | undefined,
  maxBoost = 0.15,
  scale = 100
): number {
  if (!count || count <= 0) return 0;

  // Logarithmic scaling
  return maxBoost * Math.min(Math.log10(count + 1) / Math.log10(scale + 1), 1);
}

/**
 * Combine scores with weights
 */
export function combineScores(
  scores: Array<{ score: number; weight: number }>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { score, weight } of scores) {
    if (weight > 0) {
      totalWeight += weight;
      weightedSum += score * weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
