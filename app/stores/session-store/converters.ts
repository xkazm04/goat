import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { BacklogGroupType, BacklogItemType } from '@/app/types/match';
import { BacklogGroupConverter } from './types';

export const backlogGroupConverter: BacklogGroupConverter = {
  // Convert from runtime format (BacklogGroup) to storage format (BacklogGroupType)
  toStorageFormat: (group: BacklogGroup): BacklogGroupType => ({
    id: group.id,
    name: group.name,
    title: group.name, // For legacy compatibility
    items: (group.items || []).map(item => ({
      id: item.id,
      title: item.name || item.title || '',
      description: item.description || '',
      matched: false, // Default for storage
      tags: item.tags || []
    })),
    isOpen: true // Default to open
  }),

  // Convert from storage format (BacklogGroupType) to runtime format (BacklogGroup)
  fromStorageFormat: (group: BacklogGroupType): BacklogGroup => ({
    id: group.id,
    name: group.title || group.name,
    description: undefined,
    category: 'sports', // Default, will be updated from API
    subcategory: undefined,
    image_url: undefined,
    item_count: (group.items || []).length,
    items: (group.items || []).map(item => ({
      id: item.id,
      name: item.title,
      title: item.title,
      description: item.description,
      category: 'sports', // Default
      subcategory: undefined,
      item_year: undefined,
      item_year_to: undefined,
      image_url: undefined,
      created_at: new Date().toISOString(),
      tags: item.tags || []
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  // Convert array from runtime to storage format
  toStorageFormatArray: (groups: BacklogGroup[]): BacklogGroupType[] => {
    if (!Array.isArray(groups)) {
      console.warn('⚠️ toStorageFormatArray: groups is not an array:', typeof groups);
      return [];
    }
    return groups.map(group => backlogGroupConverter.toStorageFormat(group));
  },

  // Convert array from storage to runtime format
  fromStorageFormatArray: (groups: BacklogGroupType[]): BacklogGroup[] => {
    if (!Array.isArray(groups)) {
      console.warn('⚠️ fromStorageFormatArray: groups is not an array:', typeof groups);
      return [];
    }
    return groups.map(group => backlogGroupConverter.fromStorageFormat(group));
  }
};