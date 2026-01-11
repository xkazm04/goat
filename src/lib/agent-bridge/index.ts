/**
 * Agent Bridge - Task Memory Management System
 *
 * Provides infrastructure for managing task lifecycle with:
 * - TTL-based expiration policies (sliding and absolute)
 * - Automatic cleanup of stale task data
 * - Pagination support for large result sets
 * - Memory usage tracking and limits
 * - Event-driven lifecycle notifications
 *
 * @example
 * ```ts
 * import { getTaskMemoryManager, TaskStatus } from '@/lib/agent-bridge';
 *
 * const manager = getTaskMemoryManager();
 *
 * // Create a task
 * const task = manager.createTask({
 *   name: 'Process data',
 *   ttlMs: 5 * 60 * 1000, // 5 minutes
 *   expirationPolicy: 'sliding',
 * });
 *
 * // Start and complete
 * manager.startTask(task.id);
 * manager.updateProgress(task.id, 50, 'Processing...');
 * manager.completeTask(task.id, { result: 'done' });
 *
 * // Get with pagination
 * const tasks = manager.getTasks(
 *   { status: 'completed' },
 *   { page: 1, pageSize: 20 }
 * );
 * ```
 */

// Re-export types
export type {
  TaskStatus,
  TaskPriority,
  ExpirationPolicy,
  TaskMetadata,
  TaskOutputChunk,
  Task,
  TaskError,
  CreateTaskOptions,
  PaginationOptions,
  PaginatedResponse,
  TaskFilterOptions,
  TaskMemoryStats,
  CleanupResult,
  TaskEventType,
  TaskEvent,
  TaskEventListener,
  TaskManagerConfig,
} from './types';

export { DEFAULT_CONFIG } from './types';

// Re-export manager
export {
  TaskMemoryManager,
  getTaskMemoryManager,
  resetTaskMemoryManager,
} from './task-memory-manager';
