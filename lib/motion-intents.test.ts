import test from "node:test";
import assert from "node:assert/strict";
import { getMotionIntent, type MotionIntent } from "./motion-intents.ts";

const intents: MotionIntent[] = ["setup", "dialog", "result"];

test("every intent uses bounded animation and zero motion when requested", () => {
  for (const intent of intents) {
    const full = getMotionIntent(intent, false);
    const reduced = getMotionIntent(intent, true);
    assert.ok(full.duration > 0 && full.duration <= 0.3, intent);
    assert.ok(full.exitDuration <= 0.2, intent);
    assert.equal(reduced.duration, 0);
    assert.equal(reduced.exitDuration, 0);
    assert.equal(reduced.y, 0);
    assert.equal(reduced.scale, 1);
    assert.equal(reduced.stagger, 0);
    assert.equal(reduced.delay, 0);
  }
});

test("configuration transitions do not stagger under reduced motion", () => {
  const normal = getMotionIntent("setup", false);
  assert.ok(normal.stagger > 0);
  assert.ok(normal.delay > 0);
  assert.equal(getMotionIntent("setup", true).stagger, 0);
});
