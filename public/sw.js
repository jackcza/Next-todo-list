// Bump CACHE_VERSION when changing what is precached so old caches get cleared on activate.
const CACHE_VERSION = "v1";
const CACHE = `todo-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];
// Every deploy produces new hashed asset names, so cap the cache instead of letting old builds pile up.
const MAX_ASSETS = 200;

async function putAsset(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  const keys = (await cache.keys()).filter((key) => new URL(key.url).pathname.startsWith("/_next/static/"));
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages carry per-user data, so they always come from the network; the cache is only an offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Build assets have content-hashed names and never change, so they are safe to serve cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) event.waitUntil(putAsset(request, response.clone()));
            return response;
          }),
      ),
    );
  }
  // Everything else, including /api, goes straight to the network.
});
