/**
 * Collection Types for List Organization
 *
 * Collections (folders) allow users to organize their lists into groups,
 * with support for nesting (2 levels max), sharing, and analytics.
 *
 * Corrected 2026-09-05: the nesting limit is enforced by the collections API
 * routes (src/app/api/collections/route.ts and [id]/route.ts validate depth on
 * create and re-parent), NOT by this module — the `canHaveChildren` /
 * `MAX_COLLECTION_DEPTH` pair that used to live here had zero importers and
 * was removed with `transformToCollectionRow`, `ReorderCollectionsRequest`,
 * `UpdateCollectionListsRequest`, `CollectionDragType` and
 * `CollectionDragPayload` (0 consumers each, knip + grep). The database row
 * shape is the one derived from the schema in database.ts; this file used to
 * carry a second, hand-written copy.
 */

import type { ListCollectionRow } from './database';

/**
 * Main collection entity representing a folder/group of lists
 */
export interface ListCollection {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  userId: string;
  listIds: string[];
  isPublic: boolean;
  shareSlug: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Collection statistics computed from contained lists
 */
export interface CollectionStats {
  listCount: number;
  totalItems: number;
  completedLists: number;
  lastActivity: string | null;
}

/**
 * Collection with computed stats (for display)
 */
export interface ListCollectionWithStats extends ListCollection {
  stats: CollectionStats;
}

/**
 * Default collection types that are automatically created for users
 */
type DefaultCollectionType = 'favorites' | 'recent' | 'completed';

/**
 * Default collection configuration
 */
export interface DefaultCollectionConfig {
  type: DefaultCollectionType;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
}

/**
 * Request payload for creating a new collection
 */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  coverImage?: string;
  parentId?: string | null;
  isPublic?: boolean;
}

/**
 * Request payload for updating a collection
 */
export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  coverImage?: string;
  parentId?: string | null;
  isPublic?: boolean;
  order?: number;
  listIds?: string[];
}

/**
 * Query parameters for fetching collections
 */
export interface CollectionQueryParams {
  userId?: string;
  parentId?: string | null;
  includeChildren?: boolean;
  includeStats?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'created' | 'modified' | 'order';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Collection tree node for hierarchical display
 */
export interface CollectionTreeNode {
  collection: ListCollection;
  children: CollectionTreeNode[];
  depth: number;
  isExpanded: boolean;
}

/**
 * Transform database row to frontend format (snake_case to camelCase)
 */
export function transformCollectionRow(row: ListCollectionRow): ListCollection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverImage: row.cover_image,
    color: row.color,
    icon: row.icon,
    parentId: row.parent_id,
    userId: row.user_id,
    listIds: row.list_ids || [],
    isPublic: row.is_public,
    shareSlug: row.share_slug,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Default collections configuration
 */
export const DEFAULT_COLLECTIONS: DefaultCollectionConfig[] = [
  {
    type: 'favorites',
    name: 'Favorites',
    icon: 'star',
    color: '#fbbf24',
    isSystem: true,
  },
  {
    type: 'recent',
    name: 'Recent',
    icon: 'clock',
    color: '#60a5fa',
    isSystem: true,
  },
  {
    type: 'completed',
    name: 'Completed',
    icon: 'check-circle',
    color: '#34d399',
    isSystem: true,
  },
];

/**
 * Generate a unique share slug from collection name
 */
export function generateShareSlug(name: string, existingSlugs: string[] = []): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
