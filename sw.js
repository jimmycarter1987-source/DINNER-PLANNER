const CACHE = "fdp-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // App shell-style navigation fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Runtime cache CDN + same-origin GETs
        try {
          const copy = res.clone();
          const url = new URL(req.url);
          const allow = (
            req.method === "GET" &&
            (url.origin === location.origin ||
             url.hostname.endsWith("unpkg.com") ||
             url.hostname.endsWith("cdn.tailwindcss.com"))
          );
          if (allow) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
        } catch {}
        return res;
      }).catch(() => cached);
    })
  );
});
