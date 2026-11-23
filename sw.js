// InterpretLiveNow service worker: fast offline shell, always-fresh updates
const CACHE = "iln-v2-2-0";
const ASSETS = ["./", "index.html", "manifest.webmanifest", "logo-160.png", "favicon-32.png", "icon-180.png", "icon-192.png", "icon-512.png", "maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Same-origin GET only (translation APIs are never cached). Serve cache instantly, refresh in background.
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit || c.match("./"));
    return hit || net;
  }));
});
