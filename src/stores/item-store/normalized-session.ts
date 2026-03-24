/**
 * Normalized Session Storage
 *
 * This module provides utilities for storing session data in a normalized format
 * to avoid expensive O(n*m) transformations during save operations.
 *
 * Instead of deep nested mapping on every save, data is stored in flat Maps
 * and transformed lazily only when needed for read operations.
 *
 * PERFORMANCE: Uses Map<string, T> instead of Record<string, T> so that
 * single-entry mutations (add/remove/update) only pay O(1) for the Map.set()
 * rather than O(n) for a full object spread.
 *
 * NOTE: Uses ItemTransformer for core conversion logic.
 */

import {
  backlogToNormalized,
  normalizedToBacklog,
  normalizedToBacklogItemType,
  extractTitle,
  normalizeImageUrl,
} from '@/lib/items';
import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';
import { BacklogGroupType, BacklogItemType } from '@/types/match';

/**
 * Normalized storage format for groups - stores metadata separately from items
 */
export interface NormalizedGroupMeta {
  id: string;
  name: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
  isOpen: boolean;
  itemIds: string[]; // Reference to items by ID
}

/**
 * Normalized storage format for items - stored in a flat map by ID
 *
 * See NAME vs TITLE CONTRACT in `@/types/backlog-groups.ts`.
 */
export interface NormalizedItem {
  id: string;
  /** Resolved display label (produced by extractTitle: name > title). */
  title: string;
  /** Canonical identifier from the API. */
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  tags: string[];
  matched: boolean;
  /**
   * Whether this item is currently placed in the match grid.
   *
   * Propagated from `BacklogItem.used` via `backlogToNormalized` transformer.
   * See `backlogStore.markItemAsUsed()` for the authoritative setter.
   */
  used?: boolean;
  groupId: string; // Reference back to parent group
}

/**
 * Normalized session data structure
 *
 * Uses Map for O(1) single-entry updates instead of Record spreads.
 * Not persisted directly — reconstructed on load from legacy format.
 */
export interface NormalizedBacklogData {
  version: 2; // Version marker for migration
  groupsById: Map<string, NormalizedGroupMeta>;
  groupOrder: string[]; // Preserves group ordering
  itemsById: Map<string, NormalizedItem>;
}

/**
 * Check if data is in normalized format
 */
export function isNormalizedData(data: unknown): data is NormalizedBacklogData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    (data as NormalizedBacklogData).version === 2 &&
    'groupsById' in data &&
    'itemsById' in data &&
    'groupOrder' in data
  );
}

/**
 * Helper to create NormalizedItem from BacklogItem with group context
 */
function createNormalizedItem(item: BacklogItem, groupId: string, groupCategory?: string): NormalizedItem {
  return backlogToNormalized(
    {
      ...item,
      category: item.category || groupCategory || 'general',
    },
    groupId
  );
}

/**
 * Normalize BacklogGroup[] to NormalizedBacklogData
 * This is only called once when setting backlog groups from API
 */
export function normalizeBacklogGroups(groups: BacklogGroup[]): NormalizedBacklogData {
  const groupsById = new Map<string, NormalizedGroupMeta>();
  const itemsById = new Map<string, NormalizedItem>();
  const groupOrder: string[] = [];

  for (const group of groups) {
    const itemIds: string[] = [];

    // Process items using ItemTransformer
    for (const item of group.items || []) {
      const normalizedItem = createNormalizedItem(item, group.id, group.category);
      itemsById.set(item.id, normalizedItem);
      itemIds.push(item.id);
    }

    // Create group metadata
    const normalizedGroup: NormalizedGroupMeta = {
      id: group.id,
      name: group.name,
      title: group.name,
      description: group.description,
      category: group.category || 'general',
      subcategory: group.subcategory,
      image_url: normalizeImageUrl(group.image_url),
      item_count: group.item_count || itemIds.length,
      created_at: group.created_at || new Date().toISOString(),
      updated_at: group.updated_at || new Date().toISOString(),
      isOpen: group.isOpen ?? true,
      itemIds
    };

    groupsById.set(group.id, normalizedGroup);
    groupOrder.push(group.id);
  }

  return {
    version: 2,
    groupsById,
    groupOrder,
    itemsById
  };
}

