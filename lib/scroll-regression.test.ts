import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Fast source-level regressions for the scroll containers and touch actions.
// Real device gesture behavior still needs a browser-based smoke test.
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("onboarding content remains scrollable when its dialog is height-constrained", () => {
  const css = source("app/globals.css");
  assert.match(css, /\.onboarding-dialog \.studio-dialog-panel\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.onboarding-canvas\s*\{[^}]*touch-action:\s*pan-y/);
});

test("3D scenes permit vertical page gestures without losing drag cancellation", () => {
  const stage = source("components/IsometricVinylStage.tsx");
  const intro = source("components/onboarding/OnboardingScene.tsx");
  assert.match(stage, /className="[^"]*touch-pan-y[^"]*"/);
  assert.match(stage, /addEventListener\(['"]pointercancel['"],\s*handlePointerUp\)/);
  assert.match(stage, /removeEventListener\(['"]pointercancel['"],\s*handlePointerUp\)/);
  assert.match(intro, /event\.type !== ['"]pointercancel['"] && drag/);
});

test("session summary scrolls its content without losing the action buttons", () => {
  const game = source("components/WaveletGame.tsx");
  assert.match(game, /max-h-\[88dvh\]/);
  assert.match(
    game,
    /overflow-y-auto overscroll-y-contain pr-1"\s+role="region"\s+aria-label="Session results and played tracks"/,
  );
  assert.match(game, /mt-4 grid shrink-0 grid-cols-2/);
});
