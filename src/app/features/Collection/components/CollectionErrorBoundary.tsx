"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary for CollectionPanel
 *
 * Catches rendering exceptions from CollectionPanel and its child components,
 * logs errors to monitoring service, and displays a fallback UI.
 *
 * This prevents uncaught errors in nested components (CollectionStats,
 * CollectionSearch, etc.) from unmounting the entire page.
 */
export class CollectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);

    // Update state with error details
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Log error to monitoring service
   * In production, this would send to services like Sentry, LogRocket, etc.
   */
  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Console log for development
    console.error("CollectionPanel Error Boundary caught an error:", {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // TODO: In production, send to monitoring service
    // Example integrations:
    // - Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // - LogRocket.captureException(error, { extra: errorInfo });
    // - Custom API: fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error, errorInfo }) });

    // For now, store in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };

      const existingLogs = localStorage.getItem("collection-error-logs");
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorLog);

      // Keep only last 10 errors
      if (logs.length > 10) {
        logs.shift();
      }

      localStorage.setItem("collection-error-logs", JSON.stringify(logs));
    } catch (storageError) {
      console.error("Failed to store error log:", storageError);
    }
  }

  /**
   * Reset error boundary state and retry rendering
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Default fallback UI
   */
  private renderDefaultFallback() {
    const { error, errorInfo } = this.state;
    const isDevelopment = process.env.NODE_ENV === "development";

    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-red-500/50 z-40 p-6"
        data-testid="collection-error-boundary-fallback"
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                Collection Error
              </h3>
              <p className="text-sm text-gray-400">
                Something went wrong while rendering the collection panel.
                The error has been logged and reported.
              </p>
            </div>
          </div>

          {/* Error Details (Development only) */}
          {isDevelopment && error && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="mb-2">
                <span className="text-xs font-mono text-red-400">
                  {error.name}: {error.message}
                </span>
              </div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
              {errorInfo?.componentStack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    Component Stack
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors text-sm font-medium border border-cyan-500/40"
              data-testid="collection-error-retry-btn"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
              data-testid="collection-error-reload-btn"
            >
              Reload Page
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <p className="text-xs text-gray-400">
              <strong className="text-gray-300">What to do:</strong> Try refreshing
              the page or clearing your browser cache. If the problem persists,
              please contact support with the error details above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      return this.props.fallback || this.renderDefaultFallback();
    }

    return this.props.children;
  }
}

/**
 * Higher-order component wrapper for ErrorBoundary
 *
 * Usage:
 * const SafeComponent = withCollectionErrorBoundary(MyComponent);
 */
export function withCollectionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <CollectionErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </CollectionErrorBoundary>
  );

  WrappedComponent.displayName = `withCollectionErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
}
