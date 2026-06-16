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

import { createClient, requireAuth } from '@/lib/supabase/server';

import type { SyncOperation, OperationType } from '@/lib/offline/types';
import type { ListSession } from '@/stores/item-store/types';
import type { GridItemType } from '@/types/match';

// ============================================================================
// Structured Logging
// ============================================================================

function generateTraceId(): string {
  return `sync_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  traceId: string;
  route: string;
  event: string;
  durationMs?: number;
  operationType?: OperationType | string;
  operationId?: string;
  entityId?: string;
  success?: boolean;
  error?: string;
  operationCount?: number;
  typeBreakdown?: Record<string, number>;
  successCount?: number;
  failureCount?: number;
  [key: string]: unknown;
}

function syncLog(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

// ============================================================================
// Validation Constants
// ============================================================================

/** Maximum number of list IDs allowed in a single sync status request */
const MAX_LIST_IDS = 50;

/** Maximum number of operations allowed in a single sync batch */
const MAX_OPERATIONS = 50;

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract matched items from grid for syncing to list_items.
 * Uses matchedWith which grid-operations populates with the backlog item ID.
 */
function extractMatchedItems(gridItems: GridItemType[]): Array<{
  item_id: string;
  ranking: number;
}> {
  return gridItems
    .filter((item) => item.context.matched && item.item?.id)
    .map((item) => ({
      item_id: item.item!.id,
      ranking: item.position,
    }));
}

/**
 * Atomically replace list items using a database transaction via RPC.
 * Prevents data loss from partial sync failures where delete succeeds but insert fails.
 */
async function atomicReplaceListItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  matchedItems: Array<{ item_id: string; ranking: number }>
): Promise<{ updatedAt: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('replace_list_items', {
    target_list_id: listId,
    new_items: JSON.stringify(matchedItems),
  });

  if (error) {
    return { updatedAt: null, error: error.message };
  }

  return { updatedAt: data, error: null };
}

// ============================================================================
// Operation Processors
// ============================================================================

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

    // Atomically replace list items (delete + insert + timestamp in one transaction)
    const { updatedAt, error: replaceError } = await atomicReplaceListItems(
      supabase,
      listId,
      matchedItems
    );

    if (replaceError || !updatedAt) {
      return {
        operationId: operation.id,
        success: false,
        error: `Failed to replace list items: ${replaceError || 'No timestamp returned'}`,
      };
    }

    return {
      operationId: operation.id,
      success: true,
      serverVersion: new Date(updatedAt).getTime(),
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

    // Atomically replace list items (delete + insert + timestamp in one transaction)
    const { updatedAt, error: replaceError } = await atomicReplaceListItems(
      supabase,
      listId,
      matchedItems
    );

    if (replaceError || !updatedAt) {
      return {
        operationId: operation.id,
        success: false,
        error: `Failed to replace list items: ${replaceError || 'No timestamp returned'}`,
      };
    }

    return {
      operationId: operation.id,
      success: true,
      serverVersion: new Date(updatedAt).getTime(),
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
    // Delete list items first (cascade would handle this but being explicit).
    // supabase-js returns errors IN-BAND (it does not throw), so the try/catch
    // alone would report a failed delete as success — the offline queue then
    // drops the op locally = permanent silent data loss. Check {error} explicitly.
    const { error } = await supabase.from('list_items').delete().eq('list_id', listId);
    if (error) {
      return {
        operationId: operation.id,
        success: false,
        error: error.message,
      };
    }

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
 * Process a single sync operation with timing and structured logging
 */
async function processOperation(
  operation: SyncOperation,
  supabase: Awaited<ReturnType<typeof createClient>>,
  traceId: string
): Promise<SyncOperationResult> {
  const opStart = performance.now();
  let result: SyncOperationResult;

  switch (operation.type) {
    case 'UPDATE_SESSION':
      result = await processUpdateSession(operation, supabase);
      break;

    case 'UPDATE_GRID':
      result = await processUpdateGrid(operation, supabase);
      break;

    case 'DELETE_SESSION':
      result = await processDeleteSession(operation, supabase);
      break;

    case 'CREATE_SESSION':
      // CREATE_SESSION is a no-op server-side - sessions are client-only
      result = {
        operationId: operation.id,
        success: true,
        serverVersion: Date.now(),
      };
      break;

    case 'UPDATE_BACKLOG':
      // UPDATE_BACKLOG is client-only - backlog state doesn't sync to server
      result = {
        operationId: operation.id,
        success: true,
        serverVersion: Date.now(),
      };
      break;

    default:
      result = {
        operationId: operation.id,
        success: false,
        error: `Unknown operation type: ${operation.type}`,
      };
      break;
  }

  const durationMs = Math.round((performance.now() - opStart) * 100) / 100;

  syncLog({
    level: result.success ? 'info' : 'error',
    traceId,
    route: '/api/sync',
    event: 'operation_complete',
    operationType: operation.type,
    operationId: operation.id,
    entityId: operation.entityId,
    success: result.success,
    durationMs,
    ...(result.error ? { error: result.error } : {}),
  });

  return result;
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /api/sync
 *
 * Process sync operations from the client
 */
export async function POST(request: NextRequest) {
  const traceId = generateTraceId();
  const batchStart = performance.now();

  try {
    const auth = await requireAuth();
    if (auth.error) {
      syncLog({
        level: 'warn',
        traceId,
        route: '/api/sync',
        event: 'auth_rejected',
      });
      return auth.error;
    }

    const supabase = await createClient();

    // Parse request body
    const body: SyncRequest = await request.json();

    if (!body.operations || !Array.isArray(body.operations)) {
      syncLog({
        level: 'warn',
        traceId,
        route: '/api/sync',
        event: 'invalid_request',
        error: 'operations array required',
      });
      return NextResponse.json(
        { error: 'Invalid request: operations array required' },
        { status: 400 }
      );
    }

    if (body.operations.length > MAX_OPERATIONS) {
      syncLog({
        level: 'warn',
        traceId,
        route: '/api/sync',
        event: 'invalid_request',
        error: `Too many operations: ${body.operations.length} exceeds max ${MAX_OPERATIONS}`,
      });
      return NextResponse.json(
        { error: `Too many operations: max ${MAX_OPERATIONS} allowed per request` },
        { status: 400 }
      );
    }

    // Build type breakdown for the batch
    const typeBreakdown: Record<string, number> = {};
    for (const op of body.operations) {
      typeBreakdown[op.type] = (typeBreakdown[op.type] || 0) + 1;
    }

    syncLog({
      level: 'info',
      traceId,
      route: '/api/sync',
      event: 'batch_start',
      operationCount: body.operations.length,
      typeBreakdown,
    });

    // Group operations by entityId so independent entities can run in parallel,
    // while operations on the same entity run sequentially to preserve order
    // (e.g., CREATE then UPDATE on the same list).
    const operationsByEntity = new Map<string, { index: number; op: SyncOperation }[]>();

    for (let i = 0; i < body.operations.length; i++) {
      const op = body.operations[i];
      const key = op.entityId;
      if (!operationsByEntity.has(key)) {
        operationsByEntity.set(key, []);
      }
      operationsByEntity.get(key)!.push({ index: i, op });
    }

    // Process each entity group in parallel; within a group, process sequentially
    const indexedResults: { index: number; result: SyncOperationResult }[] = [];

    await Promise.all(
      Array.from(operationsByEntity.values()).map(async (group) => {
        let entityGroupFailed = false;
        let failedError = '';
        for (const { index, op } of group) {
          if (entityGroupFailed) {
            // A prior operation on this entity failed — skip to prevent
            // bypassing conflict detection with stale data
            syncLog({
              level: 'warn',
              traceId,
              route: '/api/sync',
              event: 'operation_skipped',
              operationType: op.type,
              operationId: op.id,
              entityId: op.entityId,
              error: `Skipped: prior operation on entity ${op.entityId} failed (${failedError})`,
            });
            indexedResults.push({
              index,
              result: {
                operationId: op.id,
                success: false,
                error: `Skipped: prior operation on this entity failed (${failedError})`,
              },
            });
            continue;
          }
          const result = await processOperation(op, supabase, traceId);
          if (!result.success) {
            entityGroupFailed = true;
            failedError = result.error || 'Unknown error';
          }
          indexedResults.push({ index, result });
        }
      })
    );

    // Restore original operation order
    indexedResults.sort((a, b) => a.index - b.index);
    const results = indexedResults.map((r) => r.result);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const totalDurationMs = Math.round((performance.now() - batchStart) * 100) / 100;

    syncLog({
      level: failureCount > 0 ? 'warn' : 'info',
      traceId,
      route: '/api/sync',
      event: 'batch_complete',
      operationCount: results.length,
      successCount,
      failureCount,
      typeBreakdown,
      durationMs: totalDurationMs,
    });

    const response: SyncResponse = {
      results,
      syncedAt: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const totalDurationMs = Math.round((performance.now() - batchStart) * 100) / 100;

    syncLog({
      level: 'error',
      traceId,
      route: '/api/sync',
      event: 'batch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: totalDurationMs,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
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
  const traceId = generateTraceId();
  const start = performance.now();

  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const listIds = searchParams.get('listIds')?.split(',') || [];

    if (listIds.length === 0) {
      syncLog({
        level: 'warn',
        traceId,
        route: '/api/sync',
        event: 'invalid_request',
        error: 'listIds query parameter required',
      });
      return NextResponse.json(
        { error: 'listIds query parameter required' },
        { status: 400 }
      );
    }

    if (listIds.length > MAX_LIST_IDS) {
      syncLog({
        level: 'warn',
        traceId,
        route: '/api/sync',
        event: 'invalid_request',
        error: `Too many listIds: ${listIds.length} exceeds max ${MAX_LIST_IDS}`,
      });
      return NextResponse.json(
        { error: `Too many listIds: max ${MAX_LIST_IDS} allowed` },
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

    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    syncLog({
      level: 'info',
      traceId,
      route: '/api/sync',
      event: 'get_versions',
      operationCount: listIds.length,
      durationMs,
    });

    return NextResponse.json({
      versions,
      serverTime: Date.now(),
    });
  } catch (error) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    syncLog({
      level: 'error',
      traceId,
      route: '/api/sync',
      event: 'get_versions_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
