import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const source = readFileSync(
  new URL("../scripts/service-worker.template.js", import.meta.url),
  "utf8",
);
function worker() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const context = createContext({
    Response,
    Request,
    Headers,
    URL,
    console,
    self: {
      location: { origin: "https://wavelet.test" },
      addEventListener: (name: string, listener: (event: Record<string, unknown>) => void) =>
        listeners.set(name, listener),
    },
    caches: {
      open: async () => ({
        match: async () => undefined,
        put: async () => {},
        keys: async () => [],
        delete: async () => {},
      }),
    },
    fetch: async () =>
      new Response(JSON.stringify({ tracks: [] }), {
        headers: { "Content-Type": "application/json" },
      }),
  });
  runInContext(source, context);
  return { listeners };
}

test("service worker leaves auth, private API, writes and external audio outside the cache", () => {
  const { listeners } = worker();
  for (const path of ["/api/auth/spotify/url", "/api/profile", "/auth/callback"]) {
    let intercepted = false;
    listeners.get("fetch")!({
      request: { method: "GET", url: "https://wavelet.test" + path, mode: "navigate" },
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false, path);
  }
  let intercepted = false;
  listeners.get("fetch")!({
    request: { method: "POST", url: "https://wavelet.test/api/songs" },
    respondWith: () => {
      intercepted = true;
    },
  });
  assert.equal(intercepted, false);
  for (const host of ["audio-ssl.itunes.apple.com", "audio.example.com"]) {
    let captured = false;
    listeners.get("fetch")!({
      request: { method: "GET", url: "https://" + host + "/track.m4a", destination: "audio" },
      respondWith: () => {
        captured = true;
      },
    });
    assert.equal(captured, false, host);
  }
  assert.ok(source.includes("wavelet-native-v5"));
  assert.equal(source.includes("async function preview("), false);
});
