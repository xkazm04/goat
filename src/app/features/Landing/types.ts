/**
 * Shared type definitions for the Landing feature
 */

/**
 * Color configuration for showcase cards
 */
export interface CardColor {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Time period options for rankings
 */
export type TimePeriod = "all-time" | "decade" | "year";

/**
 * Base data structure for showcase cards.
 * This interface enforces consistent field naming across all showcase components
 * including ShowcaseCard, BannedShowcaseCard, and showcase data files.
 *
 * Note: The field is spelled "hierarchy" (not "hiearchy").
 */
export interface ShowcaseCardData {
  /** The category of the showcase item (e.g., "Sports", "Music") */
  category: string;
  /** Optional subcategory for more specific classification */
  subcategory?: string;
  /** Time period for the ranking */
  timePeriod: TimePeriod;
  /** The hierarchy/size of the list (e.g., "Top 10", "Top 50") */
  hierarchy: string;
  /** Display title for the showcase card */
  title: string;
  /** Author or creator name */
  author: string;
  /** Description or comment text */
  comment: string;
  /** Color scheme for the card */
  color: CardColor;
}

/**
 * Data structure passed to card click handlers.
 * Extends ShowcaseCardData for type safety with click handlers.
 * Used by ShowcaseCard and BannedShowcaseCard components.
 */
export interface CardClickData extends ShowcaseCardData {}

/**
 * Callback type for card click handlers
 */
export type CardClickHandler = (cardData: CardClickData) => void;
