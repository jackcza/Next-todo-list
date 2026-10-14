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
 * Cache first: the saved copy opens instantly while the network refreshes it for next time, and the app
 * catches up on the data from IndexedDB and /api/sync. A redirect (the session has ended) drops the saved
 * copy so the next visit goes to the login page. Without a saved copy, the page comes from the network.
 */
async function handlePage(event, pathname) {
  const cache = await caches.open(PAGES_CACHE);
  const network = fetch(event.request).then((response) => {
    if (response.redirected) {
      event.waitUntil(cache.delete(pathname));
    } else if (response.ok && response.type === "basic") {
      event.waitUntil(cache.put(pathname, response.clone()));
    }
    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const cached = await cache.match(pathname, { ignoreVary: true });
  if (cached) return cached;
  return network.catch(() => caches.match(OFFLINE_URL));
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

// Task reminders from /api/reminders/tick. The tag is per task, so a repeat replaces the earlier notification.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Todo List", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
