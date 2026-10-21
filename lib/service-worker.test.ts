import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(new URL('../scripts/service-worker.template.js', import.meta.url), 'utf8');

function worker() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const entries = new Map<string, Response>();
  const context = createContext({
    Response, Request, Headers, URL, console,
    self: { location: { origin: 'https://wavelet.test' }, addEventListener: (name: string, listener: (event: Record<string, unknown>) => void) => listeners.set(name, listener) },
    caches: { open: async () => ({
      match: async (request: string | Request) => entries.get(typeof request === 'string' ? request : request.url)?.clone(),
      put: async (request: string | Request, response: Response) => entries.set(typeof request === 'string' ? request : request.url, response),
      keys: async () => [...entries.keys()].map(url => ({ url })),
      delete: async (request: { url: string }) => entries.delete(request.url),
    }) },
    fetch: async () => new Response(new Uint8Array([10, 20, 30, 40, 50]), { headers: { 'Content-Type': 'audio/mp4' } }),
  });
  runInContext(source, context);
  return { context, entries, listeners };
}

test('service worker leaves authentication, private APIs, and non-GET requests to the network', () => {
  const { listeners } = worker();
  for (const path of ['/api/auth/spotify/url', '/api/profile', '/auth/callback', '/api/account']) {
    let intercepted = false;
    listeners.get('fetch')!({ request: { method: 'GET', url: `https://wavelet.test${path}`, mode: 'navigate' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, path);
  }
  let intercepted = false;
  listeners.get('fetch')!({ request: { method: 'POST', url: 'https://wavelet.test/api/songs' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});

test('licensed gameplay catalog and third-party audio never enter the service worker cache', () => {
  const { listeners, entries } = worker();
  for (const url of [
    'https://wavelet.test/api/songs?usage=solo',
    'https://wavelet.test/api/songs?usage=multiplayer',
    'https://audio-ssl.itunes.apple.com/song.m4a',
    'https://approved.example/media/signed-audio.mp3',
  ]) {
    let intercepted = false;
    listeners.get('fetch')!({
      request: { method: 'GET', url, destination: 'audio', mode: 'cors' },
      respondWith: () => { intercepted = true; },
    });
    assert.equal(intercepted, false, url);
  }
  assert.equal(entries.size, 0);
});

test('public discovery metadata remains eligible for offline caching but gameplay audio does not', () => {
  const { listeners } = worker();
  for (const path of ['/api/artists', '/api/music/discover']) {
    let intercepted = false;
    listeners.get('fetch')!({ request: { method: 'GET', url: 'https://wavelet.test' + path, mode: 'cors' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, true);
  }
});
