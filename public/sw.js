const LEGACY_CACHE_MARKERS = [
  "workbox",
  "precache",
  "vite-pwa",
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys
          .filter((key) =>
            LEGACY_CACHE_MARKERS.some((marker) => key.includes(marker))
          )
          .map((key) => caches.delete(key))
      );

      await self.registration.unregister();

      const windows = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      await Promise.all(
        windows.map((client) => client.navigate(client.url))
      );
    })()
  );
});
