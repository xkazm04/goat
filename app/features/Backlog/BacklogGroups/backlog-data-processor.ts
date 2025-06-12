import { BacklogGroup, BacklogItem } from "@/app/types/backlog-groups";
import { BacklogGroupType } from "@/app/types/match"; // Legacy types

export interface ProcessedGroupState {
  groups: BacklogGroup[];
  loadedGroups: Set<string>;
  loadingGroups: Set<string>;
  totalItems: number;
  hasChanges: boolean;
}

export interface GroupLoadingState {
  loadedGroups: Set<string>;
  loadingGroups: Set<string>;
}

export class BacklogDataProcessor {
  
  /**
   * Convert API groups to BacklogGroup format with store item merging
   */
  static processApiGroups(
    apiGroups: any[], 
    storeGroups: BacklogGroup[]
  ): BacklogGroup[] {
    console.log('🔄 Processing API groups:', {
      apiGroups: apiGroups.length,
      storeGroups: storeGroups.length
    });

    if (!apiGroups || apiGroups.length === 0) {
      console.log('📭 No API groups to process, returning store groups');
      return storeGroups;
    }

    const processedGroups = apiGroups.map(apiGroup => {
      // Find existing store group to preserve loaded items
      const existingStoreGroup = storeGroups.find(sg => sg.id === apiGroup.id);
      
      // Check if store group has items loaded
      const hasLoadedItems = existingStoreGroup && existingStoreGroup.items && existingStoreGroup.items.length > 0;
      
      const processedGroup: BacklogGroup = {
        id: apiGroup.id,
        name: apiGroup.name,
        description: apiGroup.description,
        category: apiGroup.category,
        subcategory: apiGroup.subcategory,
        image_url: apiGroup.image_url,
        item_count: apiGroup.item_count || 0,
        // Use existing items if available, otherwise empty array
        items: hasLoadedItems ? existingStoreGroup.items : [],
        created_at: apiGroup.created_at,
        updated_at: apiGroup.updated_at,
      };
      
      console.log(`📦 Processed group "${apiGroup.name}": ${processedGroup.items.length}/${processedGroup.item_count} items loaded`);
      
      return processedGroup;
    });

    console.log('✅ API groups processing complete:', processedGroups.length);
    return processedGroups;
  }

  /**
   * Merge processed groups with existing store state
   */
  static mergeWithStore(
    processedGroups: BacklogGroup[],
    storeGroups: BacklogGroup[]
  ): { groups: BacklogGroup[]; hasChanges: boolean } {
    if (processedGroups.length === 0) {
      return { groups: storeGroups, hasChanges: false };
    }

    // Check if group IDs have changed
    const processedIds = processedGroups.map(g => g.id).sort();
    const storeIds = storeGroups.map(g => g.id).sort();
    
    const hasIdChanges = JSON.stringify(processedIds) !== JSON.stringify(storeIds);
    
    if (hasIdChanges) {
      console.log('🔄 Group IDs changed, using processed groups');
      return { groups: processedGroups, hasChanges: true };
    }

    // Merge items from store into processed groups
    const mergedGroups = processedGroups.map(processedGroup => {
      const storeGroup = storeGroups.find(sg => sg.id === processedGroup.id);
      
      if (storeGroup && storeGroup.items.length > 0) {
        // Preserve loaded items from store
        return {
          ...processedGroup,
          items: storeGroup.items
        };
      }
      
      return processedGroup;
    });

    return { groups: mergedGroups, hasChanges: hasIdChanges };
  }

  /**
   * Update group loading states efficiently
   */
  static updateLoadingState(
    currentState: GroupLoadingState,
    groupId: string,
    action: 'start' | 'complete' | 'error'
  ): GroupLoadingState {
    const newLoadingGroups = new Set(currentState.loadingGroups);
    const newLoadedGroups = new Set(currentState.loadedGroups);

    switch (action) {
      case 'start':
        newLoadingGroups.add(groupId);
        console.log(`🚀 Starting load for group: ${groupId}`);
        break;
      case 'complete':
        newLoadingGroups.delete(groupId);
        newLoadedGroups.add(groupId);
        console.log(`✅ Completed load for group: ${groupId}`);
        break;
      case 'error':
        newLoadingGroups.delete(groupId);
        console.log(`❌ Error loading group: ${groupId}`);
        break;
    }

    return {
      loadingGroups: newLoadingGroups,
      loadedGroups: newLoadedGroups
    };
  }

