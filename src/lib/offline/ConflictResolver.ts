/**
 * ConflictResolver - UI and logic for handling conflicts
 *
 * Provides intelligent three-way merge for session data conflicts,
 * with automatic resolution strategies and manual resolution support.
 */

import {
  ConflictRecord,
  ConflictType,
  ConflictResolutionStrategy,
  ConflictResolutionResult,
  SyncOperation,
} from './types';
import { ListSession } from '@/stores/item-store/types';
import { GridItemType, BacklogGroupType } from '@/types/match';

// Generate unique conflict ID
function generateConflictId(): string {
  return `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Deep comparison for objects
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

// Detect conflict type from local and server states
function detectConflictType(
  local: unknown,
  server: unknown,
  base: unknown
): ConflictType {
  const localExists = local !== null && local !== undefined;
  const serverExists = server !== null && server !== undefined;

  if (localExists && !serverExists) {
    return 'delete_update'; // Server deleted, we updated
  }

  if (!localExists && serverExists) {
    return 'update_delete'; // We deleted, server updated
  }

  return 'update_update'; // Both modified
}

export interface GridMergeResult {
  mergedGrid: GridItemType[];
  conflicts: Array<{
    position: number;
    local: GridItemType | null;
    server: GridItemType | null;
  }>;
}

export interface SessionMergeResult {
  mergedSession: ListSession;
  gridConflicts: GridMergeResult['conflicts'];
  hasUnresolvedConflicts: boolean;
}

export class ConflictResolver {
  private defaultStrategy: ConflictResolutionStrategy;

  constructor(defaultStrategy: ConflictResolutionStrategy = 'server_wins') {
    this.defaultStrategy = defaultStrategy;
  }

  // ============================================================================
  // Conflict Detection
  // ============================================================================

  createConflictRecord(
    operation: SyncOperation,
    serverData: unknown,
    baseData?: unknown
  ): ConflictRecord {
    const conflictType = detectConflictType(
      operation.payload,
      serverData,
      baseData ?? null
    );

    return {
      id: generateConflictId(),
      operationId: operation.id,
      entityId: operation.entityId,
      entityType: operation.entityType,
      conflictType,
      localData: operation.payload,
      serverData,
      baseData: baseData ?? null,
      createdAt: Date.now(),
      resolvedAt: null,
      resolution: null,
      resolvedData: null,
    };
  }

  hasConflict(
    localData: unknown,
    serverData: unknown,
    baseData?: unknown
  ): boolean {
    // If either is null/undefined, we have a delete conflict
    if (!localData || !serverData) {
      return true;
    }

    // If both are equal, no conflict
    if (deepEqual(localData, serverData)) {
      return false;
    }

    // If we have a base version, check if both diverged from it
    if (baseData !== undefined) {
      const localChanged = !deepEqual(localData, baseData);
      const serverChanged = !deepEqual(serverData, baseData);

      // Only conflict if both changed
      return localChanged && serverChanged;
    }

    // Without base version, assume conflict if different
    return true;
  }

  // ============================================================================
  // Automatic Resolution
  // ============================================================================

  resolveAutomatically(
    conflict: ConflictRecord,
    strategy?: ConflictResolutionStrategy
  ): ConflictResolutionResult {
    const resolveStrategy = strategy ?? this.defaultStrategy;

    switch (resolveStrategy) {
      case 'local_wins':
        return {
          resolved: true,
          strategy: 'local_wins',
          mergedData: conflict.localData,
          requiresManualResolution: false,
        };

      case 'server_wins':
        return {
          resolved: true,
          strategy: 'server_wins',
          mergedData: conflict.serverData,
          requiresManualResolution: false,
        };

      case 'merge':
        return this.attemptAutoMerge(conflict);

      case 'manual':
      default:
        return {
          resolved: false,
          strategy: 'manual',
          mergedData: null,
          requiresManualResolution: true,
        };
    }
  }

  private attemptAutoMerge(conflict: ConflictRecord): ConflictResolutionResult {
    // Try to merge based on entity type
    if (conflict.entityType === 'session') {
      return this.mergeSessionConflict(conflict);
    }

    if (conflict.entityType === 'grid') {
      return this.mergeGridConflict(conflict);
    }

    // Can't auto-merge unknown types
    return {
      resolved: false,
      strategy: 'manual',
      mergedData: null,
      requiresManualResolution: true,
    };
  }

  // ============================================================================
  // Session Merging
  // ============================================================================

  private mergeSessionConflict(
    conflict: ConflictRecord
  ): ConflictResolutionResult {
    const local = conflict.localData as ListSession | null;
    const server = conflict.serverData as ListSession | null;
    const base = conflict.baseData as ListSession | null;

    if (!local || !server) {
      return {
        resolved: false,
        strategy: 'manual',
        mergedData: null,
        requiresManualResolution: true,
      };
    }

    try {
      const mergeResult = this.mergeSessionData(local, server, base);

      if (mergeResult.hasUnresolvedConflicts) {
        return {
          resolved: false,
          strategy: 'merge',
          mergedData: mergeResult.mergedSession,
          requiresManualResolution: true,
        };
      }

      return {
        resolved: true,
        strategy: 'merge',
        mergedData: mergeResult.mergedSession,
        requiresManualResolution: false,
      };
    } catch (error) {
      console.error('[ConflictResolver] Failed to merge sessions:', error);
      return {
        resolved: false,
        strategy: 'manual',
        mergedData: null,
        requiresManualResolution: true,
      };
    }
  }

  mergeSessionData(
    local: ListSession,
    server: ListSession,
    base: ListSession | null
  ): SessionMergeResult {
    // Merge grid items with three-way merge
    const gridMerge = this.mergeGridItems(
      local.gridItems,
      server.gridItems,
      base?.gridItems ?? []
    );

    // For backlog groups, take the union (both local and server additions)
    const mergedBacklogGroups = this.mergeBacklogGroups(
      local.backlogGroups,
      server.backlogGroups,
      base?.backlogGroups ?? []
    );

    // Take most recent timestamps
    const mergedSession: ListSession = {
      ...local,
      gridItems: gridMerge.mergedGrid,
      backlogGroups: mergedBacklogGroups,
      updatedAt: new Date().toISOString(),
      synced: false, // Needs re-sync after merge
    };

    return {
      mergedSession,
      gridConflicts: gridMerge.conflicts,
      hasUnresolvedConflicts: gridMerge.conflicts.length > 0,
    };
  }

  // ============================================================================
  // Grid Merging
  // ============================================================================

  private mergeGridConflict(conflict: ConflictRecord): ConflictResolutionResult {
    const local = conflict.localData as GridItemType[] | null;
    const server = conflict.serverData as GridItemType[] | null;
    const base = conflict.baseData as GridItemType[] | null;

    if (!local || !server) {
      return {
        resolved: false,
        strategy: 'manual',
        mergedData: null,
        requiresManualResolution: true,
      };
    }

    const mergeResult = this.mergeGridItems(local, server, base ?? []);

    if (mergeResult.conflicts.length > 0) {
      return {
        resolved: false,
        strategy: 'merge',
        mergedData: mergeResult.mergedGrid,
        requiresManualResolution: true,
      };
    }

    return {
      resolved: true,
      strategy: 'merge',
      mergedData: mergeResult.mergedGrid,
      requiresManualResolution: false,
    };
  }

  mergeGridItems(
    local: GridItemType[],
    server: GridItemType[],
    base: GridItemType[]
  ): GridMergeResult {
    const maxLength = Math.max(local.length, server.length);
    const mergedGrid: GridItemType[] = [];
    const conflicts: GridMergeResult['conflicts'] = [];

    // Create lookup maps
    const baseMap = new Map(base.map((item) => [item.position, item]));
    const localMap = new Map(local.map((item) => [item.position, item]));
    const serverMap = new Map(server.map((item) => [item.position, item]));

    for (let i = 0; i < maxLength; i++) {
      const baseItem = baseMap.get(i);
      const localItem = localMap.get(i);
      const serverItem = serverMap.get(i);

      // Check for conflicts at this position
      const localMatched = localItem?.matched ?? false;
      const serverMatched = serverItem?.matched ?? false;
      const baseMatched = baseItem?.matched ?? false;

      const localChanged = localMatched !== baseMatched ||
        localItem?.backlogItemId !== baseItem?.backlogItemId;
      const serverChanged = serverMatched !== baseMatched ||
        serverItem?.backlogItemId !== baseItem?.backlogItemId;

      if (localChanged && serverChanged) {
        // Both changed same position - conflict!
        if (localItem?.backlogItemId !== serverItem?.backlogItemId) {
          conflicts.push({
            position: i,
            local: localItem ?? null,
            server: serverItem ?? null,
          });

          // Use server version by default for merged grid
          mergedGrid.push(serverItem ?? localItem!);
        } else {
          // Same item, merge metadata
          mergedGrid.push({
            ...(serverItem ?? localItem!),
            // Keep more complete metadata
            description: serverItem?.description || localItem?.description,
            tags: Array.from(new Set([...(serverItem?.tags ?? []), ...(localItem?.tags ?? [])])),
          });
        }
      } else if (localChanged) {
        // Only local changed
        mergedGrid.push(localItem ?? this.createEmptyGridItem(i));
      } else if (serverChanged) {
        // Only server changed
        mergedGrid.push(serverItem ?? this.createEmptyGridItem(i));
      } else {
        // Neither changed - use whatever exists
        mergedGrid.push(
          localItem ?? serverItem ?? baseItem ?? this.createEmptyGridItem(i)
        );
      }
    }

    return { mergedGrid, conflicts };
  }

  private createEmptyGridItem(position: number): GridItemType {
    return {
      id: `grid-${position}`,
      title: '',
      position,
      matched: false,
    };
  }

  // ============================================================================
  // Backlog Group Merging
  // ============================================================================

  private mergeBacklogGroups(
    local: BacklogGroupType[],
    server: BacklogGroupType[],
    base: BacklogGroupType[]
  ): BacklogGroupType[] {
    const merged = new Map<string, BacklogGroupType>();

    // Add all server groups
    for (const group of server) {
      merged.set(group.id, group);
    }

    // Add local groups (new ones added locally)
    for (const group of local) {
      if (!merged.has(group.id)) {
        merged.set(group.id, group);
      } else {
        // Merge group state (like isOpen)
        const serverGroup = merged.get(group.id)!;
        merged.set(group.id, {
          ...serverGroup,
          isOpen: group.isOpen ?? serverGroup.isOpen,
          isExpanded: group.isExpanded ?? serverGroup.isExpanded,
        });
      }
    }

    return Array.from(merged.values());
  }

  // ============================================================================
  // Resolution Helpers
  // ============================================================================

  resolveGridConflict(
    conflict: GridMergeResult['conflicts'][0],
    choice: 'local' | 'server'
  ): GridItemType {
    if (choice === 'local') {
      return conflict.local ?? this.createEmptyGridItem(conflict.position);
    }
    return conflict.server ?? this.createEmptyGridItem(conflict.position);
  }

  applyGridConflictResolutions(
    mergedGrid: GridItemType[],
    conflicts: GridMergeResult['conflicts'],
    resolutions: Map<number, 'local' | 'server'>
  ): GridItemType[] {
    const result = [...mergedGrid];

    for (const conflict of conflicts) {
      const choice = resolutions.get(conflict.position);
      if (choice) {
        result[conflict.position] = this.resolveGridConflict(conflict, choice);
      }
    }

    return result;
  }

  // ============================================================================
  // Conflict Summary
  // ============================================================================

  getConflictSummary(conflict: ConflictRecord): string {
    const type = conflict.conflictType;
    const entity = conflict.entityType;

    switch (type) {
      case 'update_update':
        return `Both local and server modified ${entity} data`;
      case 'update_delete':
        return `Local updated ${entity} but server deleted it`;
      case 'delete_update':
        return `Local deleted ${entity} but server updated it`;
      default:
        return `Unknown conflict type for ${entity}`;
    }
  }

  getRecommendedStrategy(conflict: ConflictRecord): ConflictResolutionStrategy {
    // For delete conflicts, prefer keeping data
    if (conflict.conflictType === 'update_delete') {
      return 'local_wins'; // Keep local (has data)
    }

    if (conflict.conflictType === 'delete_update') {
      return 'server_wins'; // Keep server (has data)
    }

    // For session data, try merge first
    if (conflict.entityType === 'session' || conflict.entityType === 'grid') {
      return 'merge';
    }

    // Default to server wins
    return 'server_wins';
  }
}

// Singleton instance
let conflictResolverInstance: ConflictResolver | null = null;

export function getConflictResolver(
  defaultStrategy?: ConflictResolutionStrategy
): ConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver(defaultStrategy);
  }
  return conflictResolverInstance;
}
