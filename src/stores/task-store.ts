/**
 * Task Store
 *
 * Client-side Zustand store for managing task lifecycle and interactions
 * with the agent-bridge API. Provides real-time task tracking with
 * automatic refresh and pagination support.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  Task,
  TaskMetadata,
  TaskStatus,
  TaskPriority,
  TaskMemoryStats,
  PaginatedResponse,
  CreateTaskOptions,
  TaskFilterOptions,
  PaginationOptions,
  CleanupResult,
} from '@/lib/agent-bridge';

/** API response for task operations */
interface TaskApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/** Task store state */
interface TaskStoreState {
  // Data
  tasks: TaskMetadata[];
  currentTask: Task | null;
  stats: TaskMemoryStats | null;
  pagination: PaginatedResponse<TaskMetadata>['pagination'] | null;

  // UI state
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Filters
  currentFilter: TaskFilterOptions;
  currentPagination: Partial<PaginationOptions>;

  // Polling
  isPolling: boolean;
  pollingInterval: number;

  // Actions
  fetchTasks: (filter?: TaskFilterOptions, pagination?: Partial<PaginationOptions>) => Promise<void>;
  fetchTask: (taskId: string) => Promise<Task | null>;
  createTask: (options: CreateTaskOptions) => Promise<Task | null>;
  startTask: (taskId: string) => Promise<boolean>;
  updateProgress: (taskId: string, progress: number, message?: string) => Promise<boolean>;
  completeTask: (taskId: string, output: unknown) => Promise<boolean>;
  failTask: (taskId: string, error: { code: string; message: string }) => Promise<boolean>;
  cancelTask: (taskId: string) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  triggerCleanup: () => Promise<CleanupResult | null>;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;

  // Filters
  setFilter: (filter: TaskFilterOptions) => void;
  clearFilter: () => void;

  // Polling
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;

  // Utils
  clearError: () => void;
  reset: () => void;
}

/** API base URL */
const API_BASE = '/api/agent-bridge';

/** Default pagination */
const DEFAULT_PAGINATION: Partial<PaginationOptions> = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

