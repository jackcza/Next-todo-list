// Bump CACHE_VERSION when changing what is precached so the old precache gets cleared on activate.
const CACHE_VERSION = "v2";
const PRECACHE = `todo-${CACHE_VERSION}`;
// Kept across versions: a cached page still needs the build assets it was rendered with.
const STATIC_CACHE = "todo-static";
// The signed-in user's pages. The app deletes this cache on logout (see lib/sync-client.ts).
const PAGES_CACHE = "todo-pages";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png"];
const OFFLINE_PAGES = ["/", "/guide.html"];
// Every deploy produces new hashed asset names, so cap the cache instead of letting old builds pile up.
const MAX_ASSETS = 300;
// On a slow connection, show the saved page after this long instead of waiting for the network.
const NETWORK_TIMEOUT_MS = 3000;

async function putAsset(request, response) {
  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [PRECACHE, STATIC_CACHE, PAGES_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Network first. A successful page (not a redirect to the login page) replaces the saved copy; when the
 * network fails or is too slow, the saved copy is shown, and the app catches up from IndexedDB and /api/sync.
 */
function handlePage(event, pathname) {
  const network = fetch(event.request).then((response) => {
    if (response.ok && response.type === "basic" && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(caches.open(PAGES_CACHE).then((cache) => cache.put(pathname, copy)));
    }
    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const cached = caches.open(PAGES_CACHE).then((cache) => cache.match(pathname, { ignoreVary: true }));
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  const slowFallback = timeout.then(() => cached).then((response) => response || network);

  return Promise.race([network, slowFallback]).catch(() =>
    cached.then((response) => response || caches.match(OFFLINE_URL)),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (OFFLINE_PAGES.includes(url.pathname)) {
      event.respondWith(handlePage(event, url.pathname));
    } else {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
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
