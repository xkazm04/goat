/**
 * Item Types
 *
 * Domain types for items, item stats, research, and related API params.
 */

export interface Item {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  group?: string;
  group_id?: string;
  selection_count?: number;
  view_count?: number;
  created_at: string;
  updated_at?: string;
  tags?: string[];
}

export interface ItemSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  groupIds?: string[];
  sortBy?: 'name' | 'date' | 'popularity' | 'ranking';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ItemCreateRequest {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  group_id?: string;
  tags?: string[];
}

export interface ItemUpdateRequest extends Partial<ItemCreateRequest> {
  id: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  nextOffset?: number;
}

// =============================================================================
// Item Stats
// =============================================================================

export interface ItemStat {
  item_id: string;
  name: string;
  selection_count: number;
  view_count: number;
  average_ranking: number;
  percentile: number;
}

export interface ItemStatsResponse {
  stats: ItemStat[];
  total_items: number;
}

export interface ItemStatsParams {
  item_ids?: string[];
  category?: string;
}

// =============================================================================
// Research
// =============================================================================

export interface ItemResearchRequest {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  depth?: 'quick' | 'standard' | 'deep';
  handleDuplicates?: 'skip' | 'merge' | 'create';
}

export interface ItemResearchResponse {
  item?: Item;
  isValid: boolean;
  confidence: number;
  duplicates?: Array<{
    id: string;
    name: string;
    similarity: number;
  }>;
  sources?: Array<{
    name: string;
    url: string;
    confidence: number;
  }>;
  researchMethod: 'cache' | 'web' | 'llm';
}

export interface ItemValidationRequest {
  name: string;
  category: string;
  subcategory?: string;
}
