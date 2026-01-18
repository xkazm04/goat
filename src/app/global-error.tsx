'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown } from 'lucide-react';

/**
 * Global Error Handler for Next.js App Router
 *
 * This component catches errors that occur during:
 * - Server-side rendering
 * - Client-side navigation
 * - Root layout errors
 *
 * Note: This runs outside the normal component tree, so it can't use
 * providers or hooks that depend on the app context.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorInfo, setErrorInfo] = useState({
    traceId: '',
    timestamp: '',
  });

  useEffect(() => {
    // Generate trace ID and timestamp
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    setErrorInfo({
      traceId: `goat-${timestamp}-${random}`,
      timestamp: new Date().toISOString(),
    });

    // Log error
    console.error('🚨 Global Error:', {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    // Track error for analytics
    if (typeof window !== 'undefined' && (window as any).__GOAT_ERROR_TRACKER__) {
      (window as any).__GOAT_ERROR_TRACKER__({
        type: 'global_error',
        code: 'CLIENT_UNKNOWN_ERROR',
        traceId: errorInfo.traceId,
        name: error.name,
        message: error.message,
        digest: error.digest,
        timestamp: errorInfo.timestamp,
      });
    }
  }, [error, errorInfo.traceId, errorInfo.timestamp]);

  const handleCopyError = async () => {
    const errorReport = [
      `Error: ${error.name}`,
      `Message: ${error.message}`,
      `Trace ID: ${errorInfo.traceId}`,
      `Timestamp: ${errorInfo.timestamp}`,
      error.digest ? `Digest: ${error.digest}` : '',
      '',
      error.stack ? `Stack:\n${error.stack}` : '',
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

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            padding: '2rem',
          }}
        >
          {/* Error icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <AlertTriangle
              style={{ width: '40px', height: '40px', color: '#f87171' }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#f1f5f9',
            }}
          >
            Something went wrong
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '0.875rem',
              color: '#94a3b8',
              marginBottom: '1rem',
              textAlign: 'center',
              maxWidth: '400px',
            }}
          >
            An unexpected error occurred. Please try again or return to the home page.
          </p>

          {/* Error info badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            <span
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#1e293b',
                borderRadius: '0.25rem',
                fontFamily: 'monospace',
              }}
            >
              {error.name || 'Error'}
            </span>
            {errorInfo.traceId && (
              <span>Trace: {errorInfo.traceId.slice(0, 16)}...</span>
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Try again
            </button>
            <button
              onClick={handleGoHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
            >
              <Home style={{ width: '16px', height: '16px' }} />
              Go Home
            </button>
          </div>

          {/* Developer details (only in development) */}
          {isDev && (
            <div style={{ width: '100%', maxWidth: '500px' }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  padding: '0.25rem',
                }}
              >
                Developer Details
                <ChevronDown
                  style={{
                    width: '14px',
                    height: '14px',
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {showDetails && (
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #334155',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Error Details
                    </span>
                    <button
                      onClick={handleCopyError}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.625rem',
                        color: '#64748b',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                      }}
                    >
                      <Copy style={{ width: '12px', height: '12px' }} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <pre
                    style={{
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      overflow: 'auto',
                      maxHeight: '200px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    {error.stack || error.message}
                  </pre>

                  {error.digest && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #334155',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.625rem',
                          color: '#64748b',
                        }}
                      >
                        Digest: {error.digest}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
