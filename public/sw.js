/**
 * ELORA - Service Worker PWA & Mode Hors Ligne
 * Assure la disponibilité permanente du shell applicatif et des assets statiques.
 */

const CACHE_NAME = 'elora-shell-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
];

const OFFLINE_FALLBACK_RESPONSE = () =>
  new Response('Application hors ligne', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

function isCacheableLocalResponse(response) {
  return Boolean(response && response.ok && response.type === 'basic');
}

function cacheInBackground(request, response) {
  if (!isCacheableLocalResponse(response)) return;
  const responseToCache = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, responseToCache);
  });
}

// Installation : pré-mise en cache du shell et des assets locaux injectés au build
self.addEventListener('install', (event) => {
  const localAssets = PRECACHE_ASSETS.filter(
    (asset) => typeof asset === 'string' && asset.startsWith('/') && !asset.startsWith('//')
  );
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(localAssets))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Stratégie de capture :
// - Navigations : Network-First avec fallback sur /index.html en cache si hors ligne
// - Assets Vite (/assets/*) : Cache-First avec mise à jour si absent
// - Autres requêtes locales GET : Stale-While-Revalidate sans jamais retourner undefined
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          cacheInBackground('/index.html', networkResponse);
          return networkResponse;
        })
        .catch(async () => {
          const cachedIndex = (await caches.match('/index.html')) || (await caches.match('/'));
          return cachedIndex || OFFLINE_FALLBACK_RESPONSE();
        })
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            cacheInBackground(event.request, networkResponse);
            return networkResponse;
          })
          .catch(() => OFFLINE_FALLBACK_RESPONSE());
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          cacheInBackground(event.request, networkResponse);
          return networkResponse;
        })
        .catch(() => cachedResponse || OFFLINE_FALLBACK_RESPONSE());

      return cachedResponse || fetchPromise;
    })
  );
});
