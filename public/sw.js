// Offline support: every same-origin GET (app shell, SDK assets, WASM, case files) is cached.
// Network first for the HTML page and case files; cache first for the SDK and app assets (versioned file names).
const CACHE = "hearing-annotations-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "precache") {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(event.data.urls).catch(() => null)));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Network first for the page and the case files, so a newer version replaces the cached one when online.
  if (request.mode === "navigate" || url.pathname.startsWith("/samples/")) {
    const cacheKey = request.mode === "navigate" ? "/" : request;
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(cacheKey, copy));
          }
          return res;
        })
        .catch(() => caches.match(cacheKey))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
