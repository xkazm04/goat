/**
 * Item Details API Types
 *
 * Types for the rich item detail inspector feature.
 */

/**
 * Item Detail Response
 * Contains all available metadata, related items, and community ranking data
 */
export interface ItemDetailResponse {
  /** Core item data */
  item: {
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    item_year?: number;
    item_year_to?: number;
    reference_url?: string;
    created_at?: string;
    updated_at?: string;
    group_id?: string;
    group_name?: string;
    /** DB engagement metrics */
    view_count?: number;
    selection_count?: number;
  };
  /** Related items from same category/tags */
  relatedItems: RelatedItemData[];
  /** Community ranking statistics */
  rankingStats: RankingStatsData | null;
  /** Recent rankings featuring this item */
  recentRankings: RecentRankingData[];
  /** External links */
  externalLinks: ExternalLinkData[];
}

/**
 * Related item data
 */
export interface RelatedItemData {
  id: string;
  title: string;
  image_url?: string;
  similarity_reason: 'category' | 'tags' | 'similar_ranking';
}

/**
 * Ranking statistics data
 */
export interface RankingStatsData {
  totalRankings: number;
  averagePosition: number;
  medianPosition: number;
  distribution: Record<number, number>;
  volatility: number;
  confidence: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
  };
}

/**
 * Recent ranking entry
 */
export interface RecentRankingData {
  listId: string;
  listTitle: string;
  position: number;
  rankedAt: string;
  userId?: string;
}

/**
 * External link data
 */
export interface ExternalLinkData {
  type: 'wikipedia' | 'imdb' | 'spotify' | 'youtube' | 'custom';
  url: string;
  label: string;
}
