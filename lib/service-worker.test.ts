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
  const entries = new Map<string, Response>();
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
        match: async (request: string | Request) =>
          entries.get(typeof request === "string" ? request : request.url)?.clone(),
        put: async (request: string | Request, response: Response) =>
          entries.set(typeof request === "string" ? request : request.url, response),
        keys: async () => [...entries.keys()].map((url) => ({ url })),
        delete: async (request: { url: string }) => entries.delete(request.url),
      }),
    },
    fetch: async () =>
      new Response(new Uint8Array([10, 20, 30, 40, 50]), {
        headers: { "Content-Type": "audio/mp4" },
      }),
  });
  runInContext(source, context);
  return { context, entries, listeners };
}

test("service worker leaves authentication, private APIs, and non-GET requests to the network", () => {
  const { listeners } = worker();
  for (const path of ["/api/auth/spotify/url", "/api/profile", "/auth/callback", "/api/account"]) {
    let intercepted = false;
    listeners.get("fetch")!({
      request: { method: "GET", url: `https://wavelet.test${path}`, mode: "navigate" },
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
});

test("cached song previews serve exact byte ranges, suffix ranges, and unsatisfiable ranges", async () => {
  const { context } = worker();
  const read = (range: string) =>
    runInContext(
      `partial(new Response(new Uint8Array([10,20,30,40,50]), { headers: { 'Content-Type': 'audio/mp4' } }), ${JSON.stringify(range)})`,
      context,
    ) as Promise<Response>;
  const middle = await read("bytes=1-3");
  assert.equal(middle.status, 206);
  assert.equal(middle.headers.get("Content-Range"), "bytes 1-3/5");
  assert.equal(middle.headers.get("Content-Type"), "audio/mp4");
  assert.deepEqual([...new Uint8Array(await middle.arrayBuffer())], [20, 30, 40]);
  assert.deepEqual([...new Uint8Array(await (await read("bytes=-2")).arrayBuffer())], [40, 50]);
  assert.deepEqual([...new Uint8Array(await (await read("bytes=3-")).arrayBuffer())], [40, 50]);
  assert.equal((await read("bytes=50-60")).status, 416);
});

test("preview cache stores a complete clip so subsequent ranges work without the network", async () => {
  const { context, entries } = worker();
  context.request = new Request("https://audio-ssl.itunes.apple.com/song.m4a", {
    headers: { Range: "bytes=1-2" },
  });
  const first = (await runInContext("preview(request)", context)) as Response;
  assert.equal(first.status, 206);
  assert.equal(entries.size, 1);
  context.fetch = async () => {
    throw new Error("Offline");
  };
  context.request = new Request("https://audio-ssl.itunes.apple.com/song.m4a", {
    headers: { Range: "bytes=3-4" },
  });
  const offline = (await runInContext("preview(request)", context)) as Response;
  assert.deepEqual([...new Uint8Array(await offline.arrayBuffer())], [40, 50]);
});
