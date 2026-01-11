/**
 * Agent Bridge Types
 *
 * Core type definitions for the task memory management system.
 * Provides TTL-based cleanup, expiration policies, and pagination support.
 */

/** Task execution status */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

/** Task priority levels */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

/** Expiration policy types */
export type ExpirationPolicy =
  | 'sliding'    // TTL resets on each access
  | 'absolute'   // TTL is fixed from creation time
  | 'never';     // Task never expires (use with caution)

/** Task metadata for tracking lifecycle */
export interface TaskMetadata {
  /** Unique task identifier */
  id: string;
  /** Human-readable task name */
  name: string;
  /** Task description */
  description?: string;
  /** Task priority */
  priority: TaskPriority;
  /** Current status */
  status: TaskStatus;
  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** Last accessed timestamp (for sliding TTL) */
  lastAccessedAt: number;
  /** Completion timestamp (if completed) */
  completedAt?: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Expiration policy */
  expirationPolicy: ExpirationPolicy;
  /** Parent task ID (for hierarchical tasks) */
  parentTaskId?: string;
  /** Associated user/session ID */
  ownerId?: string;
  /** Custom tags for filtering */
  tags: string[];
}

/** Task output chunk for large result sets */
export interface TaskOutputChunk {
  /** Chunk index (0-based) */
  index: number;
  /** Chunk data */
  data: unknown;
  /** Chunk size in bytes (estimated) */
  sizeBytes: number;
  /** Timestamp when chunk was created */
  createdAt: number;
}

/** Task with its output data */
export interface Task<TOutput = unknown> extends TaskMetadata {
  /** Task output (can be chunked for large results) */
  output?: TOutput;
  /** Output chunks for paginated access */
  outputChunks?: TaskOutputChunk[];
  /** Total output size in bytes */
  outputSizeBytes?: number;
  /** Error information (if failed) */
  error?: TaskError;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Progress message */
  progressMessage?: string;
}

/** Task error information */
export interface TaskError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Stack trace (only in development) */
  stack?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/** Task creation options */
export interface CreateTaskOptions {
  /** Task name */
  name: string;
  /** Task description */
  description?: string;
  /** Task priority (default: normal) */
  priority?: TaskPriority;
  /** TTL in milliseconds (default: 30 minutes) */
  ttlMs?: number;
  /** Expiration policy (default: sliding) */
  expirationPolicy?: ExpirationPolicy;
  /** Parent task ID */
  parentTaskId?: string;
  /** Owner ID */
  ownerId?: string;
  /** Custom tags */
  tags?: string[];
}

/** Pagination options for task output */
export interface PaginationOptions {
  /** Page number (1-based) */
  page: number;
  /** Items per page (default: 20, max: 100) */
  pageSize: number;
  /** Sort field */
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'priority' | 'status';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  /** Data items for current page */
  items: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page (1-based) */
    page: number;
    /** Items per page */
    pageSize: number;
    /** Total items across all pages */
    totalItems: number;
    /** Total pages */
    totalPages: number;
    /** Whether there's a next page */
    hasNextPage: boolean;
    /** Whether there's a previous page */
    hasPreviousPage: boolean;
  };
}

/** Task filter options */
export interface TaskFilterOptions {
  /** Filter by status */
  status?: TaskStatus | TaskStatus[];
  /** Filter by priority */
  priority?: TaskPriority | TaskPriority[];
  /** Filter by owner ID */
  ownerId?: string;
  /** Filter by parent task ID */
  parentTaskId?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by creation time range */
  createdAfter?: number;
  createdBefore?: number;
  /** Include expired tasks */
  includeExpired?: boolean;
}

/** Task memory statistics */
export interface TaskMemoryStats {
  /** Total number of tasks in memory */
  totalTasks: number;
  /** Tasks by status */
  byStatus: Record<TaskStatus, number>;
  /** Tasks by priority */
  byPriority: Record<TaskPriority, number>;
  /** Total memory usage estimate (bytes) */
  estimatedMemoryBytes: number;
  /** Number of expired tasks pending cleanup */
  expiredPendingCleanup: number;
  /** Last cleanup timestamp */
  lastCleanupAt: number | null;
  /** Number of cleanups performed */
  cleanupCount: number;
}

/** Cleanup result */
export interface CleanupResult {
  /** Number of tasks removed */
  removedCount: number;
  /** IDs of removed tasks */
  removedTaskIds: string[];
  /** Memory freed (estimated bytes) */
  freedMemoryBytes: number;
  /** Cleanup duration in milliseconds */
  durationMs: number;
  /** Timestamp of cleanup */
  timestamp: number;
}

/** Task lifecycle event types */
export type TaskEventType =
  | 'task:created'
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled'
  | 'task:expired'
  | 'task:accessed'
  | 'cleanup:started'
  | 'cleanup:completed';

/** Task lifecycle event */
export interface TaskEvent {
  /** Event type */
  type: TaskEventType;
  /** Task ID (if applicable) */
  taskId?: string;
  /** Event timestamp */
  timestamp: number;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/** Event listener callback */
export type TaskEventListener = (event: TaskEvent) => void;

/** Task manager configuration */
export interface TaskManagerConfig {
  /** Default TTL in milliseconds (default: 30 minutes) */
  defaultTtlMs: number;
  /** Default expiration policy */
  defaultExpirationPolicy: ExpirationPolicy;
  /** Maximum tasks in memory (default: 1000) */
  maxTasks: number;
  /** Maximum output size per task in bytes (default: 10MB) */
  maxOutputSizeBytes: number;
  /** Cleanup interval in milliseconds (default: 1 minute) */
  cleanupIntervalMs: number;
  /** Enable automatic cleanup (default: true) */
  autoCleanup: boolean;
  /** Maximum chunk size for pagination (bytes) */
  maxChunkSizeBytes: number;
  /** Default page size for pagination */
  defaultPageSize: number;
  /** Maximum page size for pagination */
  maxPageSize: number;
}

/** Default configuration values */
export const DEFAULT_CONFIG: TaskManagerConfig = {
  defaultTtlMs: 30 * 60 * 1000, // 30 minutes
  defaultExpirationPolicy: 'sliding',
  maxTasks: 1000,
  maxOutputSizeBytes: 10 * 1024 * 1024, // 10MB
  cleanupIntervalMs: 60 * 1000, // 1 minute
  autoCleanup: true,
  maxChunkSizeBytes: 1024 * 1024, // 1MB per chunk
  defaultPageSize: 20,
  maxPageSize: 100,
};
