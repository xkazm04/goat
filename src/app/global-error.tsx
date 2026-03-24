'use client';

/**
 * Global Error Handler for Next.js App Router
 *
 * Catches errors in the root layout. Must be completely self-contained —
 * no external library imports that use React context.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#fff',
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f1f5f9' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Please try again or return to the home page.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => reset()}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
