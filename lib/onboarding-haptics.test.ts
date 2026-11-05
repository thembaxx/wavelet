import assert from "node:assert/strict";
import test from "node:test";
import { onboardingHaptic } from "./onboarding-haptics.ts";

test("non-vibrating browsers and server render stay functional", () => {
  assert.equal(onboardingHaptic(), false);
});
