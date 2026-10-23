import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES, parsePreferences } from "./studio-preferences.ts";

test("missing or corrupt preferences recover without blocking the studio", () => {
  for (const raw of [null, "", "{broken", "null", "[]", "false"]) {
    assert.deepEqual(parsePreferences(raw), DEFAULT_PREFERENCES);
  }
});

test("stored audio, motion, and canvas choices survive restoration", () => {
  const saved = {
    ...DEFAULT_PREFERENCES,
    theme: "dark",
    muted: true,
    soundEffects: false,
    haptics: false,
    volume: 0.35,
    motion: "reduced",
    compactCanvas: true,
    danceVideo: true,
  };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
});

test("untrusted storage cannot inject invalid modes or out-of-range audio volume", () => {
  assert.equal(parsePreferences('{"volume":5}').volume, 1);
  assert.equal(parsePreferences('{"volume":-5}').volume, 0);
  const restored = parsePreferences(
    '{"theme":"other","motion":"other","muted":"false","volume":"loud","haptics":null}',
  );
  assert.deepEqual(restored, DEFAULT_PREFERENCES);
});
