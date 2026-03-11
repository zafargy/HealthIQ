// Health Dashboard — Service Worker
// Caches the app shell for full offline use

const CACHE = 'health-dash-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for CDN assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // App shell files → serve from cache, update in background
  if (APP_SHELL.some(f => url.pathname.endsWith(f.replace('./', '')))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // CDN resources (Chart.js, Tesseract, PDF.js) → network with cache fallback
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