let pollingIntervalId: NodeJS.Timeout | null = null;

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  // Initial state
  tasks: [],
  currentTask: null,
  stats: null,
  pagination: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  currentFilter: {},
  currentPagination: DEFAULT_PAGINATION,
  isPolling: false,
  pollingInterval: 5000,

  // Fetch tasks with optional filtering and pagination
  fetchTasks: async (filter, pagination) => {
    const state = get();
    const isRefresh = state.tasks.length > 0;

    set({ [isRefresh ? 'isRefreshing' : 'isLoading']: true, error: null });

    try {
      const mergedFilter = { ...state.currentFilter, ...filter };
      const mergedPagination = { ...state.currentPagination, ...pagination };

      const params = new URLSearchParams();

      // Add pagination params
      if (mergedPagination.page) params.set('page', String(mergedPagination.page));
      if (mergedPagination.pageSize) params.set('pageSize', String(mergedPagination.pageSize));
      if (mergedPagination.sortBy) params.set('sortBy', mergedPagination.sortBy);
      if (mergedPagination.sortOrder) params.set('sortOrder', mergedPagination.sortOrder);

      // Add filter params
      if (mergedFilter.status) {
        const statuses = Array.isArray(mergedFilter.status) ? mergedFilter.status : [mergedFilter.status];
        params.set('status', statuses.join(','));
      }
      if (mergedFilter.priority) {
        const priorities = Array.isArray(mergedFilter.priority) ? mergedFilter.priority : [mergedFilter.priority];
        params.set('priority', priorities.join(','));
      }
      if (mergedFilter.ownerId) params.set('ownerId', mergedFilter.ownerId);
      if (mergedFilter.parentTaskId) params.set('parentTaskId', mergedFilter.parentTaskId);
      if (mergedFilter.tags) params.set('tags', mergedFilter.tags.join(','));
      if (mergedFilter.includeExpired) params.set('includeExpired', 'true');

      const response = await fetch(`${API_BASE}/tasks?${params.toString()}`);
      const data: PaginatedResponse<TaskMetadata> = await response.json();

      if (!response.ok) {
        throw new Error((data as unknown as TaskApiResponse<never>).message || 'Failed to fetch tasks');
      }

      set({
        tasks: data.items,
        pagination: data.pagination,
        currentFilter: mergedFilter,
        currentPagination: mergedPagination,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
        isRefreshing: false,
      });
    }
  },

  // Fetch single task
  fetchTask: async (taskId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch task');
      }

      set({ currentTask: data, isLoading: false });
      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch task',
        isLoading: false,
      });
      return null;
    }
  },

  // Create new task
  createTask: async (options) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create task');
      }

      // Refresh tasks list
      get().fetchTasks();
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
        isLoading: false,
      });
      return null;
    }
  },

  // Start task
  startTask: async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to start task');
      }

      get().fetchTasks();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start task' });
      return false;
    }
  },

  // Update progress
  updateProgress: async (taskId, progress, message) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'progress', progress, progressMessage: message }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update progress');
      }

      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update progress' });
      return false;
    }
  },

  // Complete task
  completeTask: async (taskId, output) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', output }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to complete task');
      }

      get().fetchTasks();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to complete task' });
      return false;
    }
  },

  // Fail task
  failTask: async (taskId, error) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fail', error }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fail task');
      }

      get().fetchTasks();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fail task' });
      return false;
    }
  },

  // Cancel task
  cancelTask: async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel task');
      }

      get().fetchTasks();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel task' });
      return false;
    }
  },

  // Delete task
  deleteTask: async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete task');
      }

      get().fetchTasks();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete task' });
      return false;
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch stats');
      }

      set({ stats: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch stats' });
    }
  },

  // Trigger cleanup
  triggerCleanup: async () => {
    try {
      const response = await fetch(`${API_BASE}/cleanup`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to trigger cleanup');
      }

      // Refresh tasks and stats
      get().fetchTasks();
      get().fetchStats();

      return data.result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to trigger cleanup' });
      return null;
    }
  },

  // Pagination actions
  setPage: (page) => {
    const state = get();
    set({ currentPagination: { ...state.currentPagination, page } });
    get().fetchTasks();
  },

  setPageSize: (pageSize) => {
    const state = get();
    set({ currentPagination: { ...state.currentPagination, pageSize, page: 1 } });
    get().fetchTasks();
  },

  nextPage: () => {
    const state = get();
    if (state.pagination?.hasNextPage) {
      const nextPage = (state.currentPagination.page || 1) + 1;
      set({ currentPagination: { ...state.currentPagination, page: nextPage } });
      get().fetchTasks();
    }
  },

  previousPage: () => {
    const state = get();
    if (state.pagination?.hasPreviousPage) {
      const prevPage = Math.max(1, (state.currentPagination.page || 1) - 1);
      set({ currentPagination: { ...state.currentPagination, page: prevPage } });
      get().fetchTasks();
    }
  },

  // Filter actions
  setFilter: (filter) => {
    set({ currentFilter: filter, currentPagination: { ...get().currentPagination, page: 1 } });
    get().fetchTasks();
  },

  clearFilter: () => {
    set({ currentFilter: {}, currentPagination: { ...get().currentPagination, page: 1 } });
    get().fetchTasks();
  },

  // Polling actions
  startPolling: (intervalMs) => {
    const state = get();
    if (state.isPolling || pollingIntervalId) return;

    const interval = intervalMs ?? state.pollingInterval;
    set({ isPolling: true, pollingInterval: interval });

    // Initial fetch
    get().fetchTasks();
    get().fetchStats();

    // Set up polling
    pollingIntervalId = setInterval(() => {
      get().fetchTasks();
      get().fetchStats();
    }, interval);
  },

  stopPolling: () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    set({ isPolling: false });
  },

  // Utils
  clearError: () => set({ error: null }),

  reset: () => {
    get().stopPolling();
    set({
      tasks: [],
      currentTask: null,
      stats: null,
      pagination: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      currentFilter: {},
      currentPagination: DEFAULT_PAGINATION,
    });
  },
}));

// Selector hooks for optimized re-renders
export const useTasks = () => useTaskStore((state) => state.tasks);
export const useCurrentTask = () => useTaskStore((state) => state.currentTask);
export const useTaskStats = () => useTaskStore((state) => state.stats);
export const useTaskPagination = () => useTaskStore((state) => state.pagination);
export const useTaskLoading = () => useTaskStore((state) => state.isLoading);
export const useTaskError = () => useTaskStore((state) => state.error);

export const useTaskActions = () =>
  useTaskStore(
    useShallow((state) => ({
      fetchTasks: state.fetchTasks,
      fetchTask: state.fetchTask,
      createTask: state.createTask,
      startTask: state.startTask,
      updateProgress: state.updateProgress,
      completeTask: state.completeTask,
      failTask: state.failTask,
      cancelTask: state.cancelTask,
      deleteTask: state.deleteTask,
      fetchStats: state.fetchStats,
      triggerCleanup: state.triggerCleanup,
    }))
  );

export const useTaskPaginationActions = () =>
  useTaskStore(
    useShallow((state) => ({
      setPage: state.setPage,
      setPageSize: state.setPageSize,
      nextPage: state.nextPage,
      previousPage: state.previousPage,
    }))
  );

export const useTaskFilterActions = () =>
  useTaskStore(
    useShallow((state) => ({
      setFilter: state.setFilter,
      clearFilter: state.clearFilter,
      currentFilter: state.currentFilter,
    }))
  );

export const useTaskPolling = () =>
  useTaskStore(
    useShallow((state) => ({
      isPolling: state.isPolling,
      startPolling: state.startPolling,
      stopPolling: state.stopPolling,
    }))
  );
