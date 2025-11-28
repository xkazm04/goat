import { useReducer, useCallback } from 'react';

// Error types that can occur in the application
export type ErrorType = 'NETWORK' | 'VALIDATION' | 'SERVER' | 'UNKNOWN';

// Loading state types - specific phases for different loading operations
export type LoadingStateType =
  | 'IDLE'
  | 'LOADING_LIST'
  | 'LOADING_FETCH'
  | 'LOADING_BACKLOG'
  | 'SUCCESS'
  | 'ERROR';

// Error metadata with recovery support
export interface ErrorMetadata {
  errorType: ErrorType;
  message: string;
  recoveryAction?: () => void;
  timestamp: number;
  statusCode?: number;
  details?: string;
}

// Loading state union type with specific loading phases
export type LoadingState<T = unknown> =
  | { type: 'IDLE'; timestamp: number }
  | { type: 'LOADING_LIST'; timestamp: number; progress?: number }
  | { type: 'LOADING_FETCH'; timestamp: number; progress?: number }
  | { type: 'LOADING_BACKLOG'; timestamp: number; progress?: number }
  | { type: 'SUCCESS'; data?: T; timestamp: number }
  | ({ type: 'ERROR'; timestamp: number } & ErrorMetadata);

// Action types for state transitions - specific actions for each loading phase
export type LoadingAction<T = unknown> =
  | { type: 'START_LIST_LOAD'; payload?: { progress?: number } }
  | { type: 'START_FETCH_LOAD'; payload?: { progress?: number } }
  | { type: 'START_BACKLOG_LOAD'; payload?: { progress?: number } }
  | { type: 'SET_SUCCESS'; payload?: T }
  | { type: 'SET_NETWORK_ERROR'; payload: { message: string; recoveryAction?: () => void; details?: string } }
  | { type: 'SET_VALIDATION_ERROR'; payload: { message: string; recoveryAction?: () => void; statusCode?: number; details?: string } }
  | { type: 'SET_SERVER_ERROR'; payload: { message: string; recoveryAction?: () => void; statusCode?: number; details?: string } }
  | { type: 'SET_UNKNOWN_ERROR'; payload: { message: string; recoveryAction?: () => void; details?: string } }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'RESET' };

// Helper functions for state transition conditions
const canTransitionToListLoad = (state: LoadingState): boolean =>
  state.type === 'IDLE' || state.type === 'SUCCESS' || state.type === 'ERROR';

const canTransitionToFetchLoad = (state: LoadingState): boolean =>
  state.type === 'IDLE' || state.type === 'SUCCESS' || state.type === 'LOADING_LIST' || state.type === 'ERROR';

const canTransitionToBacklogLoad = (state: LoadingState): boolean =>
  state.type === 'LOADING_FETCH' || state.type === 'SUCCESS' || state.type === 'IDLE' || state.type === 'ERROR';

const isInLoadingState = (state: LoadingState): boolean =>
  state.type === 'LOADING_LIST' || state.type === 'LOADING_FETCH' || state.type === 'LOADING_BACKLOG';

