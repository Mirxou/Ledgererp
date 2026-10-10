/* ════════════════════════════════════════════════════════════════════════════
   Ledgererp Service Worker — Offline POS Operation
   ────────────────────────────────────────────────────────────────────────────
   Strategies:
     • Static assets  → Cache-first (fast, rarely change)
     • API data       → Stale-while-revalidate (show cached, refresh in background)
     • API mutations  → Network-only (POST/PUT/PATCH/DELETE never cached)
     • Navigation     → Network-first, cache fallback (offline shell)
   Features:
     • Background sync for pending sales when back online
     • Manual cache invalidation via postMessage
     • Skip waiting + claim clients on install/activate
   ════════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'ledgererp-v1';
const STATIC_CACHE = 'ledgererp-static-v1';
const API_CACHE = 'ledgererp-api-v1';

/* ── Static shell resources cached on install ─────────────────────────────── */
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

/* ── Routes that should use cache-first strategy ──────────────────────────── */
const CACHE_FIRST_PATTERNS = [
  /\.(?:js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/i,
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//,
];

/* ── API routes using stale-while-revalidate ──────────────────────────────── */
const API_SWR_PATTERNS = [
  /\/api\/products/i,
  /\/api\/invoices/i,
  /\/api\/escrow/i,
  /\/api\/settings/i,
  /\/api\/stats/i,
  /\/api\/dashboard/i,
  /\/api\/pos/i,
];

/* ── Navigation requests (HTML pages) ─────────────────────────────────────── */
const NAVIGATION_CACHE = 'ledgererp-nav-v1';

/* ════════════════════════════════════════════════════════════════════════════
   INSTALL — Cache static shell, skip waiting
   ════════════════════════════════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Cache shell assets individually to avoid one failure blocking all
        return Promise.allSettled(
          SHELL_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Failed to cache shell asset:', url, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete — static shell cached');
      })
  );
  self.skipWaiting();
});

/* ════════════════════════════════════════════════════════════════════════════
   ACTIVATE — Clean old caches, claim all clients
   ════════════════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  const currentCaches = new Set([CACHE_NAME, STATIC_CACHE, API_CACHE, NAVIGATION_CACHE]);

  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => !currentCaches.has(key))
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activate complete — old caches cleaned');
      })
  );
  self.clients.claim();
});

/* ════════════════════════════════════════════════════════════════════════════
   FETCH — Route-based caching strategy
   ════════════════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    // For cross-origin static assets (fonts, CDN), use cache-first
    if (CACHE_FIRST_PATTERNS.some((p) => p.test(url.href))) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    // Let other cross-origin requests pass through
    return;
  }

  // ── Mutations: network-only (never cache POST/PUT/PATCH/DELETE) ──
  if (request.method !== 'GET') {
    // Queue failed POST requests for background sync (POS sales)
    if (request.method === 'POST' && /\/api\/(?:invoices|pos|sales)/i.test(url.pathname)) {
      event.respondWith(
        fetch(request).catch(async (err) => {
          // Store the failed request for background sync
          await queuePendingSale(request);
          // Return a synthetic response so the UI doesn't crash
          return new Response(
            JSON.stringify({
              offline: true,
              queued: true,
              message: 'Sale queued — will sync when back online',
            }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
      );
      return;
    }

    // Other mutations: straight to network, no caching
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network unavailable — try again when online' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // ── API data: stale-while-revalidate ──
  if (API_SWR_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // ── Navigation: network-first with cache fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, NAVIGATION_CACHE));
    return;
  }

  // ── Static assets: cache-first ──
  if (CACHE_FIRST_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Default: network-first for everything else ──
  event.respondWith(networkFirst(request, CACHE_NAME));
});

/* ════════════════════════════════════════════════════════════════════════════
   CACHING STRATEGIES
   ════════════════════════════════════════════════════════════════════════════ */

/** Cache-first: Return cached version if available, else fetch & cache */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Return offline fallback for navigation
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

/** Network-first: Try network, fall back to cache */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation, return the cached shell
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

/** Stale-while-revalidate: Return cache immediately, update in background */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  // Fire-and-forget network request to update cache
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(cacheName).then((c) => c.put(request, response.clone()));
        // Notify clients about fresh data
        notifyClients({ type: 'CACHE_UPDATED', url: request.url });
      }
      return response;
    })
    .catch(() => {
      // Network failed — that's fine, we already returned cached
    });

  // Return cached version immediately if available
  if (cached) return cached;

  // No cached version — wait for network
  try {
    return await fetchPromise;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'No cached data available and network is offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   BACKGROUND SYNC — Queue pending POS sales
   ════════════════════════════════════════════════════════════════════════════ */
const PENDING_SALES_DB = 'ledgererp-pending-sales';

/** Store a failed POST request in IndexedDB for later replay */
async function queuePendingSale(request) {
  try {
    const body = await request.clone().text();
    const record = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 9),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };

    const db = await openPendingDB();
    const tx = db.transaction(PENDING_SALES_DB, 'readwrite');
    const store = tx.objectStore(PENDING_SALES_DB);
    store.add(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });

    console.log('[SW] Pending sale queued:', record.id);
    notifyClients({ type: 'SALE_QUEUED', id: record.id });

    // Register for background sync if supported
    if ('sync' in self.registration) {
      self.registration.sync.register('sync-pending-sales');
    }
  } catch (err) {
    console.error('[SW] Failed to queue pending sale:', err);
  }
}

