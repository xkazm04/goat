/**
 * Admin feature types
 * Centralized type definitions for admin components
 */

/**
 * AdminItem - Unified item type for admin dashboard components
 * Used by MissingImagesSection, AdminItemCard, and other admin components
 */
export interface AdminItem {
  id: string;
  name: string;
  image_url?: string | null;
  description?: string;
  category: string;
  subcategory?: string;
  group?: string;
  item_year?: number;
  item_year_to?: number;
  reference_url?: string;
  created_at?: string;
}

/**
 * Response type for paginated items queries
 */
export interface AdminItemsResponse {
  items: AdminItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Metadata returned from AI-powered image search
 */
export interface AISearchMetadata {
  image_url?: string | null;
  description?: string | null;
  reference_url?: string | null;
  item_year?: number | null;
  item_year_to?: number | null;
}