/**
 * Denormalize NormalizedBacklogData back to BacklogGroupType[] for session storage
 * This is called lazily when needed for compatibility
 */
export function denormalizeToBacklogGroupType(data: NormalizedBacklogData): BacklogGroupType[] {
  const result: BacklogGroupType[] = [];

  for (const groupId of data.groupOrder) {
    const group = data.groupsById.get(groupId);
    if (!group) continue;

    // Convert items using ItemTransformer
    const items: BacklogItemType[] = group.itemIds
      .map(itemId => data.itemsById.get(itemId))
      .filter((item): item is NormalizedItem => item !== undefined)
      .map(item => normalizedToBacklogItemType(item));

    result.push({
      id: group.id,
      name: group.name,
      title: group.title,
      description: group.description,
      category: group.category,
      subcategory: group.subcategory,
      image_url: normalizeImageUrl(group.image_url),
      item_count: group.item_count,
      created_at: group.created_at,
      updated_at: group.updated_at,
      items,
      isOpen: group.isOpen
    });
  }

  return result;
}

/**
 * Denormalize NormalizedBacklogData back to BacklogGroup[] for runtime use
 * This is called lazily when needed
 */
export function denormalizeToBacklogGroup(data: NormalizedBacklogData): BacklogGroup[] {
  const result: BacklogGroup[] = [];

  for (const groupId of data.groupOrder) {
    const group = data.groupsById.get(groupId);
    if (!group) continue;

    // Convert items using ItemTransformer
    const items: BacklogItem[] = group.itemIds
      .map(itemId => data.itemsById.get(itemId))
      .filter((item): item is NormalizedItem => item !== undefined)
      .map(item => normalizedToBacklog(item));

    result.push({
      id: group.id,
      name: group.name,
      description: group.description,
      category: group.category,
      subcategory: group.subcategory,
      image_url: normalizeImageUrl(group.image_url),
      item_count: group.item_count,
      items,
      created_at: group.created_at,
      updated_at: group.updated_at,
      isOpen: group.isOpen
    });
  }

  return result;
}

/**
 * Migrate legacy BacklogGroupType[] to NormalizedBacklogData
 * Used for backward compatibility with existing stored sessions
 */
export function migrateFromLegacyFormat(groups: BacklogGroupType[]): NormalizedBacklogData {
  const groupsById = new Map<string, NormalizedGroupMeta>();
  const itemsById = new Map<string, NormalizedItem>();
  const groupOrder: string[] = [];

  for (const group of groups) {
    const itemIds: string[] = [];

    for (const item of group.items || []) {
      // BacklogItemType has slightly different shape, adapt it
      const backlogItem: BacklogItem = {
        id: item.id,
        name: extractTitle(item),
        title: extractTitle(item),
        description: item.description,
        category: item.category || group.category || 'general',
        subcategory: item.subcategory || group.subcategory,
        item_year: item.item_year,
        item_year_to: item.item_year_to,
        image_url: item.image_url,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at,
        tags: item.tags,
        matched: item.matched,
        used: item.used,
      };
      const normalizedItem = createNormalizedItem(backlogItem, group.id, group.category);
      itemsById.set(item.id, normalizedItem);
      itemIds.push(item.id);
    }

    const normalizedGroup: NormalizedGroupMeta = {
      id: group.id,
      name: group.name,
      title: extractTitle(group),
      description: group.description,
      category: group.category || 'general',
      subcategory: group.subcategory,
      image_url: normalizeImageUrl(group.image_url),
      item_count: group.item_count || itemIds.length,
      created_at: group.created_at || new Date().toISOString(),
      updated_at: group.updated_at || new Date().toISOString(),
      isOpen: group.isOpen ?? true,
      itemIds
    };

    groupsById.set(group.id, normalizedGroup);
    groupOrder.push(group.id);
  }

  return {
    version: 2,
    groupsById,
    groupOrder,
    itemsById
  };
}

