/**
 * Service Worker - Offline-First Support
 * Req #24: Offline functionality
 * Req #29: Self-hosted assets (China Safe)
 */

// Version-based cache naming for easy updates
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `ledger-erp-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/js/security.js',
    '/js/pi-adapter.js',
    '/js/lifecycle.js',
    '/js/db.js'
];

// Cache expiration time (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches and verify cache integrity
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Verify cache integrity
            caches.open(CACHE_NAME).then((cache) => {
                return cache.keys().then((keys) => {
                    console.log(`Cache verified: ${keys.length} items in ${CACHE_NAME}`);
                    // Check for expired cache entries
                    return Promise.all(
                        keys.map(async (request) => {
                            const response = await cache.match(request);
                            if (response) {
                                const dateHeader = response.headers.get('date');
                                if (dateHeader) {
                                    const cacheDate = new Date(dateHeader);
                                    const age = Date.now() - cacheDate.getTime();
                                    if (age > CACHE_EXPIRY) {
                                        console.log('Removing expired cache entry:', request.url);
                                        return cache.delete(request);
                                    }
                                }
                            }
                        })
                    );
                });
            })
        ])
    );
    self.clients.claim(); // Take control immediately
});

// Fetch event - serve from cache, fallback to network with cache validation
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Req #29: Serve self-hosted assets from cache with network validation
    if (event.request.url.includes('/js/') || event.request.url.includes('/css/') || event.request.url.includes('/libs/')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Always fetch from network to check for updates (stale-while-revalidate)
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Update cache with fresh response
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Network failed, return cached if available
                    return cachedResponse;
                });

                // Return cached immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            })
        );
    } else if (event.request.url.includes('/api/') || event.request.url.includes('/blockchain/') || event.request.url.includes('/sync/')) {
        // For API calls, always try network first (no caching)
        event.respondWith(
            fetch(event.request).catch(() => {
                // Offline fallback
                return new Response(
                    JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
                    {
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            })
        );
    } else {
        // For other requests, use network-first strategy
        event.respondWith(
            fetch(event.request).catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request);
            })
        );
    }
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

