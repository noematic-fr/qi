const CACHE = "pioche-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./measure.js",
  "./deck.json",
  "./manifest.webmanifest",
  "./img/sheeps.jpg",
  "./img/air-fireman.jpg",
  "./img/canadair.jpg",
  "./img/fire-command.jpg",
  "./img/tactical-night.jpg",
  "./img/deadline.jpg",
  "./img/adc.jpg",
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
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
