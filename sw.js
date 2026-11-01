/* The Launchpad's service worker: lets it be installed as an app (PWA) and
   shows a friendly page when there's no internet. It never caches sign-in,
   the database or anything personal - the pages always come fresh from the
   network, and only the offline page and icons are kept. */
var CACHE = "hl-shell-v2";
var KEEP = ["/offline.html", "/icons/icon-192.png", "/favicon.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(KEEP); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  if (e.request.mode !== "navigate") return;            /* only whole pages; everything else goes straight through */
  /* Downloads (the app files) are left completely alone: Safari on iPad
     saved them as .html when they passed through here. Only real pages -
     no extension, or .html - get the offline fallback. */
  var path = new URL(e.request.url).pathname;
  if (/\.[a-z0-9]+$/i.test(path) && !/\.html?$/i.test(path)) return;
  if (path.indexOf("/app/") === 0 && path !== "/app/") return;
  e.respondWith(fetch(e.request).catch(function(){ return caches.match("/offline.html"); }));
});
