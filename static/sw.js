/* global self, caches */

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const registrations = await self.registration.unregister();
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      await self.clients.claim();
      return registrations;
    })()
  );
});
