/**
 * Types for the new integrated Match Collections
 */

export interface CollectionItem {
  id: string;
  title: string;
  image_url?: string | null;
  description?: string;
}

export interface CollectionGroup {
  id: string;
  name: string;
  items: CollectionItem[];
}