/** Open IndexedDB for pending sales */
function openPendingDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PENDING_SALES_DB, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PENDING_SALES_DB)) {
        db.createObjectStore(PENDING_SALES_DB, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/** Replay all pending sales when back online */
async function replayPendingSales() {
  try {
    const db = await openPendingDB();
    const tx = db.transaction(PENDING_SALES_DB, 'readonly');
    const store = tx.objectStore(PENDING_SALES_DB);
    const getAll = store.getAll();

    const records = await new Promise((resolve, reject) => {
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    });

    if (!records.length) {
      console.log('[SW] No pending sales to replay');
      return;
    }

    console.log('[SW] Replaying', records.length, 'pending sales');

    const results = await Promise.allSettled(
      records.map(async (record) => {
        const response = await fetch(record.url, {
          method: record.method,
          headers: record.headers,
          body: record.body,
        });

        if (response.ok) {
          // Remove from queue on success
          const deleteTx = db.transaction(PENDING_SALES_DB, 'readwrite');
          const deleteStore = deleteTx.objectStore(PENDING_SALES_DB);
          deleteStore.delete(record.id);
          await new Promise((resolve, reject) => {
            deleteTx.oncomplete = resolve;
            deleteTx.onerror = reject;
          });
          console.log('[SW] Sale synced:', record.id);
          return { id: record.id, success: true };
        } else {
          console.warn('[SW] Sale sync failed:', record.id, response.status);
          return { id: record.id, success: false, status: response.status };
        }
      })
    );

    const synced = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - synced;

    notifyClients({
      type: 'SYNC_COMPLETE',
      synced,
      failed,
      total: records.length,
    });
  } catch (err) {
    console.error('[SW] Error replaying pending sales:', err);
  }
}

/* ── Background Sync event ─────────────────────────────────────────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-sales') {
    event.waitUntil(replayPendingSales());
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   MESSAGE HANDLER — Manual cache invalidation & commands
   ════════════════════════════════════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  const { data } = event;

  switch (data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_API_CACHE':
      caches.delete(API_CACHE).then(() => {
        console.log('[SW] API cache cleared');
        notifyClients({ type: 'CACHE_CLEARED', cache: 'api' });
      });
      break;

    case 'CLEAR_ALL_CACHES':
      caches.keys().then((keys) => {
        Promise.all(keys.map((k) => caches.delete(k))).then(() => {
          console.log('[SW] All caches cleared');
          notifyClients({ type: 'CACHE_CLEARED', cache: 'all' });
        });
      });
      break;

    case 'REPLAY_PENDING':
      replayPendingSales();
      break;

    case 'GET_CACHE_STATUS':
      Promise.all([
        caches.open(API_CACHE).then((c) => c.keys().then((k) => k.length)),
        caches.open(STATIC_CACHE).then((c) => c.keys().then((k) => k.length)),
      ]).then(([apiEntries, staticEntries]) => {
        event.source?.postMessage({
          type: 'CACHE_STATUS',
          apiEntries,
          staticEntries,
        });
      });
      break;

    default:
      break;
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

/** Broadcast a message to all controlled clients */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

/* ── Periodic background sync check (fallback for browsers without Sync API) ─ */
self.addEventListener('fetch', () => {
  // This is a no-op hook; actual sync is triggered by the 'sync' event
  // or by the client via postMessage when coming back online
});
