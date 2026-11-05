import assert from "node:assert/strict";
import test from "node:test";
import { tactileFeedback, tactilePattern } from "./tactile-feedback.ts";

test("mascot and game feedback uses bounded vibration", () => {
  assert.equal(tactilePattern("tap"), 10);
  assert.deepEqual(tactilePattern("success"), [12, 28, 18]);
});

test("gameplay remains functional without a browser or vibration API", () => {
  assert.equal(tactileFeedback("tap"), false);
});
