'use client';

import React, { Component, ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Home, Copy, ChevronDown, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoatError, fromUnknown, isGoatError } from './GoatError';
import type { ErrorCode, ErrorSeverity } from './types';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component when error occurs */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** Called when error is caught */
  onError?: (error: GoatError, errorInfo: React.ErrorInfo) => void;
  /** Reset keys - boundary resets when any key changes */
  resetKeys?: unknown[];
  /** Feature/component name for logging */
  name?: string;
  /** Show simplified error for users */
  simplified?: boolean;
}

interface ErrorBoundaryState {
  error: GoatError | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorFallbackProps {
  error: GoatError;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

/**
 * React Error Boundary with GoatError integration
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI with error details and recovery options.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const goatError = isGoatError(error) ? error : fromUnknown(error);
    return { error: goatError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const goatError = isGoatError(error) ? error : fromUnknown(error);

    this.setState({ errorInfo });

    // Log error
    console.error(
      `🚨 ErrorBoundary [${this.props.name || 'unknown'}]:`,
      goatError.toJSON(true)
    );

    // Call optional error handler
    this.props.onError?.(goatError, errorInfo);

    // Track error for analytics
    this.trackError(goatError, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error when resetKeys change
    if (this.state.error && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevKeys[index]
      );
      if (hasKeyChanged) {
        this.resetError();
      }
    }
  }

  trackError(error: GoatError, errorInfo: React.ErrorInfo): void {
    // Error analytics tracking
    // This would integrate with your analytics service
    if (typeof window !== 'undefined' && (window as any).__GOAT_ERROR_TRACKER__) {
      (window as any).__GOAT_ERROR_TRACKER__({
        type: 'react_error',
        code: error.code,
        traceId: error.traceId,
        componentStack: errorInfo.componentStack,
        name: this.props.name,
        timestamp: new Date().toISOString(),
      });
    }
  }

  resetError = (): void => {
    this.setState({ error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { error, errorInfo } = this.state;
    const { children, fallback, simplified } = this.props;

    if (error) {
      // Custom fallback
      if (typeof fallback === 'function') {
        return fallback({ error, errorInfo, resetError: this.resetError });
      }
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <ErrorFallbackUI
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          simplified={simplified}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Default Error Fallback UI
// ============================================================================

interface ErrorFallbackUIProps extends ErrorFallbackProps {
  simplified?: boolean;
}

function ErrorFallbackUI({
  error,
  errorInfo,
  resetError,
  simplified = false,
}: ErrorFallbackUIProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const notification = error.toNotification();
  const isDev = process.env.NODE_ENV === 'development';

  const handleCopyError = async () => {
    const errorReport = [
      `Error Code: ${error.code}`,
      `Trace ID: ${error.traceId}`,
      `Message: ${error.message}`,
      `Timestamp: ${error.timestamp}`,
      '',
      isDev && error.stack ? `Stack:\n${error.stack}` : '',
      errorInfo?.componentStack ? `Component Stack:\n${errorInfo.componentStack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(errorReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy error details');
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  // Simplified view for production
  if (simplified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {notification.title}
        </h3>
        <p className="text-sm text-slate-400 mb-4 max-w-md">
          {notification.description}
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-slate-900/50 rounded-lg border border-red-500/20"
    >
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>

      <h3 className="text-xl font-semibold text-slate-200 mb-2">
        {notification.title}
      </h3>

      <p className="text-sm text-slate-400 mb-4 max-w-md text-center">
        {notification.description}
      </p>

      {/* Error code badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400">
          {error.code}
        </span>
        <span className="text-xs text-slate-500">
          Trace: {error.traceId.slice(0, 16)}...
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button
          onClick={handleGoHome}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Go Home
        </button>
      </div>

      {/* Developer details (expandable) */}
      {isDev && (
        <div className="w-full max-w-lg">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-400 transition-colors mb-2"
          >
            <Bug className="w-4 h-4" />
            Developer Details
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                showDetails && 'transform rotate-180'
              )}
            />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      Error Details
                    </span>
                    <button
                      onClick={handleCopyError}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <pre className="text-xs text-slate-300 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                    {error.stack || error.message}
                  </pre>

                  {errorInfo?.componentStack && (
                    <>
                      <div className="text-xs font-semibold text-slate-400 uppercase mt-4 mb-2">
                        Component Stack
                      </div>
                      <pre className="text-xs text-slate-400 overflow-auto max-h-32 whitespace-pre-wrap font-mono">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Feature Error Boundary HOC
// ============================================================================

/**
 * Higher-order component to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}

// ============================================================================
// useErrorHandler Hook
// ============================================================================

/**
 * Hook to programmatically trigger error boundary
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const handleError = useErrorHandler();
 *
 *   const fetchData = async () => {
 *     try {
 *       await api.getData();
 *     } catch (error) {
 *       handleError(error); // Triggers nearest error boundary
 *     }
 *   };
 * }
 * ```
 */
export function useErrorHandler(): (error: unknown) => void {
  const [, setError] = useState<Error | null>(null);

  return (error: unknown) => {
    const goatError = isGoatError(error) ? error : fromUnknown(error);
    setError(() => {
      throw goatError;
    });
  };
}

// ============================================================================
// Async Error Boundary
// ============================================================================

interface AsyncBoundaryProps {
  children: ReactNode;
  loading?: ReactNode;
  error?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  onError?: (error: GoatError) => void;
}

/**
 * Combined Suspense and Error Boundary for async components
 */
export function AsyncBoundary({
  children,
  loading,
  error,
  onError,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={error} onError={onError}>
      <React.Suspense fallback={loading || <DefaultLoadingFallback />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[100px] p-4">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ============================================================================
// Query Error Boundary
// ============================================================================

interface QueryErrorBoundaryProps {
  children: ReactNode;
  /** Reset query on boundary reset */
  queryKey?: unknown[];
  onReset?: () => void;
}

/**
 * Error boundary specifically for React Query errors
 * Provides reset functionality that clears the query cache
 */
export function QueryErrorBoundary({
  children,
  queryKey,
  onReset,
}: QueryErrorBoundaryProps) {
  const handleReset = () => {
    onReset?.();
    // Query cache clearing would be handled by parent
  };

  return (
    <ErrorBoundary
      name="QueryErrorBoundary"
      resetKeys={queryKey}
      fallback={(props) => (
        <ErrorFallbackUI
          {...props}
          resetError={() => {
            handleReset();
            props.resetError();
          }}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
