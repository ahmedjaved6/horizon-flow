const CACHE_NAME = 'horizon-flow-v1';

// Install: Skip waiting to ensure the new SW activates immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: Claim clients to start controlling pages immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch: Network First strategy (safest for production updates)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // SAFETY EXCLUSIONS:
  // 1. Ignore Supabase calls (ensure realtime data is never cached)
  // 2. Ignore non-GET requests (mutations)
  // 3. Ignore browser extensions
  if (
    url.hostname.includes('supabase.co') ||
    request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // If network fetch succeeds, cache the response for offline fallback
        // We allow caching of opaque responses (CDN scripts like Tailwind) and standard 200s
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails, try to return from cache (App Shell behavior)
        return caches.match(request);
      })
  );
});