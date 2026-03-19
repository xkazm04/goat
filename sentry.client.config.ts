import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({ colorScheme: 'dark', autoInject: false }),
  ],

  // Filter noisy errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome-extension:\/\//,
    // Network errors users can't control
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'NetworkError',
    // ResizeObserver noise
    'ResizeObserver loop',
    // Hydration warnings (handled by suppressHydrationWarning)
    /Hydration failed/,
    /Text content does not match/,
  ],

  // Don't send events from bots/crawlers
  beforeSend(event) {
    if (typeof navigator !== 'undefined' && /bot|crawler|spider/i.test(navigator.userAgent)) {
      return null;
    }
    return event;
  },

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
