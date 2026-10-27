import test from "node:test";
import assert from "node:assert/strict";
import { freeGameCatalog } from "./cleared-catalog.ts";
import {
  createSharedChallenge,
  decodeSharedChallenge,
  encodeSharedChallenge,
  resolveSharedChallengeTracks,
  sharedChallengeUrl,
  type SharedChallenge,
} from "./shared-challenge.ts";

function example(seed = 42): SharedChallenge {
  return createSharedChallenge({
    pool: freeGameCatalog(),
    count: 10,
    seed,
    snippet: 3,
    mode: "track",
    difficulty: "club",
    playMode: "quiz-4choice",
  });
}

const rawToken = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

test("a shared challenge round-trips settings and canonical track order", () => {
  const challenge = example();
  const token = encodeSharedChallenge(challenge);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeSharedChallenge(token), challenge);
  const tracks = resolveSharedChallengeTracks(challenge);
  assert.deepEqual(
    tracks.map((track) => track.id),
    challenge.trackIds,
  );
  assert.ok(tracks.every((track) => track.previewUrl === `wavelet-original:${track.id}`));
});

test("seeded selection is deterministic across pool ordering and does not mutate callers", () => {
  const pool = freeGameCatalog();
  const before = structuredClone(pool);
  const settings = { ...example(), pool, count: 10 };
  const first = createSharedChallenge(settings);
  assert.deepEqual(first, createSharedChallenge(settings));
  assert.deepEqual(first, createSharedChallenge({ ...settings, pool: [...pool].reverse() }));
  assert.notDeepEqual(first.trackIds, example(43).trackIds);
  assert.deepEqual(pool, before);
  assert.equal(first.trackIds.length, 10);
  assert.equal(new Set(first.trackIds).size, 10);
  assert.deepEqual(first.trackIds, [
    "golden-hour",
    "low-key",
    "sunset-taxi",
    "quiet-signals",
    "city-steps",
    "after-rain",
    "open-window",
    "glass-sky",
    "satellite-smile",
    "backbeat",
  ]);
});

test("decoder rejects malformed, oversized, unsupported and unrecognised descriptors", () => {
  const base = example();
  const invalid = [
    null,
    [],
    {},
    { ...base, v: 2 },
    { ...base, catalog: "licensed-v1" },
    ...[0, -1, 0x100000000, 1.5, "42"].map((seed) => ({ ...base, seed })),
    { ...base, trackIds: [] },
    { ...base, trackIds: [base.trackIds[0], base.trackIds[0]] },
    { ...base, trackIds: ["unknown"] },
    { ...base, trackIds: ["https://example.com/audio.mp3"] },
    { ...base, trackIds: [...base.trackIds, ...base.trackIds, ...base.trackIds] },
    { ...base, snippet: 4 },
    { ...base, snippet: "3" },
    { ...base, mode: "year" },
    { ...base, difficulty: "easy" },
    { ...base, playMode: "remote" },
    { ...base, previewUrl: "https://example.com/audio.mp3" },
  ];
  for (const value of invalid) assert.equal(decodeSharedChallenge(rawToken(value)), null);
  for (const token of [
    "",
    "a",
    "not+base64",
    "a".repeat(2049),
    "💿",
    encodeSharedChallenge(base) + "=",
  ])
    assert.equal(decodeSharedChallenge(token), null);
  const duplicatedVersion = JSON.stringify(base).replace('"v":1', '"v":2,"v":1');
  assert.equal(decodeSharedChallenge(Buffer.from(duplicatedVersion).toString("base64url")), null);
});

test("all supported settings and uint32 seed boundaries survive sharing", () => {
  for (const seed of [1, 0xffffffff])
    for (const mode of ["track", "artist", "genre"] as const)
      for (const playMode of ["quiz-4choice", "party-30s"] as const)
        for (const snippet of [1, 3, 5, 10, 15, 30] as const)
          for (const difficulty of ["chill", "club", "master"] as const) {
            const challenge = { ...example(seed), mode, playMode, snippet, difficulty };
            assert.deepEqual(decodeSharedChallenge(encodeSharedChallenge(challenge)), challenge);
          }
});

test("link creation removes unrelated query and fragment information", () => {
  const challenge = example();
  const url = new URL(
    sharedChallengeUrl(challenge, "https://wavelet.example/game?email=private#secret"),
  );
  assert.equal(url.pathname, "/game");
  assert.deepEqual([...url.searchParams.keys()], ["challenge"]);
  assert.equal(url.hash, "");
  assert.deepEqual(decodeSharedChallenge(url.searchParams.get("challenge")!), challenge);
  assert.throws(() => sharedChallengeUrl(challenge, "javascript:alert(1)"));
  assert.throws(() => sharedChallengeUrl(challenge, "https://user:password@example.com"));
});

test("creation and resolution reject forged audio and return defensive canonical copies", () => {
  const pool = freeGameCatalog();
  const settings = { ...example(), pool };
  assert.throws(() =>
    createSharedChallenge({
      ...settings,
      pool: [{ ...pool[0], previewUrl: "https://example.com/audio" }],
    }),
  );
  assert.throws(() => createSharedChallenge({ ...settings, pool: [pool[0], pool[0]] }));
  assert.throws(() => createSharedChallenge({ ...settings, count: 25 }));
  assert.throws(() => createSharedChallenge({ ...settings, count: 0 }));
  const challenge = example();
  const tracks = resolveSharedChallengeTracks(challenge);
  tracks[0].title = "Changed";
  tracks[0].rights!.territories.length = 0;
  assert.notEqual(resolveSharedChallengeTracks(challenge)[0].title, "Changed");
  assert.deepEqual(resolveSharedChallengeTracks(challenge)[0].rights!.territories, ["*"]);
  const decoded = decodeSharedChallenge(encodeSharedChallenge(challenge))!;
  decoded.trackIds.reverse();
  assert.notDeepEqual(decoded.trackIds, challenge.trackIds);
});
