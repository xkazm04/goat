/**
 * Utility functions for Collection feature
 */

import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';
import { CollectionGroup, CollectionItem } from '@/app/features/Collection/types';

/**
 * Convert BacklogItem to CollectionItem
 */
export function backlogItemToCollectionItem(item: BacklogItem): CollectionItem {
  return {
    id: item.id,
    title: item.title || item.name,
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
 * Convert BacklogGroup to CollectionGroup
 */
export function backlogGroupToCollectionGroup(group: BacklogGroup): CollectionGroup {
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
 * Convert array of BacklogGroups to CollectionGroups
 */
export function backlogGroupsToCollectionGroups(groups: BacklogGroup[]): CollectionGroup[] {
  return groups.map(backlogGroupToCollectionGroup);
}