// Reducer function for state machine with explicit state transition logic
function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'START_LIST_LOAD':
      // Can transition to LOADING_LIST from IDLE or SUCCESS
      if (canTransitionToListLoad(state)) {
        return {
          type: 'LOADING_LIST',
          timestamp: Date.now(),
          progress: action.payload?.progress ?? 0
        };
      }
      return state;

    case 'START_FETCH_LOAD':
      // Can transition to LOADING_FETCH from IDLE, SUCCESS, or LOADING_LIST
      if (canTransitionToFetchLoad(state)) {
        return {
          type: 'LOADING_FETCH',
          timestamp: Date.now(),
          progress: action.payload?.progress ?? 0
        };
      }
      return state;

    case 'START_BACKLOG_LOAD':
      // Can transition to LOADING_BACKLOG from LOADING_FETCH or SUCCESS
      if (canTransitionToBacklogLoad(state)) {
        return {
          type: 'LOADING_BACKLOG',
          timestamp: Date.now(),
          progress: action.payload?.progress ?? 0
        };
      }
      return state;

    case 'SET_SUCCESS':
      // Can only transition to SUCCESS from any LOADING state
      if (isInLoadingState(state)) {
        return {
          type: 'SUCCESS',
          data: action.payload,
          timestamp: Date.now()
        };
      }
      return state;

    case 'SET_NETWORK_ERROR':
      // Can only transition to ERROR from any LOADING state
      if (isInLoadingState(state)) {
        return {
          type: 'ERROR',
          errorType: 'NETWORK',
          message: action.payload.message,
          recoveryAction: action.payload.recoveryAction,
          details: action.payload.details,
          timestamp: Date.now()
        };
      }
      return state;

    case 'SET_VALIDATION_ERROR':
      // Can only transition to ERROR from any LOADING state
      if (isInLoadingState(state)) {
        return {
          type: 'ERROR',
          errorType: 'VALIDATION',
          message: action.payload.message,
          recoveryAction: action.payload.recoveryAction,
          statusCode: action.payload.statusCode,
          details: action.payload.details,
          timestamp: Date.now()
        };
      }
      return state;

    case 'SET_SERVER_ERROR':
      // Can only transition to ERROR from any LOADING state
      if (isInLoadingState(state)) {
        return {
          type: 'ERROR',
          errorType: 'SERVER',
          message: action.payload.message,
          recoveryAction: action.payload.recoveryAction,
          statusCode: action.payload.statusCode,
          details: action.payload.details,
          timestamp: Date.now()
        };
      }
      return state;

    case 'SET_UNKNOWN_ERROR':
      // Can only transition to ERROR from any LOADING state
      if (isInLoadingState(state)) {
        return {
          type: 'ERROR',
          errorType: 'UNKNOWN',
          message: action.payload.message,
          recoveryAction: action.payload.recoveryAction,
          details: action.payload.details,
          timestamp: Date.now()
        };
      }
      return state;

    case 'UPDATE_PROGRESS':
      // Can only update progress in a LOADING state
      if (state.type === 'LOADING_LIST') {
        return { ...state, progress: action.payload };
      }
      if (state.type === 'LOADING_FETCH') {
        return { ...state, progress: action.payload };
      }
      if (state.type === 'LOADING_BACKLOG') {
        return { ...state, progress: action.payload };
      }
      return state;

    case 'RESET':
      return { type: 'IDLE', timestamp: Date.now() };

    default:
      return state;
  }
}

// Hook interface for better TypeScript support
export interface UseLoadingStateMachineReturn<T = unknown> {
  state: LoadingState<T>;
  startListLoad: (progress?: number) => void;
  startFetchLoad: (progress?: number) => void;
  startBacklogLoad: (progress?: number) => void;
  setSuccess: (data?: T) => void;
  setNetworkError: (message: string, recoveryAction?: () => void, details?: string) => void;
  setValidationError: (message: string, recoveryAction?: () => void, statusCode?: number, details?: string) => void;
  setServerError: (message: string, recoveryAction?: () => void, statusCode?: number, details?: string) => void;
  setUnknownError: (message: string, recoveryAction?: () => void, details?: string) => void;
  updateProgress: (progress: number) => void;
  reset: () => void;
  isLoading: boolean;
  isLoadingList: boolean;
  isLoadingFetch: boolean;
  isLoadingBacklog: boolean;
  isError: boolean;
  isSuccess: boolean;
  isIdle: boolean;
}

// Debug mode flag - set to true for development logging
const DEBUG_STATE_TRANSITIONS = process.env.NODE_ENV === 'development';

