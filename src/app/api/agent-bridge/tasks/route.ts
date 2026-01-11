/**
 * Agent Bridge Tasks API
 *
 * Provides REST endpoints for task management with pagination support.
 *
 * GET /api/agent-bridge/tasks - List tasks with filtering and pagination
 * POST /api/agent-bridge/tasks - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTaskMemoryManager,
  TaskFilterOptions,
  PaginationOptions,
  CreateTaskOptions,
  TaskStatus,
  TaskPriority,
} from '@/lib/agent-bridge';

/** Parse array query param */
function parseArrayParam<T extends string>(param: string | null): T[] | undefined {
  if (!param) return undefined;
  return param.split(',').map((s) => s.trim()) as T[];
}

/** Parse number query param */
function parseNumberParam(param: string | null, defaultValue?: number): number | undefined {
  if (!param) return defaultValue;
  const num = parseInt(param, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * GET /api/agent-bridge/tasks
 *
 * Query parameters:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - sortBy: 'createdAt' | 'updatedAt' | 'name' | 'priority' | 'status'
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 * - status: comma-separated list of statuses
 * - priority: comma-separated list of priorities
 * - ownerId: string
 * - parentTaskId: string
 * - tags: comma-separated list of tags
 * - createdAfter: timestamp (ms)
 * - createdBefore: timestamp (ms)
 * - includeExpired: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const manager = getTaskMemoryManager();

    // Parse pagination options
    const pagination: Partial<PaginationOptions> = {
      page: parseNumberParam(searchParams.get('page'), 1),
      pageSize: parseNumberParam(searchParams.get('pageSize'), 20),
      sortBy: (searchParams.get('sortBy') as PaginationOptions['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as PaginationOptions['sortOrder']) || 'desc',
    };

    // Parse filter options
    const filter: TaskFilterOptions = {
      status: parseArrayParam<TaskStatus>(searchParams.get('status')),
      priority: parseArrayParam<TaskPriority>(searchParams.get('priority')),
      ownerId: searchParams.get('ownerId') || undefined,
      parentTaskId: searchParams.get('parentTaskId') || undefined,
      tags: parseArrayParam<string>(searchParams.get('tags')),
      createdAfter: parseNumberParam(searchParams.get('createdAfter')),
      createdBefore: parseNumberParam(searchParams.get('createdBefore')),
      includeExpired: searchParams.get('includeExpired') === 'true',
    };

    const result = manager.getTasks(filter, pagination);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[agent-bridge/tasks] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-bridge/tasks
 *
 * Request body:
 * - name: string (required)
 * - description?: string
 * - priority?: 'low' | 'normal' | 'high' | 'critical'
 * - ttlMs?: number
 * - expirationPolicy?: 'sliding' | 'absolute' | 'never'
 * - parentTaskId?: string
 * - ownerId?: string
 * - tags?: string[]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const manager = getTaskMemoryManager();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', message: 'Task name is required and must be a string' },
        { status: 400 }
      );
    }

    const options: CreateTaskOptions = {
      name: body.name,
      description: body.description,
      priority: body.priority,
      ttlMs: body.ttlMs,
      expirationPolicy: body.expirationPolicy,
      parentTaskId: body.parentTaskId,
      ownerId: body.ownerId,
      tags: body.tags,
    };

    const task = manager.createTask(options);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[agent-bridge/tasks] POST error:', error);

    // Handle max tasks limit error
    if (error instanceof Error && error.message.includes('Maximum task limit')) {
      return NextResponse.json(
        { error: 'Task limit reached', message: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
