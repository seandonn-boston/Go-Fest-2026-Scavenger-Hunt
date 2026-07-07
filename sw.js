/* ============================================================================
 * GO Fest 2026 Scavenger Hunt — service worker
 * Precaches the full app shell so the hunt works with zero connectivity
 * (GO Fest cell networks are famously swamped). Bump CACHE_VERSION whenever
 * any asset changes — especially data.js when official spawn lists land.
 *
 * Strategy: network-first (with a short timeout) for the app's own HTML/JS/CSS,
 * so a fresh deploy shows up on the next reload when online, but the app still
 * loads instantly from cache when offline or on a swamped network. Icons and
 * the manifest are cache-first (they rarely change and speed is nice).
 * ==========================================================================*/

const CACHE_VERSION = "gofest2026-hunt-v8";
const NET_TIMEOUT_MS = 3000;

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve `request` from cache, falling back to the precached index.html for
// navigations so the app always opens offline no matter the entry URL.
function fromCache(request) {
  return caches.match(request, { ignoreSearch: true }).then((cached) => {
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match("./index.html");
    return Response.error();
  });
}

// Fetch from network, updating the cache on success; reject if it takes too
// long so we can fall back to cache on a swamped network.
function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(reject, NET_TIMEOUT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Network-first for the app's own HTML/JS/CSS so deploys take effect on the
  // next online reload; cache-first for everything else (icons, manifest).
  const url = new URL(request.url);
  const isAppShell =
    request.mode === "navigate" ||
    (url.origin === self.location.origin && /\.(?:html|js|css)$/.test(url.pathname));

  event.respondWith(
    isAppShell
      ? fromNetwork(request).catch(() => fromCache(request))
      : fromCache(request).then((cached) => cached || fromNetwork(request).catch(() => cached))
  );
});
