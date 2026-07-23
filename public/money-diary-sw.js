const APP = {
  app: "money_diary",
  badge: "/icons/money-diary-badge-v2-96.png",
  cache: "money-diary-v2-shell-1",
  icon: "/icons/money-diary-v2-192.png",
  scopePath: "/money",
  startUrl: "/money",
  title: "Money Diary",
};

const SHELL_ASSETS = [
  APP.startUrl,
  "/money-diary.webmanifest",
  APP.icon,
  APP.badge,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP.cache).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("money-diary-") && key !== APP.cache
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname.startsWith(APP.scopePath)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(APP.cache).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ?? (await caches.match(APP.startUrl))
        )
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            void caches.open(APP.cache).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  if (payload.app && payload.app !== APP.app) return;

  const data = {
    ...(payload.data ?? {}),
    app: APP.app,
    targetUrl: payload.data?.targetUrl ?? APP.startUrl,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? APP.title, {
      badge: payload.badge ?? APP.badge,
      body: payload.body ?? "Bạn có cập nhật tài chính mới.",
      data,
      icon: payload.icon ?? APP.icon,
      silent: payload.soundEnabled === false,
      tag: payload.tag ?? `${APP.app}-notification`,
      vibrate: payload.vibrationEnabled === false ? [] : [120, 60, 120],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.targetUrl ?? APP.startUrl,
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then(async (windows) => {
        const appWindow = windows.find((client) => {
          const url = new URL(client.url);
          return url.origin === self.location.origin && url.pathname.startsWith(APP.scopePath);
        });

        if (appWindow) {
          await appWindow.navigate(targetUrl);
          return appWindow.focus();
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});

