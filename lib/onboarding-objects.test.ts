import assert from "node:assert/strict";
import test from "node:test";
import { InstancedMesh, Vector3 } from "three";
import { createWelcomeHeadphones, createWelcomeRecord } from "./onboarding-objects.ts";

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

test("over-ear headphones use articulated physical shells and batched perforations", () => {
  const headphones = createWelcomeHeadphones();
  const left = headphones.getObjectByName("wavelet-headphones-left-earcup");
  const right = headphones.getObjectByName("wavelet-headphones-right-earcup");
  assert.ok(left && right);
  for (const cup of [left, right]) {
    assert.ok(cup.getObjectByName("headphone-acoustic-shell"));
    assert.ok(cup.getObjectByName("headphone-memory-foam-pad"));
    const grille = cup.getObjectByName("headphone-batched-grille");
    assert.ok(grille instanceof InstancedMesh);
    assert.ok(grille.count >= 12);
    assert.ok(grille.count <= 120, "grille budget stays bounded");
  }
});

test("left and right earcups pivot independently without moving the headband", () => {
  const headphones = createWelcomeHeadphones();
  const left = headphones.getObjectByName("wavelet-headphones-left-earcup");
  const band = headphones.getObjectByName("headphone-headband");
  assert.ok(left && band);
  headphones.updateMatrixWorld(true);
  const before = band.getWorldPosition(new Vector3());
  left.rotation.y = 0.12;
  headphones.updateMatrixWorld(true);
  const after = band.getWorldPosition(new Vector3());
  assert.ok(before.distanceTo(after) < 0.00001);
});
