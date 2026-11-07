import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import {
  createSceneInspectionController,
  sceneTimelineProgress,
} from "./scene-inspection.ts";

test("turntable components separate deterministically and can be reassembled", () => {
  const root = new Group();
  const platter = new Mesh(new BoxGeometry(2, 0.1, 2), new MeshStandardMaterial());
  const tonearm = new Mesh(new BoxGeometry(0.8, 0.08, 0.08), new MeshStandardMaterial());
  platter.position.x = -0.7;
  tonearm.position.set(0.7, 0.2, 0);
  root.add(platter, tonearm);
  const original = tonearm.position.clone();
  const inspection = createSceneInspectionController(root, { pinnedNames: ["platter"] });

  inspection.setProgress(1);
  assert.deepEqual(platter.position.toArray(), [-0.7, 0, 0]);
  assert.ok(tonearm.position.distanceTo(original) > 0);
  inspection.dispose();
  assert.deepEqual(tonearm.position.toArray(), original.toArray());
});

test("timeline progress is clamped for frame-accurate review", () => {
  assert.equal(sceneTimelineProgress(125, 500), 0.25);
  assert.equal(sceneTimelineProgress(0, 500), 0);
  assert.equal(sceneTimelineProgress(600, 500), 1);
});
