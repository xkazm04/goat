/**
 * Utility functions for Collection feature
 */

import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';
import { ItemCategory, CollectionItem } from '@/app/features/Collection/types';
import { extractTitle } from '@/lib/items/item-utils';

/**
 * Convert BacklogItem to CollectionItem
 */
export function backlogItemToCollectionItem(item: BacklogItem): CollectionItem {
  return {
    id: item.id,
    title: extractTitle(item),
    image_url: item.image_url,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    tags: item.tags,
    ranking: undefined, // Ranking will be set separately if available
    used: item.used, // Preserve used state for filtering
    metadata: {
      item_year: item.item_year,
      item_year_to: item.item_year_to,
      created_at: item.created_at,
      updated_at: item.updated_at,
      group_id: undefined // Will be set by group converter
    }
  };
}

/**
 * Convert BacklogGroup to ItemCategory
 */
export function backlogGroupToItemCategory(group: BacklogGroup): ItemCategory {
  return {
    id: group.id,
    name: group.name,
    items: (group.items || []).map(backlogItemToCollectionItem),
    category: group.category,
    subcategory: group.subcategory,
    count: group.item_count || group.items?.length || 0
  };
}

/**
 * Convert array of BacklogGroups to ItemCategories
 */
export function backlogGroupsToItemCategories(groups: BacklogGroup[]): ItemCategory[] {
  return groups.map(backlogGroupToItemCategory);
}











