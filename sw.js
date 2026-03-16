const CACHE_NAME = 'vibecheck-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Outfit:wght@300;400;600;800&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(response => {
        // Cache external fonts on the fly
        if (event.request.url.includes('googleusercontent') || event.request.url.includes('gstatic')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
        // Offline fallback if needed
        if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
    })
  );
});
