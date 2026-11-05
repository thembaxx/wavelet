import assert from "node:assert/strict";
import test from "node:test";
import { InstancedMesh, Vector3 } from "three";
import { createWelcomeRecord } from "./onboarding-objects.ts";

test("the vinyl is an authored 3D assembly with batched grooves", () => {
  const record = createWelcomeRecord();
  const spinning = record.getObjectByName("wavelet-vinyl-spin");
  const cartridge = record.getObjectByName("wavelet-vinyl-cartridge");
  assert.ok(spinning, "the vinyl must be independently rotatable");
  assert.ok(cartridge, "the stationary tonearm needs its own real 3D mesh");
  const grooves: InstancedMesh[] = [];
  spinning.traverse((object) => {
    if (object instanceof InstancedMesh) grooves.push(object);
  });
  assert.equal(grooves.length, 1);
  assert.equal(grooves[0]?.count, 43);
  assert.ok(grooves[0]?.instanceColor, "grooves contain physically varied colors");
});

test("the stylus stays physically fixed while the record rotates", () => {
  const record = createWelcomeRecord();
  const disc = record.getObjectByName("wavelet-vinyl-spin");
  const cartridge = record.getObjectByName("wavelet-vinyl-cartridge");
  assert.ok(disc && cartridge);
  record.updateMatrixWorld(true);
  const initial = cartridge.getWorldPosition(new Vector3());
  disc.rotation.z = Math.PI * 0.5;
  record.updateMatrixWorld(true);
  const after = cartridge.getWorldPosition(new Vector3());
  assert.ok(initial.distanceTo(after) < 0.00001);
});
