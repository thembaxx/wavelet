import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { prepareAudioObjectInspection, restoreAudioObject, setAudioObjectExplodedView } from "./audio-object-inspection.ts";

test("audio object teardown separates named components and restores them", () => {
  const root = new THREE.Group();
  const left = new THREE.Group();
  const right = new THREE.Group();
  left.name = "left-earcup";
  right.name = "right-earcup";
  root.add(left, right);
  prepareAudioObjectInspection(root, [
    { name: "left-earcup", direction: new THREE.Vector3(-1, 0, 0), distance: 0.5 },
    { name: "right-earcup", direction: new THREE.Vector3(1, 0, 0), distance: 0.5 },
  ]);
  setAudioObjectExplodedView(root, 1);
  assert.ok(left.position.x < 0);
  assert.ok(right.position.x > 0);
  restoreAudioObject(root);
  assert.deepEqual(left.position.toArray(), [0, 0, 0]);
  assert.deepEqual(right.position.toArray(), [0, 0, 0]);
});

test("audio object inspection ignores missing part names and clamps progress", () => {
  const root = new THREE.Group();
  root.add(new THREE.Group());
  assert.equal(prepareAudioObjectInspection(root, [{ name: "missing" }]).length, 0);
  assert.equal(setAudioObjectExplodedView(root, 2), 0);
});
