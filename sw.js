// InterpretLiveNow service worker V2.3: Network-First for HTML, cache for assets
const CACHE = "iln-v2-3-0";
const ASSETS = ["./manifest.webmanifest", "logo-160.png", "favicon-32.png", "icon-180.png", "icon-192.png", "icon-512.png", "maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;

  const url = new URL(r.url);
  const isHTML = r.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html") || url.pathname === "" || /InterpretLiveNow\/?$/.test(url.pathname);

  if (isHTML) {
    // Network First for HTML so deploys are visible immediately
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(r, clone));
        }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || caches.match("./") || caches.match("index.html")))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(r, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(r);
        if (res.ok) c.put(r, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    })
  );
});
