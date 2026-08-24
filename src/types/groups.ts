/**
 * Group & Item Group Types
 *
 * Domain types for item groups used across the GOAT API.
 */

export interface ItemGroup {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface ItemGroupWithItems extends ItemGroup {
  items: GroupItem[];
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
}

export interface GroupSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  limit?: number;
  offset?: number;
  minItemCount?: number;
}

export interface GroupCreateRequest {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  image_url?: string;
}

export interface GroupItemsResponse {
  group_id: string;
  items: GroupItem[];
  count: number;
}

export interface GroupSuggestion {
  query: string;
  suggestions: string[];
}
