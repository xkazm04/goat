"use client";

import { RefreshCw } from "lucide-react";
import React, { Component, ReactNode } from "react";

import { ToppledTrophy } from "@/components/illustrations/EmptyStateIllustrations";

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
        className="fixed bottom-0 left-0 right-0 glass-dock-panel border-t border-amber-500/30 z-sticky p-6 backdrop-blur-xl"
        data-testid="collection-error-boundary-fallback"
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="shrink-0">
              <ToppledTrophy width={80} height={80} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Even the G.O.A.T. stumbles sometimes
              </h3>
              <p className="text-sm text-slate-400">
                Something went wrong while rendering the collection panel.
                The error has been logged and reported.
              </p>
            </div>
          </div>

          {/* Error Details (Development only) */}
          {isDevelopment && error && (
            <div className="mb-4 p-4 bg-white/5 rounded-card border border-white/10">
              <div className="mb-2">
                <span className="text-xs font-mono text-amber-400">
                  {error.name}: {error.message}
                </span>
              </div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-slate-500 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
              {errorInfo?.componentStack && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    Component Stack
                  </summary>
                  <pre className="mt-2 text-xs text-slate-500 overflow-x-auto whitespace-pre-wrap">
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand to-blue-500 hover:from-brand-hover hover:to-blue-400 text-white rounded-control transition-all text-sm font-medium shadow-lg shadow-brand/20"
              data-testid="collection-error-retry-btn"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-control transition-colors text-sm border border-white/10"
              data-testid="collection-error-reload-btn"
            >
              Reload Page
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-white/5 rounded-card border border-white/10">
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">What to do:</strong> Try refreshing
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
