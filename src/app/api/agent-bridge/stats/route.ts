/**
 * Agent Bridge Stats API
 *
 * Provides endpoints for task memory statistics.
 *
 * GET /api/agent-bridge/stats - Get current memory statistics
 */

import { NextResponse } from 'next/server';
import { getTaskMemoryManager } from '@/lib/agent-bridge';

/**
 * GET /api/agent-bridge/stats
 *
 * Returns current task memory statistics including:
 * - Total tasks in memory
 * - Tasks by status
 * - Tasks by priority
 * - Estimated memory usage
 * - Cleanup information
 */
export async function GET() {
  try {
    const manager = getTaskMemoryManager();
    const stats = manager.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[agent-bridge/stats] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
