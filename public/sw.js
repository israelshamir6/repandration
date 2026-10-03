/* Rep & Ration service worker: offline app shell, cached exercise demos, push reminders. */
const V = "rr-v3";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/data/exercises.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== "rr-img").map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.pathname.startsWith("/api/")) return;
  if (u.origin === location.origin && (u.pathname.startsWith("/ex/") || u.pathname.startsWith("/icons/"))) {
    e.respondWith(caches.open("rr-img").then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  if (u.origin === location.origin && (r.mode === "navigate" || u.pathname.startsWith("/data/"))) {
    // network first, fall back to cache when offline
    e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(V).then(c => c.put(r.mode === "navigate" ? "/" : r, res.clone())); return res; }).catch(() => caches.match(r.mode === "navigate" ? "/" : r)));
  }
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch { d = {title: "Rep & Ration", body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "Rep & Ration", {body: d.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: d.tag || "rr", data: {url: d.url || "/"}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    for (const c of list) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
