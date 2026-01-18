/**
 * Service Worker for G.O.A.T. Offline-First Architecture
 *
 * Handles caching of app shell, static assets, and API responses
 * for offline functionality with automatic cache invalidation.
 */

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `goat-app-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `goat-static-${CACHE_VERSION}`;
const API_CACHE = `goat-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `goat-images-${CACHE_VERSION}`;

// App shell files to cache on install
const APP_SHELL_FILES = [
  '/',
  '/offline',
  '/manifest.json',
];

// Static assets patterns to cache
const STATIC_PATTERNS = [
  /\/_next\/static\/.*/,
  /\/fonts\/.*/,
  /\.woff2?$/,
  /\.ttf$/,
];

// API routes to cache with network-first strategy
const CACHEABLE_API_PATTERNS = [
  /\/api\/top\/groups/,
  /\/api\/lists/,
];

// Image domains to cache
const CACHEABLE_IMAGE_DOMAINS = [
  'upload.wikimedia.org',
  'm.media-amazon.com',
  'static.wikia.nocookie.net',
];

// Max cache sizes
const MAX_IMAGE_CACHE_SIZE = 100;
const MAX_API_CACHE_SIZE = 50;
const API_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Installation
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache app shell:', error);
      })
  );
});

// ============================================================================
// Activation
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('goat-') &&
                !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// ============================================================================
// Fetch Handler
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isAppShellRequest(url)) {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 5000));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirstWithLimit(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE));
  }
});

// ============================================================================
// Request Classification
// ============================================================================

function isAppShellRequest(url) {
  // Navigation requests (HTML pages)
  return url.origin === self.location.origin &&
    (url.pathname === '/' ||
     url.pathname === '/offline' ||
     url.pathname.startsWith('/match/') ||
     url.pathname.startsWith('/list/'));
}

function isStaticAsset(url) {
  // Next.js static files, fonts, etc.
  return url.origin === self.location.origin &&
    STATIC_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

function isAPIRequest(url) {
  // API routes that should be cached
  return url.origin === self.location.origin &&
    url.pathname.startsWith('/api/') &&
    CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

function isImageRequest(url) {
  // External images from allowed domains
  return CACHEABLE_IMAGE_DOMAINS.some((domain) =>
    url.hostname.includes(domain)
  );
}

// ============================================================================
// Caching Strategies
// ============================================================================

/**
 * Network First - Try network, fall back to cache
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    throw error;
  }
}

/**
 * Network First with Timeout - Try network with timeout, fall back to cache
 */
async function networkFirstWithTimeout(request, cacheName, timeout) {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const networkResponse = await fetch(request, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (networkResponse.ok) {
      // Store with timestamp for cache validation
      const responseWithTimestamp = networkResponse.clone();
      const headers = new Headers(responseWithTimestamp.headers);
      headers.set('sw-cached-at', Date.now().toString());

      cache.put(request, new Response(responseWithTimestamp.body, {
        status: responseWithTimestamp.status,
        statusText: responseWithTimestamp.statusText,
        headers,
      }));
    }

    return networkResponse;
  } catch (error) {
    // Try cache
    const cached = await cache.match(request);
    if (cached) {
      // Check if cache is still valid
      const cachedAt = cached.headers.get('sw-cached-at');
      if (cachedAt && Date.now() - parseInt(cachedAt) < API_CACHE_MAX_AGE) {
        return cached;
      }
    }

    // Return cached even if expired, better than nothing
    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Cache First - Try cache, fall back to network
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // For static assets, we can't do much if both fail
    throw error;
  }
}

/**
 * Cache First with Limit - Cache first with size limiting
 */
async function cacheFirstWithLimit(request, cacheName, maxSize) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);

      // Check cache size and prune if needed
      const keys = await cache.keys();
      if (keys.length >= maxSize) {
        // Delete oldest entries (first 10%)
        const toDelete = keys.slice(0, Math.ceil(keys.length * 0.1));
        await Promise.all(toDelete.map((key) => cache.delete(key)));
      }

      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a placeholder for failed image requests
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#374151" width="100" height="100"/><text fill="#9CA3AF" x="50" y="55" text-anchor="middle" font-size="12">Image</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

// ============================================================================
// Background Sync
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'session-sync') {
    event.waitUntil(syncSessions());
  }
});

async function syncSessions() {
  // This will be triggered by the SyncQueue when background sync is available
  // The actual sync logic is in the client-side code
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_REQUESTED',
      timestamp: Date.now(),
    });
  });
}

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;

    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls, payload.cacheName));
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      }));
      break;
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

async function cacheUrls(urls, cacheName) {
  const cache = await caches.open(cacheName || STATIC_CACHE);
  await cache.addAll(urls);
  console.log('[SW] Cached', urls.length, 'URLs');
}

async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// ============================================================================
// Notification Handler (for future push notification support)
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data?.url || '/')
    );
  }
});
