/**
 * Task Memory Manager
 *
 * Manages task lifecycle with TTL-based cleanup, expiration policies,
 * and pagination support for large result sets. Designed to prevent
 * memory leaks in long-running operations.
 */

import {
  Task,
  TaskStatus,
  TaskMetadata,
  TaskOutputChunk,
  TaskError,
  CreateTaskOptions,
  PaginationOptions,
  PaginatedResponse,
  TaskFilterOptions,
  TaskMemoryStats,
  CleanupResult,
  TaskEvent,
  TaskEventType,
  TaskEventListener,
  TaskManagerConfig,
  DEFAULT_CONFIG,
} from './types';

/** Generate a unique task ID */
const generateTaskId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `task_${timestamp}_${random}`;
};

/** Estimate size of an object in bytes */
const estimateSize = (obj: unknown): number => {
  try {
    const str = JSON.stringify(obj);
    return str ? str.length * 2 : 0; // UTF-16 encoding
  } catch {
    return 0;
  }
};

/**
 * TaskMemoryManager - Core class for managing task lifecycle
 *
 * Features:
 * - TTL-based expiration with sliding/absolute policies
 * - Automatic cleanup of expired tasks
 * - Pagination for large result sets
 * - Memory usage tracking and limits
 * - Event-driven lifecycle notifications
 */
export class TaskMemoryManager {
  private tasks: Map<string, Task> = new Map();
  private config: TaskManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private listeners: Set<TaskEventListener> = new Set();
  private stats: TaskMemoryStats;

