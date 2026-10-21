/* App-shell caching only; gameplay clips and licensed catalogue responses are never cached. */
const VERSION = 'wavelet-native-v5';
const SHELL = `${VERSION}-shell`;
const CATALOG = 'wavelet-native-v5-discovery';
const ONBOARDING_ASSETS = [];
const CORE = ['/', '/offline.html', '/icon.svg', '/icon.png', '/brand/wavelet-icon-96.webp', '/apple-icon.png', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-512x512.png', ...ONBOARDING_ASSETS];
const OPTIONAL = ['/assets/aistudio/IMG_5611_8f13d014.jpeg', '/assets/aistudio/IMG_5644_58cdf86c.jpeg', '/assets/aistudio/IMG_5583_ad7fd435.jpeg', ...['felt', 'nib', 'clasp', 'unclasp', 'bloom', 'shrug'].map(name => `/sounds/${name}.wav`)];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(CORE);
    const home = await cache.match('/');
    const html = await home.text();
    const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+|\/(?:apple-icon|icon)\.png[^"<>]*)"/g)].map(match => match[1].replace(/&amp;/g, '&')))];
    await Promise.all(assets.map(async path => { const response = await fetch(path); if (!response.ok) throw new Error('App shell unavailable'); await cache.put(path, response); }));
    await Promise.allSettled(OPTIONAL.map(path => cache.add(path)));
  })());
});

self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => /^(wavelet-|vinyl-rush-)/.test(name) && ![SHELL, CATALOG].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function limitCache(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(key => cache.delete(key)));
}

async function navigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname === '/') {
      const cache = await caches.open(SHELL);
      await cache.put('/', response.clone());
    }
    return response;
  } catch {
    return await caches.match(new URL(request.url).pathname === '/' ? '/' : '/offline.html') || Response.error();
  }
}

async function publicCatalog(request) {
  const cache = await caches.open(CATALOG);
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      await cache.put(request, response.clone());
      await limitCache(CATALOG, 40);
    }
    return response;
  } catch {
    return await cache.match(request) || new Response(JSON.stringify({ tracks: [], artists: [], offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/') && !['/api/music/discover', '/api/artists'].includes(url.pathname))) return;
  if (sameOrigin && request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  if (sameOrigin && ['/api/music/discover', '/api/artists'].includes(url.pathname)) { event.respondWith(publicCatalog(request)); return; }
  if (sameOrigin && (url.pathname.startsWith('/_next/static/') || /\.(png|webp|jpeg|svg|woff2|wav)$/.test(url.pathname))) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const cached = await cache.match(request);
      if (cached) return cached;
      try { const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; }
      catch { return Response.error(); }
    })());
  }
});
