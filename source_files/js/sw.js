/**
 * Pi Ledger Service Worker - Phase 4 Offline Support
 * Vision 2030
 */

const CACHE_NAME = 'pi-ledger-v1.1.0';
const ASSETS_TO_CACHE = [
    '/',
    '/static/index.html',
    '/static/css/style.css',
    '/static/css/design-tokens.css',
    '/static/js/db.js',
    '/static/js/invoice.js',
    '/static/js/security.js',
    '/static/js/pi-adapter.js',
    '/static/js/ui-utils.js',
    '/static/js/reports.js',
    '/static/js/data-export.js',
    '/static/manifest.json',
    '/static/favicon.ico',
    '/static/icon-192.png',
    '/static/icon-512.png',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://esm.sh/qrious@4.0.2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install Event - Cache all essential assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching essential assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Strategic Caching
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // SECURITY: Never cache sensitive API calls or paths containing auth tokens
    if (url.pathname.startsWith('/api/auth') ||
        url.pathname.startsWith('/api/blockchain/approve') ||
        url.pathname.startsWith('/api/blockchain/complete')) {
        return; // Let browser handle network normally, NO CACHE
    }

    // API calls should be network-first (for offline read-only if cached earlier)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Update cache for read-only endpoints (e.g. status)
                    if (url.pathname.includes('/status') || url.pathname.includes('/list')) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Static assets - Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
