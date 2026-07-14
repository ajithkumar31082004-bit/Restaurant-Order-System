const CACHE_NAME = 'foodhub-cache-v1';
const ASSETS = [
  '/pages/index.html',
  '/pages/menu.html',
  '/pages/login.html',
  '/pages/register.html',
  '/pages/cart.html',
  '/pages/checkout.html',
  '/css/style.css',
  '/js/api.js',
  '/js/utils.js',
  '/js/cart.js',
  '/js/components.js',
  '/js/theme.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Cache newly fetched assets
        if (e.request.url.startsWith(self.location.origin) && !e.request.url.includes('/api/')) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback
      if (e.request.mode === 'navigate') {
        return caches.match('/pages/menu.html');
      }
    })
  );
});
