/// <reference lib="webworker" />
// RouteShepherd Service Worker — Offline Support & Caching Strategy

const CACHE_NAME = 'routeshepherd-v1';
const STATIC_CACHE = 'routeshepherd-static-v1';
const DYNAMIC_CACHE = 'routeshepherd-dynamic-v1';
const API_CACHE = 'routeshepherd-api-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/logo.png',
  '/logo-icon.png',
  '/logo-premium.png',
  '/offline.html',
];

// API routes that should be cached with network-first strategy
const API_CACHE_PATTERNS = [
  /\/api\/routes/,
  /\/api\/pickup-points/,
  /\/api\/events/,
  /\/api\/buses/,
];

// Install event — pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing RouteShepherd service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets failed to cache:', err);
        // Don't fail install if some assets can't be cached
        return Promise.resolve();
      });
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating RouteShepherd service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event — routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip NextAuth and auth-related requests — always go network
  if (url.pathname.startsWith('/api/auth') || 
      url.pathname.startsWith('/api/coordinator-login') ||
      url.pathname.startsWith('/api/driver-login') ||
      url.pathname.startsWith('/api/change-pin')) {
    return;
  }

  // API routes — Network First with API cache fallback
  if (url.pathname.startsWith('/api/') && API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // API routes that shouldn't be cached — Network Only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'You are offline. Please check your connection.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Static assets (images, fonts, CSS, JS) — Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // HTML pages — Network First with offline fallback
  event.respondWith(networkFirstWithOfflineFallback(request));
});

// Strategy: Cache First, then Network
async function cacheFirstWithNetwork(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// Strategy: Network First, then Cache
async function networkFirstWithCache(request, cacheName) {
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
      // Return cached data but mark it as stale
      const headers = new Headers(cached.headers);
      headers.set('X-Served-From', 'cache');
      headers.set('X-Cache-Age', new Date().toISOString());
      return new Response(cached.body, { status: cached.status, headers });
    }
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'This data is not available offline.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Strategy: Network First with offline.html fallback for navigation
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }

    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// Helper: Check if request is for a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.avif',
  ];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