// Main hook export
export function useLoadingStateMachine<T = unknown>(initialState?: LoadingState<T>, debugMode?: boolean): UseLoadingStateMachineReturn<T> {
  const defaultState: LoadingState<T> = { type: 'IDLE', timestamp: Date.now() };
  const [state, dispatch] = useReducer(
    loadingReducer as (state: LoadingState<T>, action: LoadingAction<T>) => LoadingState<T>,
    initialState ?? defaultState
  );

  const shouldDebug = debugMode ?? DEBUG_STATE_TRANSITIONS;

  // Debug logger for state transitions
  const logTransition = useCallback((from: LoadingStateType, to: LoadingStateType, action: string) => {
    if (shouldDebug) {
      console.log(
        `%c🔄 STATE TRANSITION %c${from} → ${to}%c (${action})`,
        'color: #6366f1; font-weight: bold',
        'color: #10b981; font-weight: bold',
        'color: #64748b',
      );
    }
  }, [shouldDebug]);

  // Action creators - specific for each loading phase with debug logging
  const startListLoad = useCallback((progress?: number) => {
    logTransition(state.type, 'LOADING_LIST', 'START_LIST_LOAD');
    dispatch({ type: 'START_LIST_LOAD', payload: { progress } });
  }, [logTransition, state.type]);

  const startFetchLoad = useCallback((progress?: number) => {
    logTransition(state.type, 'LOADING_FETCH', 'START_FETCH_LOAD');
    dispatch({ type: 'START_FETCH_LOAD', payload: { progress } });
  }, [logTransition, state.type]);

  const startBacklogLoad = useCallback((progress?: number) => {
    logTransition(state.type, 'LOADING_BACKLOG', 'START_BACKLOG_LOAD');
    dispatch({ type: 'START_BACKLOG_LOAD', payload: { progress } });
  }, [logTransition, state.type]);

  const setSuccess = useCallback((data?: T) => {
    logTransition(state.type, 'SUCCESS', 'SET_SUCCESS');
    dispatch({ type: 'SET_SUCCESS', payload: data });
  }, [logTransition, state.type]);

  const setNetworkError = useCallback((message: string, recoveryAction?: () => void, details?: string) => {
    logTransition(state.type, 'ERROR', 'SET_NETWORK_ERROR');
    if (shouldDebug) {
      console.error('❌ NETWORK ERROR:', message, details);
    }
    dispatch({
      type: 'SET_NETWORK_ERROR',
      payload: { message, recoveryAction, details }
    });
  }, [logTransition, state.type, shouldDebug]);

  const setValidationError = useCallback((
    message: string,
    recoveryAction?: () => void,
    statusCode?: number,
    details?: string
  ) => {
    logTransition(state.type, 'ERROR', 'SET_VALIDATION_ERROR');
    if (shouldDebug) {
      console.error(`❌ VALIDATION ERROR (${statusCode}):`, message, details);
    }
    dispatch({
      type: 'SET_VALIDATION_ERROR',
      payload: { message, recoveryAction, statusCode, details }
    });
  }, [logTransition, state.type, shouldDebug]);

  const setServerError = useCallback((
    message: string,
    recoveryAction?: () => void,
    statusCode?: number,
    details?: string
  ) => {
    logTransition(state.type, 'ERROR', 'SET_SERVER_ERROR');
    if (shouldDebug) {
      console.error(`❌ SERVER ERROR (${statusCode}):`, message, details);
    }
    dispatch({
      type: 'SET_SERVER_ERROR',
      payload: { message, recoveryAction, statusCode, details }
    });
  }, [logTransition, state.type, shouldDebug]);

  const setUnknownError = useCallback((message: string, recoveryAction?: () => void, details?: string) => {
    logTransition(state.type, 'ERROR', 'SET_UNKNOWN_ERROR');
    if (shouldDebug) {
      console.error('❌ UNKNOWN ERROR:', message, details);
    }
    dispatch({
      type: 'SET_UNKNOWN_ERROR',
      payload: { message, recoveryAction, details }
    });
  }, [logTransition, state.type, shouldDebug]);

  const updateProgress = useCallback((progress: number) => {
    if (shouldDebug) {
      console.log(`📊 Progress Update: ${progress}%`);
    }
    dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
  }, [shouldDebug]);

  const reset = useCallback(() => {
    logTransition(state.type, 'IDLE', 'RESET');
    dispatch({ type: 'RESET' });
  }, [logTransition, state.type]);

  // Computed state helpers
  const isLoading = state.type === 'LOADING_LIST' || state.type === 'LOADING_FETCH' || state.type === 'LOADING_BACKLOG';
  const isLoadingList = state.type === 'LOADING_LIST';
  const isLoadingFetch = state.type === 'LOADING_FETCH';
  const isLoadingBacklog = state.type === 'LOADING_BACKLOG';
  const isError = state.type === 'ERROR';
  const isSuccess = state.type === 'SUCCESS';
  const isIdle = state.type === 'IDLE';

  return {
    state,
    startListLoad,
    startFetchLoad,
    startBacklogLoad,
    setSuccess,
    setNetworkError,
    setValidationError,
    setServerError,
    setUnknownError,
    updateProgress,
    reset,
    isLoading,
    isLoadingList,
    isLoadingFetch,
    isLoadingBacklog,
    isError,
    isSuccess,
    isIdle
  };
}

