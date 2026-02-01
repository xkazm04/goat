/**
 * Collection Types for List Organization
 *
 * Collections (folders) allow users to organize their lists into groups,
 * with support for nesting (2 levels max), sharing, and analytics.
 */

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
 * Database row format (snake_case) matching Supabase schema
 */
export interface ListCollectionRow {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  user_id: string;
  list_ids: string[];
  is_public: boolean;
  share_slug: string | null;
  order: number;
  created_at: string;
  updated_at: string;
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
export type DefaultCollectionType = 'favorites' | 'recent' | 'completed';

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
 * Request payload for reordering collections
 */
export interface ReorderCollectionsRequest {
  collections: Array<{
    id: string;
    order: number;
    parentId: string | null;
  }>;
}

/**
 * Request payload for adding/removing lists from a collection
 */
export interface UpdateCollectionListsRequest {
  addListIds?: string[];
  removeListIds?: string[];
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
 * Drag operation types for collection management
 */
export type CollectionDragType =
  | 'list-to-collection'    // Moving a list into a collection
  | 'collection-reorder'    // Reordering collections at same level
  | 'collection-nest';      // Moving collection into another (nesting)

/**
 * Drag operation payload for collection drag events
 */
export interface CollectionDragPayload {
  type: CollectionDragType;
  sourceId: string;
  targetId: string;
  position?: 'before' | 'after' | 'inside';
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
 * Transform frontend format to database row (camelCase to snake_case)
 */
export function transformToCollectionRow(
  collection: Partial<ListCollection>
): Partial<ListCollectionRow> {
  const row: Partial<ListCollectionRow> = {};

  if (collection.name !== undefined) row.name = collection.name;
  if (collection.description !== undefined) row.description = collection.description;
  if (collection.coverImage !== undefined) row.cover_image = collection.coverImage;
  if (collection.color !== undefined) row.color = collection.color;
  if (collection.icon !== undefined) row.icon = collection.icon;
  if (collection.parentId !== undefined) row.parent_id = collection.parentId;
  if (collection.userId !== undefined) row.user_id = collection.userId;
  if (collection.listIds !== undefined) row.list_ids = collection.listIds;
  if (collection.isPublic !== undefined) row.is_public = collection.isPublic;
  if (collection.shareSlug !== undefined) row.share_slug = collection.shareSlug;
  if (collection.order !== undefined) row.order = collection.order;

  return row;
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
 * Maximum nesting depth for collections
 */
export const MAX_COLLECTION_DEPTH = 2;

/**
 * Check if a collection can have children (based on depth)
 */
export function canHaveChildren(
  collection: ListCollection,
  allCollections: ListCollection[]
): boolean {
  let depth = 0;
  let current: ListCollection | undefined = collection;

  while (current?.parentId) {
    depth++;
    current = allCollections.find(c => c.id === current!.parentId);
    if (depth >= MAX_COLLECTION_DEPTH) return false;
  }

  return depth < MAX_COLLECTION_DEPTH - 1;
}

/**
 * Build collection tree from flat list
 */
export function buildCollectionTree(
  collections: ListCollection[],
  expandedIds: Set<string> = new Set()
): CollectionTreeNode[] {
  const nodeMap = new Map<string, CollectionTreeNode>();
  const roots: CollectionTreeNode[] = [];

  // Create nodes for all collections
  collections.forEach(collection => {
    nodeMap.set(collection.id, {
      collection,
      children: [],
      depth: 0,
      isExpanded: expandedIds.has(collection.id),
    });
  });

  // Build tree structure
  collections.forEach(collection => {
    const node = nodeMap.get(collection.id)!;

    if (collection.parentId) {
      const parent = nodeMap.get(collection.parentId);
      if (parent) {
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Sort children by order
  const sortByOrder = (a: CollectionTreeNode, b: CollectionTreeNode) =>
    a.collection.order - b.collection.order;

  roots.sort(sortByOrder);
  nodeMap.forEach(node => node.children.sort(sortByOrder));

  return roots;
}

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