  /**
   * Determine which groups should be auto-loaded
   */
  static getGroupsToAutoLoad(
    groups: BacklogGroup[],
    loadingState: GroupLoadingState,
    maxAutoLoad: number = 20
  ): BacklogGroup[] {
    const eligibleGroups = groups
      .filter(group => 
        group.item_count > 0 && 
        !loadingState.loadedGroups.has(group.id) && 
        !loadingState.loadingGroups.has(group.id)
      )
      .slice(0, maxAutoLoad);

    console.log(`🎯 Auto-load candidates:`, {
      totalGroups: groups.length,
      maxAutoLoad,
      eligibleCount: eligibleGroups.length,
      eligible: eligibleGroups.map(g => `${g.name} (${g.item_count} items)`),
      alreadyLoaded: Array.from(loadingState.loadedGroups),
      currentlyLoading: Array.from(loadingState.loadingGroups)
    });

    return eligibleGroups;
  }

  /**
   * Filter groups based on search term
   */
  static filterGroups(
    groups: BacklogGroup[],
    searchTerm: string
  ): BacklogGroup[] {
    if (!searchTerm || !searchTerm.trim()) {
      return groups;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    return groups.filter(group => {
      // Search in group name and description
      const groupMatches = 
        group.name.toLowerCase().includes(searchLower) ||
        group.description?.toLowerCase().includes(searchLower);

      // Search in items if they're loaded
      const itemMatches = group.items.some(item =>
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.title?.toLowerCase().includes(searchLower) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );

      return groupMatches || itemMatches;
    });
  }

  /**
   * Calculate total items across all groups
   */
  static calculateTotalItems(groups: BacklogGroup[]): number {
    return groups.reduce((acc, group) => acc + group.item_count, 0);
  }

  /**
   * Convert legacy store groups to new format
   */
  static convertLegacyGroups(legacyGroups: BacklogGroupType[]): BacklogGroup[] {
    return legacyGroups.map(legacyGroup => ({
      id: legacyGroup.id,
      name: legacyGroup.title, // title -> name
      description: undefined,
      category: 'sports', // Default category
      subcategory: undefined,
      image_url: undefined,
      item_count: legacyGroup.items.length,
      items: legacyGroup.items.map(item => ({
        id: item.id,
        name: item.title,
        title: item.title,
        description: item.description || '',
        category: 'sports',
        subcategory: undefined,
        item_year: undefined,
        item_year_to: undefined,
        image_url: undefined,
        created_at: new Date().toISOString(),
        tags: item.tags || []
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  /**
   * Update a specific group with loaded items
   */
  static updateGroupWithItems(
    groups: BacklogGroup[],
    groupId: string,
    items: BacklogItem[]
  ): BacklogGroup[] {
    return groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: items
        };
      }
      return group;
    });
  }

  /**
   * Check if groups data is valid and ready for rendering
   */
  static validateGroupsData(groups: BacklogGroup[]): boolean {
    if (!Array.isArray(groups)) {
      console.warn('⚠️ Groups data is not an array:', typeof groups);
      return false;
    }

    if (groups.length === 0) {
      console.log('📭 No groups available');
      return true; // Empty is valid
    }

    const isValid = groups.every(group => 
      group && 
      typeof group.id === 'string' && 
      typeof group.name === 'string' &&
      typeof group.item_count === 'number' &&
      Array.isArray(group.items)
    );

    if (!isValid) {
      console.error('❌ Invalid groups data structure');
      return false;
    }

    console.log('✅ Groups data validation passed:', groups.length);
    return true;
  }
}

/**
 * Performance metrics tracker for debugging
 */
export class BacklogPerformanceTracker {
  private static metrics: Map<string, number> = new Map();

  static startTimer(operation: string): void {
    this.metrics.set(`${operation}_start`, Date.now());
  }

  static endTimer(operation: string): number {
    const startTime = this.metrics.get(`${operation}_start`);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ ${operation}: ${duration}ms`);
      return duration;
    }
    return 0;
  }

  static logState(label: string, data: any): void {
    console.log(`📊 ${label}:`, data);
  }
}