// HTTP Error structure for categorization
interface HttpError {
  name?: string;
  message?: string;
  response?: {
    status?: number;
    statusText?: string;
    data?: {
      detail?: string;
    };
  };
  status?: number;
  statusText?: string;
  detail?: string;
}

// Utility function to categorize HTTP errors
export function categorizeHttpError(error: HttpError): {
  errorType: ErrorType;
  statusCode?: number;
  message: string;
  details?: string;
} {
  // Network/timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return {
      errorType: 'NETWORK',
      message: 'Network request timed out. Please check your connection.',
      details: error.message
    };
  }

  if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
    return {
      errorType: 'NETWORK',
      message: 'Unable to connect to the server. Please check your internet connection.',
      details: error.message
    };
  }

  // HTTP status code errors
  if (error.response?.status || error.status) {
    const statusCode = error.response?.status ?? error.status ?? 0;
    const statusMessage = error.response?.statusText ?? error.statusText ?? '';
    const details = error.response?.data?.detail ?? error.detail ?? error.message;

    // Validation errors (4xx)
    if (statusCode >= 400 && statusCode < 500) {
      const validationMessages: Record<number, string> = {
        400: 'Invalid request. Please check your input.',
        401: 'Authentication required. Please sign in.',
        403: 'You do not have permission to access this resource.',
        404: 'The requested resource was not found.',
        409: 'A conflict occurred. The resource may have been modified.',
        422: 'Validation failed. Please check your input.',
        429: 'Too many requests. Please try again later.'
      };

      return {
        errorType: 'VALIDATION',
        statusCode,
        message: validationMessages[statusCode] ?? `Request error (${statusCode}): ${statusMessage}`,
        details
      };
    }

    // Server errors (5xx)
    if (statusCode >= 500) {
      const serverMessages: Record<number, string> = {
        500: 'Internal server error. Please try again later.',
        502: 'Bad gateway. The server is temporarily unavailable.',
        503: 'Service unavailable. Please try again later.',
        504: 'Gateway timeout. The server took too long to respond.'
      };

      return {
        errorType: 'SERVER',
        statusCode,
        message: serverMessages[statusCode] ?? `Server error (${statusCode}): ${statusMessage}`,
        details
      };
    }
  }

  // Unknown errors
  return {
    errorType: 'UNKNOWN',
    message: error.message ?? 'An unexpected error occurred. Please try again.',
    details: JSON.stringify(error, null, 2)
  };
}

// Utility function to create a recovery action with retry logic
export function createRetryRecoveryAction(
  originalAction: () => Promise<void>,
  onRetry?: () => void
): () => void {
  return () => {
    if (onRetry) {
      onRetry();
    }
    originalAction();
  };
}

// Type guard functions for cleaner conditional rendering
export function isLoadingState(state: LoadingState): state is { type: 'LOADING_LIST' | 'LOADING_FETCH' | 'LOADING_BACKLOG'; timestamp: number; progress?: number } {
  return state.type === 'LOADING_LIST' || state.type === 'LOADING_FETCH' || state.type === 'LOADING_BACKLOG';
}

export function isErrorState(state: LoadingState): state is LoadingState & { type: 'ERROR' } & ErrorMetadata {
  return state.type === 'ERROR';
}

export function isSuccessState<T = unknown>(state: LoadingState<T>): state is { type: 'SUCCESS'; data?: T; timestamp: number } {
  return state.type === 'SUCCESS';
}

export function isIdleState(state: LoadingState): state is { type: 'IDLE'; timestamp: number } {
  return state.type === 'IDLE';
}
