/**
 * Pi Ledger Service Worker - Phase 4 Offline Support
 * Vision 2030
 */

const CACHE_NAME = 'pi-ledger-v1.0.0';
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
    'https://esm.sh/qrious@4.0.2'
];

// Install Event - Cache all essential assets
self.addEventListener('install', (event) => {
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
        })
    );
});

// Fetch Event - Network-First for API, Cache-First for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API calls should be network-first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Static assets should be cache-first
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
