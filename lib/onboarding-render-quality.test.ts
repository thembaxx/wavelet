import assert from "node:assert/strict";
import test from "node:test";
import { isSoftwareWebGL, onboardingRenderQuality } from "./onboarding-render-quality.ts";

test("desktop retina stays sharp without excessive GPU supersampling", () => {
  assert.deepEqual(onboardingRenderQuality(3, false, false), { dpr: 2, antialias: true });
  assert.deepEqual(onboardingRenderQuality(1, false, false), { dpr: 1, antialias: true });
});

test("mobile and software renderers cap graphics work conservatively", () => {
  assert.deepEqual(onboardingRenderQuality(3, true, false), { dpr: 1.5, antialias: false });
  assert.deepEqual(onboardingRenderQuality(3, false, true), { dpr: 1, antialias: false });
  assert.equal(isSoftwareWebGL("ANGLE SwiftShader Device"), true);
  assert.equal(isSoftwareWebGL("llvmpipe"), true);
  assert.equal(isSoftwareWebGL("Apple GPU"), false);
});
