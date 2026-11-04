import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("home page has one in-flow multiplayer action, not a fixed overlay", () => {
  const page = source("app/page.tsx");
  const dock = source("components/GameSetup.tsx");
  const friends = source("components/MultiplayerEntry.tsx");
  assert.doesNotMatch(page, /<MultiplayerEntry/);
  assert.match(dock, /className="setup-actions"/);
  assert.match(dock, /<MultiplayerEntry\s*\/>/);
  assert.doesNotMatch(friends, /fixed bottom-/);
  assert.match(friends, /href="\/multiplayer"/);
});

test("shared challenges are requested on demand and retain offline rights gating", () => {
  const game = source("components/WaveletGame.tsx");
  const dock = source("components/GameSetup.tsx");
  assert.match(game, /<StudioDialog[\s\S]*open=\{shareChallengeOpen\}/);
  assert.match(dock, /onShareChallenge/);
  assert.match(game, /songPool\.every\(isFreeGameTrack\)/);
  assert.match(game, /handleSelectFilterValue\("genre", "Originals"\)/);
  assert.match(game, /challengeToStart &&/);
});

test("iOS standalone shell fills the dynamic viewport and protects controls", () => {
  const shell = source("app/native-shell.css");
  const mobile = source("app/mobile-ux.css");
  assert.match(shell, /height:\s*100dvh/);
  assert.match(shell, /padding-top:\s*calc\(var\(--wavelet-safe-top\) \+ 12px\)/);
  assert.match(shell, /padding-bottom:\s*calc\(var\(--wavelet-safe-bottom\) \+ 16px\)/);
  assert.match(mobile, /grid-template-columns:\s*minmax/);
  assert.match(mobile, /font-size:\s*16px/);
});

test("studio retains three distinct interactive 3D mascot accessories", () => {
  const scene = source("components/IsometricVinylStage.tsx");
  for (const detail of ["catWhiskers", "pebblePin", "sproutLeaves"]) {
    assert.match(scene, new RegExp(detail + "\\.visible = true"));
    assert.match(scene, new RegExp(detail + "\\.visible = false"));
  }
  assert.match(scene, /InstancedMesh\(strobeGeo, strobeMat, 48\)/);
  assert.match(scene, /scene\.traverse\(\(object\)/);
});
