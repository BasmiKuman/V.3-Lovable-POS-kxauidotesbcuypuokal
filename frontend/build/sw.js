self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Basic offline fallback (optional)
  // event.respondWith(fetch(event.request).catch(() => caches.match('offline.html')));
});
