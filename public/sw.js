// Offline support. The "Prepare offline" button stores every file listed in /offline-manifest.json
// (app shell, SDK runtime, case files) in this cache. Afterwards:
// - the page and the case files are network first, so a newer version replaces the cached one when online;
// - everything else (versioned SDK and app files) is cache first.
const CACHE = "hearing-annotations-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const save = (key, res) => {
  if (res.ok && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(key, copy));
  }
  return res;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // The page is stored under "/" whatever its query string (?doc=, ?lang=) or hash.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((res) => save("/", res)).catch(() => caches.match("/")));
    return;
  }
  if (url.pathname.startsWith("/samples/") || url.pathname === "/offline-manifest.json") {
    event.respondWith(
      fetch(request)
        .then((res) => save(url.pathname, res))
        .catch(() => caches.match(url.pathname))
    );
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request).then((res) => save(request, res)))
  );
});