/**
 * Create an empty normalized data structure
 */
export function createEmptyNormalizedData(): NormalizedBacklogData {
  return {
    version: 2,
    groupsById: new Map(),
    groupOrder: [],
    itemsById: new Map()
  };
}

/**
 * Fast update operations on normalized data.
 *
 * Single-entry mutations (add, remove, mark matched/unmatched, update fields)
 * are O(1) via Map.set() — only the affected entry is cloned, not the entire
 * collection. Bulk operations (clearAllMatched, updateGroupItems) remain O(n)
 * but benefit from faster Map iteration vs. object property enumeration.
 */
export const NormalizedOps = {
  /**
   * Add an item to a group — O(1)
   */
  addItem(data: NormalizedBacklogData, groupId: string, item: BacklogItem): NormalizedBacklogData {
    const group = data.groupsById.get(groupId);
    if (!group) return data;
    if (data.itemsById.has(item.id)) return data; // Already exists

    const normalizedItem = createNormalizedItem(item, groupId, group.category);

    const newItemsById = new Map(data.itemsById);
    newItemsById.set(item.id, normalizedItem);

    const newGroupsById = new Map(data.groupsById);
    newGroupsById.set(groupId, {
      ...group,
      itemIds: [...group.itemIds, item.id],
      item_count: group.item_count + 1
    });

    return {
      ...data,
      itemsById: newItemsById,
      groupsById: newGroupsById,
    };
  },

  /**
   * Remove an item from a group — O(k) where k is items in group, not total items
   */
  removeItem(data: NormalizedBacklogData, groupId: string, itemId: string): NormalizedBacklogData {
    const group = data.groupsById.get(groupId);
    if (!group) return data;
    if (!data.itemsById.has(itemId)) return data;

    const newItemsById = new Map(data.itemsById);
    newItemsById.delete(itemId);

    const newGroupsById = new Map(data.groupsById);
    newGroupsById.set(groupId, {
      ...group,
      itemIds: group.itemIds.filter(id => id !== itemId),
      item_count: Math.max(0, group.item_count - 1)
    });

    return {
      ...data,
      itemsById: newItemsById,
      groupsById: newGroupsById,
    };
  },

  /**
   * Update items for a specific group — replaces all items in the group
   */
  updateGroupItems(data: NormalizedBacklogData, groupId: string, items: BacklogItem[]): NormalizedBacklogData {
    const group = data.groupsById.get(groupId);
    if (!group) return data;

    // Remove old items for this group, add new ones
    const newItemsById = new Map(data.itemsById);
    for (const oldItemId of group.itemIds) {
      newItemsById.delete(oldItemId);
    }

    const newItemIds: string[] = [];
    for (const item of items) {
      const normalizedItem = createNormalizedItem(item, groupId, group.category);
      newItemsById.set(item.id, normalizedItem);
      newItemIds.push(item.id);
    }

    const newGroupsById = new Map(data.groupsById);
    newGroupsById.set(groupId, {
      ...group,
      itemIds: newItemIds,
      item_count: newItemIds.length
    });

    return {
      ...data,
      itemsById: newItemsById,
      groupsById: newGroupsById,
    };
  },

  /**
   * Get items for a specific group — O(k) where k is items in group
   */
  getGroupItems(data: NormalizedBacklogData, groupId: string): BacklogItem[] {
    const group = data.groupsById.get(groupId);
    if (!group) return [];

    return group.itemIds
      .map(itemId => data.itemsById.get(itemId))
      .filter((item): item is NormalizedItem => item !== undefined)
      .map(item => normalizedToBacklog(item));
  },

  /**
   * Get all items as flat array
   */
  getAllItems(data: NormalizedBacklogData): BacklogItem[] {
    return Array.from(data.itemsById.values()).map(item => normalizedToBacklog(item));
  },

  /**
   * Search groups and items by term
   */
  searchGroups(data: NormalizedBacklogData, searchTerm: string): BacklogGroup[] {
    if (!searchTerm.trim()) {
      return denormalizeToBacklogGroup(data);
    }

    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    const matchingGroupIds: string[] = [];

    for (const groupId of data.groupOrder) {
      const group = data.groupsById.get(groupId);
      if (!group) continue;

      const nameMatch = group.name.toLowerCase().includes(lowerSearchTerm);
      const descriptionMatch = group.description?.toLowerCase().includes(lowerSearchTerm);

      const itemsMatch = group.itemIds.some(itemId => {
        const item = data.itemsById.get(itemId);
        if (!item) return false;
        return (
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.description?.toLowerCase().includes(lowerSearchTerm) ||
          item.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
        );
      });

      if (nameMatch || descriptionMatch || itemsMatch) {
        matchingGroupIds.push(groupId);
      }
    }

    // Return only matching groups with their items
    const filteredData: NormalizedBacklogData = {
      ...data,
      groupOrder: matchingGroupIds
    };

    return denormalizeToBacklogGroup(filteredData);
  },

  /**
   * Mark a single item as matched — O(1) via Map.set()
   */
  markItemMatched(data: NormalizedBacklogData, itemId: string, _matchedWith: string): NormalizedBacklogData {
    const item = data.itemsById.get(itemId);
    if (!item) return data;

    const newItemsById = new Map(data.itemsById);
    newItemsById.set(itemId, { ...item, matched: true, used: true });

    return { ...data, itemsById: newItemsById };
  },

  /**
   * Mark a single item as unmatched — O(1) via Map.set()
   */
  markItemUnmatched(data: NormalizedBacklogData, itemId: string): NormalizedBacklogData {
    const item = data.itemsById.get(itemId);
    if (!item) return data;

    const newItemsById = new Map(data.itemsById);
    newItemsById.set(itemId, { ...item, matched: false, used: false });

    return { ...data, itemsById: newItemsById };
  },

  /**
   * Update an item's field(s) — O(1) via Map.set()
   */
  updateItemFields(data: NormalizedBacklogData, itemId: string, updates: Partial<NormalizedItem>): NormalizedBacklogData {
    const item = data.itemsById.get(itemId);
    if (!item) return data;

    const newItemsById = new Map(data.itemsById);
    newItemsById.set(itemId, { ...item, ...updates });

    return { ...data, itemsById: newItemsById };
  },

  /**
   * Clear all matched/used flags — O(n) where n is total items
   */
  clearAllMatched(data: NormalizedBacklogData): NormalizedBacklogData {
    const newItemsById = new Map<string, NormalizedItem>();
    data.itemsById.forEach((item, id) => {
      newItemsById.set(id, { ...item, matched: false, used: false });
    });
    return { ...data, itemsById: newItemsById };
  },

  /**
   * Get groups by category
   */
  getGroupsByCategory(data: NormalizedBacklogData, category: string, subcategory?: string): BacklogGroup[] {
    const matchingGroupIds = data.groupOrder.filter(groupId => {
      const group = data.groupsById.get(groupId);
      if (!group) return false;

      const categoryMatch = group.category === category;
      const subcategoryMatch = !subcategory || group.subcategory === subcategory;

      return categoryMatch && subcategoryMatch;
    });

    const filteredData: NormalizedBacklogData = {
      ...data,
      groupOrder: matchingGroupIds
    };

    return denormalizeToBacklogGroup(filteredData);
  }
};
