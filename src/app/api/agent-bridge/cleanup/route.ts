/**
 * Agent Bridge Cleanup API
 *
 * Provides endpoints for manual cleanup operations.
 *
 * POST /api/agent-bridge/cleanup - Trigger manual cleanup of expired tasks
 */

import { NextResponse } from 'next/server';
import { getTaskMemoryManager } from '@/lib/agent-bridge';

/**
 * POST /api/agent-bridge/cleanup
 *
 * Triggers a manual cleanup of expired tasks.
 *
 * Returns cleanup result including:
 * - Number of tasks removed
 * - IDs of removed tasks
 * - Estimated memory freed
 * - Cleanup duration
 */
export async function POST() {
  try {
    const manager = getTaskMemoryManager();
    const result = manager.cleanup();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[agent-bridge/cleanup] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
