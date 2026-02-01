/**
 * Sync API Endpoint
 *
 * Handles offline sync operations from the client. Processes batched
 * operations from the sync queue and returns results with server versions
 * for conflict detection.
 *
 * Operations supported:
 * - CREATE_SESSION: Create a new ranking session
 * - UPDATE_SESSION: Update an existing session with grid data
 * - DELETE_SESSION: Remove a session
 * - UPDATE_GRID: Batch update list items (rankings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SyncOperation, OperationType } from '@/lib/offline/types';
import type { ListSession } from '@/stores/item-store/types';
import type { GridItemType } from '@/types/match';

interface SyncRequest {
  operations: SyncOperation[];
}

interface SyncOperationResult {
  operationId: string;
  success: boolean;
  serverVersion?: number;
  error?: string;
  serverData?: unknown;
}

interface SyncResponse {
  results: SyncOperationResult[];
  syncedAt: number;
}

/**
 * Extract matched items from grid for syncing to list_items
 * Uses backlogItemId which contains the actual item ID
 */
function extractMatchedItems(gridItems: GridItemType[]): Array<{
  itemId: string;
  ranking: number;
}> {
  return gridItems
    .filter((item) => item.matched && item.backlogItemId)
    .map((item) => ({
      itemId: item.backlogItemId!,
      ranking: item.position,
    }));
}

/**
 * Process UPDATE_SESSION operation
 */
async function processUpdateSession(
  operation: SyncOperation,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SyncOperationResult> {
  const session = operation.payload as ListSession;
  const listId = operation.entityId;

  try {
    // First, verify the list exists
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, updated_at')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return {
        operationId: operation.id,
        success: false,
        error: `List ${listId} not found`,
      };
    }

    // Check for conflicts - if server version is newer
    const serverTime = new Date(list.updated_at).getTime();
    if (serverTime > operation.timestamp) {
      // Potential conflict - return server data
      const { data: serverItems } = await supabase
        .from('list_items')
        .select('item_id, ranking')
        .eq('list_id', listId)
        .order('ranking', { ascending: true });

      return {
        operationId: operation.id,
        success: false,
        error: 'Server has newer version',
        serverData: {
          serverVersion: serverTime,
          items: serverItems || [],
        },
      };
    }

    // Extract matched items from the session
    const matchedItems = extractMatchedItems(session.gridItems);

    // Delete existing list_items
    await supabase.from('list_items').delete().eq('list_id', listId);

    // Insert new rankings
    if (matchedItems.length > 0) {
      const listItemsToInsert = matchedItems.map((item) => ({
        list_id: listId,
        item_id: item.itemId,
        ranking: item.ranking,
      }));

      const { error: insertError } = await supabase
        .from('list_items')
        .insert(listItemsToInsert);

      if (insertError) {
        return {
          operationId: operation.id,
          success: false,
          error: `Failed to insert list items: ${insertError.message}`,
        };
      }
    }

    // Update list timestamp
    const { data: updatedList, error: updateError } = await supabase
      .from('lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId)
      .select('updated_at')
      .single();

    if (updateError) {
      return {
        operationId: operation.id,
        success: false,
        error: `Failed to update list: ${updateError.message}`,
      };
    }

    return {
      operationId: operation.id,
      success: true,
      serverVersion: new Date(updatedList.updated_at).getTime(),
    };
  } catch (error) {
    return {
      operationId: operation.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process UPDATE_GRID operation (same as UPDATE_SESSION but grid-specific)
 */
async function processUpdateGrid(
  operation: SyncOperation,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SyncOperationResult> {
  const gridItems = operation.payload as GridItemType[];
  const listId = operation.entityId;

  try {
    // Verify the list exists
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, updated_at')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return {
        operationId: operation.id,
        success: false,
        error: `List ${listId} not found`,
      };
    }

    // Extract matched items
    const matchedItems = extractMatchedItems(gridItems);

    // Delete existing and insert new
    await supabase.from('list_items').delete().eq('list_id', listId);

    if (matchedItems.length > 0) {
      const listItemsToInsert = matchedItems.map((item) => ({
        list_id: listId,
        item_id: item.itemId,
        ranking: item.ranking,
      }));

      const { error: insertError } = await supabase
        .from('list_items')
        .insert(listItemsToInsert);

      if (insertError) {
        return {
          operationId: operation.id,
          success: false,
          error: `Failed to insert list items: ${insertError.message}`,
        };
      }
    }

    // Update timestamp
    const { data: updatedList, error: updateError } = await supabase
      .from('lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId)
      .select('updated_at')
      .single();

    if (updateError) {
      return {
        operationId: operation.id,
        success: false,
        error: `Failed to update list: ${updateError.message}`,
      };
    }

    return {
      operationId: operation.id,
      success: true,
      serverVersion: new Date(updatedList.updated_at).getTime(),
    };
  } catch (error) {
    return {
      operationId: operation.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process DELETE_SESSION operation
 */
async function processDeleteSession(
  operation: SyncOperation,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SyncOperationResult> {
  const listId = operation.entityId;

  try {
    // Delete list items first (cascade would handle this but being explicit)
    await supabase.from('list_items').delete().eq('list_id', listId);

    // Note: We don't delete the actual list here - that's a separate operation
    // The session deletion is just about clearing the local ranking data
    // If the user wants to delete the list entirely, that's a different API

    return {
      operationId: operation.id,
      success: true,
      serverVersion: Date.now(),
    };
  } catch (error) {
    return {
      operationId: operation.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a single sync operation
 */
async function processOperation(
  operation: SyncOperation,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SyncOperationResult> {
  switch (operation.type) {
    case 'UPDATE_SESSION':
      return processUpdateSession(operation, supabase);

    case 'UPDATE_GRID':
      return processUpdateGrid(operation, supabase);

    case 'DELETE_SESSION':
      return processDeleteSession(operation, supabase);

    case 'CREATE_SESSION':
      // CREATE_SESSION is a no-op server-side - sessions are client-only
      // The actual list creation happens via the lists API
      return {
        operationId: operation.id,
        success: true,
        serverVersion: Date.now(),
      };

    case 'UPDATE_BACKLOG':
      // UPDATE_BACKLOG is client-only - backlog state doesn't sync to server
      return {
        operationId: operation.id,
        success: true,
        serverVersion: Date.now(),
      };

    default:
      return {
        operationId: operation.id,
        success: false,
        error: `Unknown operation type: ${operation.type}`,
      };
  }
}

/**
 * POST /api/sync
 *
 * Process sync operations from the client
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body
    const body: SyncRequest = await request.json();

    if (!body.operations || !Array.isArray(body.operations)) {
      return NextResponse.json(
        { error: 'Invalid request: operations array required' },
        { status: 400 }
      );
    }

    // Process operations in order (respect dependencies)
    const results: SyncOperationResult[] = [];

    for (const operation of body.operations) {
      const result = await processOperation(operation, supabase);
      results.push(result);
    }

    const response: SyncResponse = {
      results,
      syncedAt: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Sync API] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync
 *
 * Get sync status and server versions for conflict detection
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const listIds = searchParams.get('listIds')?.split(',') || [];

    if (listIds.length === 0) {
      return NextResponse.json(
        { error: 'listIds query parameter required' },
        { status: 400 }
      );
    }

    // Get server versions for the requested lists
    const { data: lists, error } = await supabase
      .from('lists')
      .select('id, updated_at')
      .in('id', listIds);

    if (error) {
      throw error;
    }

    const versions = (lists || []).reduce(
      (acc, list) => {
        acc[list.id] = new Date(list.updated_at).getTime();
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      versions,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('[Sync API] GET Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
