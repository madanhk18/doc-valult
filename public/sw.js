// Minimal service worker: makes the app installable and keeps a cached app
// shell for a faster start. Documents are private, so only the static shell
// and build assets are ever cached — never pages with document data or the
// signed file links.
const CACHE_NAME = "doc-vault-shell-v1";
const SHELL_URLS = ["/manifest.webmanifest", "/pwa-icon/192", "/pwa-icon/512"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Build assets are content-hashed, so cache-first is safe for them.
  if (url.pathname.startsWith("/_next/static/") || SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return res;
          })
      )
    );
  }
  // Everything else goes straight to the network.
});
