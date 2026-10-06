const CACHE = "pioche-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./measure.js",
  "./deck.json",
  "./manifest.webmanifest",
  "./img/sheeps.jpg",
  "./img/cozyplanes.jpg",
  "./img/air-fireman.jpg",
  "./img/canadair.jpg",
  "./img/fire-command.jpg",
  "./img/tactical-night.jpg",
  "./img/deadline.jpg",
  "./img/adc.jpg",
  "./img/adc-visage.jpg",
  "./img/carillon.jpg",
  "./img/chair.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const isDeck = new URL(event.request.url).pathname.endsWith("deck.json");
  if (isDeck) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
