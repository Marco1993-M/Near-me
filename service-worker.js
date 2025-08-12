const CACHE_NAME = 'near-me-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/offline.html'
];

// Install - Cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate - Remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});

// Fetch - Serve from cache or network
self.addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);

  // Cache Leaflet tiles separately
  if (requestURL.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('near-me-tiles').then(cache => {
        return cache.match(event.request).then(response => {
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // If offline and tile not cached, nothing we can show
          });
        });
      })
    );
    return;
  }

  // Default behavior for site files
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => caches.match('/offline.html'));
    })
  );
});
