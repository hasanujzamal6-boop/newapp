// ============================================================
// PRATIBHA — Service Worker
// Enables installability + basic offline resilience.
// Caches the app's core files so it can still open even with
// a flaky connection (though live lesson data still needs internet).
// ============================================================

const CACHE_NAME = "pratibha-cache-v1";
const CORE_FILES = [
  "./index.html",
  "./home.html",
  "./subject.html",
  "./video.html",
  "./teacher-home.html",
  "./teacher-subject.html",
  "./css/style.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// On install: pre-cache the core app shell files
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES))
  );
});

// On activate: clean up any old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// On fetch: try the network first (so students always get fresh lesson
// data), and only fall back to the cache if the network fails
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
