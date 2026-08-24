/**
 * Boundary Convention Utilities
 *
 * Centralizes all boundary-to-tier lookups through a single convention.
 *
 * CANONICAL CONVENTION:
 *   All tier boundaries use 0-based positions with EXCLUSIVE end.
 *   A tier covering positions 0–9 is represented as { start: 0, end: 10 }.
 *   The check is: position >= start && position < end
 *
 * Three representations exist in the codebase:
 *   1. lib/tiers TierDefinition  — { startPosition, endPosition }  (end exclusive)
 *   2. tierConfig TierDefinition — { range: { start, end } }       (end exclusive)
 *   3. types/ranking TierBoundary — { startPosition, endPosition } (end INCLUSIVE)
 *
 * This module provides a single getTierForPosition() that handles all three,
 * and converters to normalize inclusive-end boundaries to the canonical form.
 */

// ---------------------------------------------------------------------------
// BoundaryConvention type
// ---------------------------------------------------------------------------

/**
 * Describes which convention a set of boundaries follows.
 * Used as a parameter when ingesting boundaries from different sources.
 */
export interface BoundaryConvention {
  /**
   * When true, endPosition is the first position NOT in the tier.
   * Example: { start: 0, end: 10 } covers positions 0–9.
   *
   * When false, endPosition IS the last position in the tier.
   * Example: { start: 0, end: 9 } covers positions 0–9.
   */
  isEndExclusive: boolean;
}

/** The canonical convention used throughout the tiers system. */
export const CANONICAL_CONVENTION: BoundaryConvention = { isEndExclusive: true };

/** The convention used in types/ranking.ts TierBoundary. */
export const INCLUSIVE_END_CONVENTION: BoundaryConvention = { isEndExclusive: false };

// ---------------------------------------------------------------------------
// Minimal range shape for the canonical lookup
// ---------------------------------------------------------------------------

/** Any object that exposes a start/end range (canonical exclusive-end). */
export interface TierRange {
  start: number;
  end: number; // exclusive
}

// ---------------------------------------------------------------------------
// Extractors — pull a canonical TierRange from the three shapes
// ---------------------------------------------------------------------------

/** Extract canonical range from lib/tiers TierDefinition (startPosition/endPosition, exclusive). */
export function rangeFromTierDef(tier: { startPosition: number; endPosition: number }): TierRange {
  return { start: tier.startPosition, end: tier.endPosition };
}

/** Extract canonical range from tierConfig TierDefinition (range.start/range.end, exclusive). */
export function rangeFromTierConfig(tier: { range: { start: number; end: number } }): TierRange {
  return { start: tier.range.start, end: tier.range.end };
}

/** Extract canonical range from types/ranking TierBoundary (startPosition/endPosition, INCLUSIVE). */
export function rangeFromInclusiveBoundary(
  boundary: { startPosition: number; endPosition: number }
): TierRange {
  return { start: boundary.startPosition, end: boundary.endPosition + 1 };
}

// ---------------------------------------------------------------------------
// Central lookup
// ---------------------------------------------------------------------------

/**
 * Canonical tier-for-position lookup.
 *
 * Accepts any array of items that have a TierRange attached via `getRange`.
 * Returns the first tier whose range contains `position`, or null.
 *
 * @param position  0-based grid position
 * @param tiers     Array of tier-like objects
 * @param getRange  Extracts a canonical [start, end) range from each tier
 */
export function getTierForPositionGeneric<T>(
  position: number,
  tiers: T[],
  getRange: (tier: T) => TierRange,
): T | null {
  for (const tier of tiers) {
    const range = getRange(tier);
    if (position >= range.start && position < range.end) {
      return tier;
    }
  }
  return null;
}

/**
 * Check whether `position` sits at the last slot of any tier
 * (i.e., position === tier.end - 1 for at least one tier).
 */
export function isAtBoundaryGeneric<T>(
  position: number,
  tiers: T[],
  getRange: (tier: T) => TierRange,
): boolean {
  return tiers.some(tier => {
    const range = getRange(tier);
    return position === range.end - 1;
  });
}

/**
 * Check whether `position` is exactly at a tier transition point
 * (i.e., position === some non-last tier's end, meaning it's the first
 * position of the next tier).
 */
export function isTierTransitionGeneric<T>(
  position: number,
  tiers: T[],
  getRange: (tier: T) => TierRange,
): boolean {
  // All tiers except the last: check if position equals their exclusive end
  for (let i = 0; i < tiers.length - 1; i++) {
    const range = getRange(tiers[i]);
    if (range.end === position) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert an inclusive-end boundary to an exclusive-end boundary.
 * Use when ingesting data from types/ranking.ts TierBoundary.
 */
export function inclusiveToExclusive(inclusiveEnd: number): number {
  return inclusiveEnd + 1;
}

/**
 * Convert an exclusive-end boundary to an inclusive-end boundary.
 * Use when emitting data for types/ranking.ts TierBoundary.
 */
export function exclusiveToInclusive(exclusiveEnd: number): number {
  return exclusiveEnd - 1;
}
