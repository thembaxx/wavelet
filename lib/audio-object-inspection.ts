import * as THREE from "three";

interface PartSnapshot {
  object: THREE.Object3D;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  direction: THREE.Vector3;
  distance: number;
  rotation: THREE.Vector3;
}

const snapshots = new WeakMap<THREE.Group, PartSnapshot[]>();

/**
 * Prepare a named audio object (turntable, headphones, speaker) for a teardown
 * view. Existing meshes remain in their original hierarchy; only supplied
 * component roots move, so spinning records and stylus pivots remain independent.
 */
export function prepareAudioObjectInspection(
  root: THREE.Group,
  parts: Array<{ name: string; direction?: THREE.Vector3; distance?: number }>,
) {
  const cached = snapshots.get(root);
  if (cached) return cached;
  root.updateMatrixWorld(true);
  const entries = parts.flatMap((part, index) => {
    const object = root.getObjectByName(part.name);
    if (!object) return [];
    const direction =
      part.direction?.clone() ??
      new THREE.Vector3(
        Math.cos(index * 2.399963229728653),
        0.24 + (index % 2) * 0.12,
        Math.sin(index * 2.399963229728653),
      );
    if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
    direction.normalize();
    return [
      {
        object,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        direction,
        distance: THREE.MathUtils.clamp(part.distance ?? 0.28 + index * 0.09, 0, 2),
        rotation: new THREE.Vector3(0, (index % 2 ? -1 : 1) * 0.16, 0),
      },
    ];
  });
  snapshots.set(root, entries);
  return entries;
}

export function setAudioObjectExplodedView(root: THREE.Group, progress: number): number {
  const entries = snapshots.get(root);
  if (!entries?.length) return 0;
  const amount = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const eased = amount * amount * (3 - 2 * amount);
  for (const entry of entries) {
    entry.object.position
      .copy(entry.position)
      .addScaledVector(entry.direction, entry.distance * eased);
    entry.object.quaternion.copy(entry.quaternion);
    entry.object.rotateY(entry.rotation.y * eased);
  }
  root.updateMatrixWorld(true);
  return amount;
}

export function restoreAudioObject(root: THREE.Group): number {
  return setAudioObjectExplodedView(root, 0);
}
