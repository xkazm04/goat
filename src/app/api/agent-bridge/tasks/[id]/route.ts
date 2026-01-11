/**
 * Agent Bridge Task API - Individual Task Operations
 *
 * Provides REST endpoints for individual task management.
 *
 * GET /api/agent-bridge/tasks/[id] - Get task details
 * PATCH /api/agent-bridge/tasks/[id] - Update task (start, progress, complete, fail, cancel)
 * DELETE /api/agent-bridge/tasks/[id] - Delete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskMemoryManager, TaskError } from '@/lib/agent-bridge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agent-bridge/tasks/[id]
 *
 * Query parameters:
 * - includeOutput: boolean (default: true) - Include task output in response
 * - chunkPage: number - If output is chunked, get specific chunk page
 * - chunkPageSize: number - Chunk page size (default: 10)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const { searchParams } = new URL(request.url);
    const manager = getTaskMemoryManager();

    const task = manager.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', message: `Task with ID '${taskId}' does not exist or has expired` },
        { status: 404 }
      );
    }

    const includeOutput = searchParams.get('includeOutput') !== 'false';
    const chunkPage = searchParams.get('chunkPage');
    const chunkPageSize = searchParams.get('chunkPageSize');

    // Handle chunked output pagination
    if (task.outputChunks && chunkPage) {
      const chunks = manager.getOutputChunks(taskId, {
        page: parseInt(chunkPage, 10) || 1,
        pageSize: parseInt(chunkPageSize || '10', 10),
      });

      return NextResponse.json({
        ...task,
        output: undefined, // Don't include raw output
        outputChunks: chunks,
      });
    }

    // Return full task or without output
    if (!includeOutput) {
      const { output, outputChunks, ...metadata } = task;
      return NextResponse.json(metadata);
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('[agent-bridge/tasks/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent-bridge/tasks/[id]
 *
 * Request body:
 * - action: 'start' | 'progress' | 'complete' | 'fail' | 'cancel'
 * - progress?: number (for 'progress' action, 0-100)
 * - progressMessage?: string (for 'progress' action)
 * - output?: unknown (for 'complete' action)
 * - error?: TaskError (for 'fail' action)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const manager = getTaskMemoryManager();

    // Validate action
    const validActions = ['start', 'progress', 'complete', 'fail', 'cancel'];
    if (!body.action || !validActions.includes(body.action)) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: `Action must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let success = false;

    switch (body.action) {
      case 'start':
        success = manager.startTask(taskId);
        break;

      case 'progress':
        if (typeof body.progress !== 'number') {
          return NextResponse.json(
            { error: 'Validation error', message: 'Progress must be a number (0-100)' },
            { status: 400 }
          );
        }
        success = manager.updateProgress(taskId, body.progress, body.progressMessage);
        break;

      case 'complete':
        if (body.output === undefined) {
          return NextResponse.json(
            { error: 'Validation error', message: 'Output is required for complete action' },
            { status: 400 }
          );
        }
        success = manager.completeTask(taskId, body.output);
        break;

      case 'fail':
        if (!body.error || !body.error.code || !body.error.message) {
          return NextResponse.json(
            { error: 'Validation error', message: 'Error object with code and message is required' },
            { status: 400 }
          );
        }
        const taskError: TaskError = {
          code: body.error.code,
          message: body.error.message,
          stack: body.error.stack,
          details: body.error.details,
        };
        success = manager.failTask(taskId, taskError);
        break;

      case 'cancel':
        success = manager.cancelTask(taskId);
        break;
    }

    if (!success) {
      return NextResponse.json(
        {
          error: 'Action failed',
          message: `Could not ${body.action} task. Task may not exist, be expired, or be in an invalid state.`,
        },
        { status: 409 }
      );
    }

    // Return updated task
    const updatedTask = manager.getTask(taskId);
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('[agent-bridge/tasks/[id]] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-bridge/tasks/[id]
 *
 * Force delete a task regardless of expiration status.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const manager = getTaskMemoryManager();

    const success = manager.deleteTask(taskId);

    if (!success) {
      return NextResponse.json(
        { error: 'Task not found', message: `Task with ID '${taskId}' does not exist` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('[agent-bridge/tasks/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
