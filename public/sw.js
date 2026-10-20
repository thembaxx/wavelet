const CACHE_NAME = 'vinyl-rush-365-pwa-v2';
const PRECACHE_URLS = [
  '/',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/assets/aistudio/IMG_5611_8f13d014.jpeg',
  '/assets/aistudio/IMG_5644_58cdf86c.jpeg',
  '/assets/aistudio/IMG_5583_ad7fd435.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);

  // Cache-first for static assets, images, and audio previews for offline resilience
  if (
    reqUrl.pathname.startsWith('/assets/') ||
    reqUrl.pathname.endsWith('.png') ||
    reqUrl.pathname.endsWith('.jpeg') ||
    reqUrl.pathname.endsWith('.svg') ||
    reqUrl.hostname.includes('mzstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Network-first with offline fallback for pages and API routes
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