  constructor(config: Partial<TaskManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.initializeStats();

    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  private initializeStats(): TaskMemoryStats {
    return {
      totalTasks: 0,
      byStatus: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        expired: 0,
      },
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        critical: 0,
      },
      estimatedMemoryBytes: 0,
      expiredPendingCleanup: 0,
      lastCleanupAt: null,
      cleanupCount: 0,
    };
  }

  /** Start automatic cleanup interval */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /** Stop automatic cleanup */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /** Emit an event to all listeners */
  private emit(type: TaskEventType, taskId?: string, data?: Record<string, unknown>): void {
    const event: TaskEvent = {
      type,
      taskId,
      timestamp: Date.now(),
      data,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[TaskMemoryManager] Event listener error:', error);
      }
    });
  }

  /** Subscribe to task events */
  subscribe(listener: TaskEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Create a new task */
  createTask<TOutput = unknown>(options: CreateTaskOptions): Task<TOutput> {
    // Check max tasks limit
    if (this.tasks.size >= this.config.maxTasks) {
      // Try cleanup first
      this.cleanup();

      if (this.tasks.size >= this.config.maxTasks) {
        throw new Error(`Maximum task limit reached (${this.config.maxTasks})`);
      }
    }

    const now = Date.now();
    const task: Task<TOutput> = {
      id: generateTaskId(),
      name: options.name,
      description: options.description,
      priority: options.priority ?? 'normal',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      ttlMs: options.ttlMs ?? this.config.defaultTtlMs,
      expirationPolicy: options.expirationPolicy ?? this.config.defaultExpirationPolicy,
      parentTaskId: options.parentTaskId,
      ownerId: options.ownerId,
      tags: options.tags ?? [],
    };

    this.tasks.set(task.id, task as Task);
    this.updateStats('add', task as Task);
    this.emit('task:created', task.id);

    return task;
  }

  /** Get a task by ID (updates access time for sliding TTL) */
  getTask<TOutput = unknown>(taskId: string): Task<TOutput> | null {
    const task = this.tasks.get(taskId) as Task<TOutput> | undefined;

    if (!task) {
      return null;
    }

    // Check if expired
    if (this.isExpired(task)) {
      return null;
    }

    // Update last accessed time for sliding TTL
    if (task.expirationPolicy === 'sliding') {
      task.lastAccessedAt = Date.now();
      task.updatedAt = Date.now();
    }

    this.emit('task:accessed', taskId);
    return task;
  }

  /** Check if a task is expired */
  isExpired(task: Task): boolean {
    if (task.expirationPolicy === 'never') {
      return false;
    }

    const now = Date.now();
    const referenceTime =
      task.expirationPolicy === 'sliding' ? task.lastAccessedAt : task.createdAt;

    return now - referenceTime > task.ttlMs;
  }

  /** Start a task */
  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const oldStatus = task.status;
    task.status = 'running';
    task.updatedAt = Date.now();
    task.lastAccessedAt = Date.now();

    this.updateStats('statusChange', task, oldStatus);
    this.emit('task:started', taskId);
    return true;
  }

  /** Update task progress */
  updateProgress(taskId: string, progress: number, message?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') {
      return false;
    }

    task.progress = Math.max(0, Math.min(100, progress));
    task.progressMessage = message;
    task.updatedAt = Date.now();
    task.lastAccessedAt = Date.now();

    this.emit('task:progress', taskId, { progress: task.progress, message });
    return true;
  }

  /** Complete a task with output */
  completeTask<TOutput = unknown>(taskId: string, output: TOutput): boolean {
    const task = this.tasks.get(taskId);
    if (!task || (task.status !== 'running' && task.status !== 'pending')) {
      return false;
    }

    const outputSize = estimateSize(output);

    // Check output size limit
    if (outputSize > this.config.maxOutputSizeBytes) {
      // Chunk the output for large results
      task.outputChunks = this.chunkOutput(output);
      task.outputSizeBytes = outputSize;
    } else {
      task.output = output;
      task.outputSizeBytes = outputSize;
    }

    const oldStatus = task.status;
    task.status = 'completed';
    task.completedAt = Date.now();
    task.updatedAt = Date.now();
    task.lastAccessedAt = Date.now();
    task.progress = 100;

    this.updateStats('statusChange', task, oldStatus);
    this.stats.estimatedMemoryBytes += outputSize;
    this.emit('task:completed', taskId, { outputSizeBytes: outputSize });
    return true;
  }

  /** Chunk output for large results */
  private chunkOutput(output: unknown): TaskOutputChunk[] {
    const chunks: TaskOutputChunk[] = [];
    const str = JSON.stringify(output);
    const chunkSize = this.config.maxChunkSizeBytes;

    for (let i = 0; i < str.length; i += chunkSize) {
      const chunkData = str.slice(i, i + chunkSize);
      chunks.push({
        index: chunks.length,
        data: chunkData,
        sizeBytes: chunkData.length * 2,
        createdAt: Date.now(),
      });
    }

    return chunks;
  }

  /** Get paginated output chunks */
  getOutputChunks(taskId: string, options: Partial<PaginationOptions> = {}): PaginatedResponse<TaskOutputChunk> | null {
    const task = this.getTask(taskId);
    if (!task || !task.outputChunks) {
      return null;
    }

    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? this.config.defaultPageSize, this.config.maxPageSize);
    const totalItems = task.outputChunks.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
      items: task.outputChunks.slice(startIndex, endIndex),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** Fail a task with error */
  failTask(taskId: string, error: TaskError): boolean {
    const task = this.tasks.get(taskId);
    if (!task || (task.status !== 'running' && task.status !== 'pending')) {
      return false;
    }

    const oldStatus = task.status;
    task.status = 'failed';
    task.error = error;
    task.updatedAt = Date.now();
    task.lastAccessedAt = Date.now();

    this.updateStats('statusChange', task, oldStatus);
    this.emit('task:failed', taskId, { error });
    return true;
  }

  /** Cancel a task */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || (task.status !== 'running' && task.status !== 'pending')) {
      return false;
    }

    const oldStatus = task.status;
    task.status = 'cancelled';
    task.updatedAt = Date.now();
    task.lastAccessedAt = Date.now();

    this.updateStats('statusChange', task, oldStatus);
    this.emit('task:cancelled', taskId);
    return true;
  }

  /** Get all tasks with filtering and pagination */
  getTasks(
    filter: TaskFilterOptions = {},
    pagination: Partial<PaginationOptions> = {}
  ): PaginatedResponse<TaskMetadata> {
    let filtered = Array.from(this.tasks.values());

    // Apply filters
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      filtered = filtered.filter((t) => statuses.includes(t.status));
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      filtered = filtered.filter((t) => priorities.includes(t.priority));
    }

    if (filter.ownerId) {
      filtered = filtered.filter((t) => t.ownerId === filter.ownerId);
    }

    if (filter.parentTaskId) {
      filtered = filtered.filter((t) => t.parentTaskId === filter.parentTaskId);
    }

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((t) => t.tags.some((tag) => filter.tags!.includes(tag)));
    }

    if (filter.createdAfter) {
      filtered = filtered.filter((t) => t.createdAt > filter.createdAfter!);
    }

    if (filter.createdBefore) {
      filtered = filtered.filter((t) => t.createdAt < filter.createdBefore!);
    }

    if (!filter.includeExpired) {
      filtered = filtered.filter((t) => !this.isExpired(t));
    }

    // Apply sorting
    const sortBy = pagination.sortBy ?? 'createdAt';
    const sortOrder = pagination.sortOrder ?? 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy] as number | string;
      const bVal = b[sortBy] as number | string;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const page = pagination.page ?? 1;
    const pageSize = Math.min(pagination.pageSize ?? this.config.defaultPageSize, this.config.maxPageSize);
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    // Return metadata only (exclude output to reduce memory in listings)
    const items: TaskMetadata[] = filtered.slice(startIndex, endIndex).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastAccessedAt: t.lastAccessedAt,
      completedAt: t.completedAt,
      ttlMs: t.ttlMs,
      expirationPolicy: t.expirationPolicy,
      parentTaskId: t.parentTaskId,
      ownerId: t.ownerId,
      tags: t.tags,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** Update internal statistics */
  private updateStats(action: 'add' | 'remove' | 'statusChange', task: Task, oldStatus?: TaskStatus): void {
    switch (action) {
      case 'add':
        this.stats.totalTasks++;
        this.stats.byStatus[task.status]++;
        this.stats.byPriority[task.priority]++;
        this.stats.estimatedMemoryBytes += estimateSize(task);
        break;

      case 'remove':
        this.stats.totalTasks--;
        this.stats.byStatus[task.status]--;
        this.stats.byPriority[task.priority]--;
        this.stats.estimatedMemoryBytes -= task.outputSizeBytes ?? estimateSize(task);
        break;

      case 'statusChange':
        if (oldStatus) {
          this.stats.byStatus[oldStatus]--;
        }
        this.stats.byStatus[task.status]++;
        break;
    }
  }

  /** Get memory statistics */
  getStats(): TaskMemoryStats {
    // Update expired count
    let expiredCount = 0;
    this.tasks.forEach((task) => {
      if (this.isExpired(task)) {
        expiredCount++;
      }
    });
    this.stats.expiredPendingCleanup = expiredCount;

    return { ...this.stats };
  }

  /** Clean up expired tasks */
  cleanup(): CleanupResult {
    const startTime = Date.now();
    const removedTaskIds: string[] = [];
    let freedMemoryBytes = 0;

    this.emit('cleanup:started');

    this.tasks.forEach((task, taskId) => {
      if (this.isExpired(task)) {
        // Mark as expired before removal
        const oldStatus = task.status;
        task.status = 'expired';
        this.updateStats('statusChange', task, oldStatus);
        this.emit('task:expired', taskId);

        // Calculate freed memory
        freedMemoryBytes += task.outputSizeBytes ?? estimateSize(task);

        // Remove task
        this.updateStats('remove', task);
        this.tasks.delete(taskId);
        removedTaskIds.push(taskId);
      }
    });

    const result: CleanupResult = {
      removedCount: removedTaskIds.length,
      removedTaskIds,
      freedMemoryBytes,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };

    this.stats.lastCleanupAt = result.timestamp;
    this.stats.cleanupCount++;

    this.emit('cleanup:completed', undefined, { result });

    return result;
  }

  /** Force cleanup of a specific task */
  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    this.updateStats('remove', task);
    this.tasks.delete(taskId);
    return true;
  }

  /** Clear all tasks */
  clear(): void {
    this.tasks.clear();
    this.stats = this.initializeStats();
  }

  /** Destroy the manager and cleanup resources */
  destroy(): void {
    this.stopAutoCleanup();
    this.listeners.clear();
    this.clear();
  }
}

// Singleton instance for server-side use
let globalManager: TaskMemoryManager | null = null;

/** Get or create the global task memory manager */
export const getTaskMemoryManager = (config?: Partial<TaskManagerConfig>): TaskMemoryManager => {
  if (!globalManager) {
    globalManager = new TaskMemoryManager(config);
  }
  return globalManager;
};

/** Reset the global manager (for testing) */
export const resetTaskMemoryManager = (): void => {
  if (globalManager) {
    globalManager.destroy();
    globalManager = null;
  }
};
