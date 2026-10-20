/* Wavelet app shell, public catalog, and played-preview caching. No account data is cached. */
const VERSION = 'wavelet-native-v4';
const SHELL = `${VERSION}-shell`;
// Public data and recordings survive app-shell updates within this cache schema.
const CATALOG = 'wavelet-native-v4-catalog';
const MEDIA = 'wavelet-native-v4-media';
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
    await Promise.all(names.filter(name => /^(wavelet-|vinyl-rush-)/.test(name) && ![SHELL, CATALOG, MEDIA].includes(name)).map(name => caches.delete(name)));
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

async function partial(response, range) {
  if (!range) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return response;
  const bytes = await response.arrayBuffer();
  const length = bytes.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1;
  if (start > end || start >= length) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } });
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

async function preview(request) {
  const cache = await caches.open(MEDIA);
  const cached = await cache.match(request.url);
  if (cached) return partial(cached, request.headers.get('range'));
  try {
    const headers = new Headers(request.headers);
    headers.delete('range');
    const response = await fetch(new Request(request, { headers }));
    if (response.status === 200 && response.type !== 'opaque') {
      await cache.put(request.url, response.clone());
      await limitCache(MEDIA, 20);
      return partial(response, request.headers.get('range'));
    }
    return response;
  } catch { return Response.error(); }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/') && !['/api/songs', '/api/artists'].includes(url.pathname))) return;
  if (sameOrigin && request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  if (sameOrigin && ['/api/songs', '/api/artists'].includes(url.pathname)) { event.respondWith(publicCatalog(request)); return; }
  if (request.destination === 'audio' && /\.(itunes\.apple\.com|mzstatic\.com)$/.test(url.hostname)) { event.respondWith(preview(request)); return; }
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
