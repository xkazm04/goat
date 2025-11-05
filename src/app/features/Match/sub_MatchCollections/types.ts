/**
 * Types for the new integrated Match Collections
 */

export interface CollectionItem {
  id: string;
  title?: string;
  name?: string;
  image_url?: string | null;
  description?: string;
  category?: string;
  subcategory?: string;
  item_year?: number | null;
  item_year_to?: number | null;
  tags?: string[];
  created_at?: string;
  matched?: boolean;
  used?: boolean;
}

export interface CollectionGroup {
  id: string;
  name: string;
  items?: CollectionItem[];
  item_count?: number;
  category?: string;
  subcategory?: string;
}
