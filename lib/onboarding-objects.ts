import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const material = (color: string, metalness = 0.18, roughness = 0.3) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  });

function rounded(width: number, height: number, depth: number, color: string, radius = 0.15) {
  return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material(color));
}

export function createWelcomeRecord() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.34, 1.34, 0.13, 96),
    material("#102721", 0.45, 0.24),
  );
  disc.rotation.x = Math.PI / 2;
  group.add(disc);
  for (let index = 0; index < 22; index++) {
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(0.53 + index * 0.033, 0.004, 4, 96),
      material(index % 6 === 0 ? "#608773" : "#315747", 0.65, 0.25),
    );
    groove.position.z = 0.071;
    group.add(groove);
  }
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.34, 0.027, 12, 100),
    material("#b4dda4", 0.5),
  );
  group.add(rim);
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.145, 64),
    material("#deedc5", 0.1),
  );
  label.rotation.x = Math.PI / 2;
  group.add(label);
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.067, 0.067, 0.155, 32),
    material("#102721", 0.6),
  );
  pin.rotation.x = Math.PI / 2;
  group.add(pin);
  // A small branded ribbon, modeled in 3D rather than rendered as an interface icon.
  const curve = new THREE.CatmullRomCurve3(
    [
      [-0.28, 0.13, 0.1],
      [-0.17, -0.16, 0.1],
      [0, 0.2, 0.1],
      [0.17, -0.16, 0.1],
      [0.28, 0.13, 0.1],
    ].map((point) => new THREE.Vector3(...(point as [number, number, number]))),
  );
  group.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.025, 8, false), material("#176b56")),
  );
  return group;
}

export function createWelcomeHeadphones() {
  const group = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.145, 20, 80, Math.PI),
    material("#176b56", 0.28),
  );
  group.add(band);
  const padding = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.08, 12, 60, Math.PI),
    material("#deedc5", 0.05, 0.6),
  );
  padding.position.z = 0.08;
  group.add(padding);
  for (const direction of [-1, 1]) {
    const stem = rounded(0.13, 0.7, 0.16, "#bbcec0", 0.05);
    stem.position.set(direction * 1.02, -0.24, 0);
    group.add(stem);
    const cup = rounded(0.59, 0.87, 0.5, "#176b56", 0.22);
    cup.position.set(direction * 1.05, -0.64, 0);
    cup.rotation.z = direction * -0.08;
    group.add(cup);
    const cushion = rounded(0.22, 0.67, 0.42, "#102721", 0.1);
    cushion.position.set(direction * 0.78, -0.64, 0.01);
    group.add(cushion);
    const detail = rounded(0.27, 0.04, 0.03, "#deedc5", 0.015);
    detail.position.set(direction * 1.05, -0.64, 0.265);
    group.add(detail);
  }
  return group;
}

export function createWelcomeCrate() {
  const group = new THREE.Group();
  for (let index = 0; index < 3; index++) {
    const sleeve = new THREE.Group();
    const colors = ["#deedc5", "#176b56", "#f7f8f2"];
    sleeve.add(rounded(1.65, 1.85, 0.17, colors[index], 0.12));
    const vinyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.035, 64),
      material("#102721", 0.4),
    );
    vinyl.rotation.x = Math.PI / 2;
    vinyl.position.set(0, 0.12, 0.11);
    sleeve.add(vinyl);
    const label = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 40),
      material(index === 1 ? "#deedc5" : "#176b56"),
    );
    label.position.set(0, 0.12, 0.133);
    sleeve.add(label);
    for (let line = 0; line < 2; line++) {
      const bar = rounded(
        line ? 0.35 : 0.65,
        0.045,
        0.02,
        index === 1 ? "#deedc5" : "#176b56",
        0.015,
      );
      bar.position.set(-0.28 + (line ? -0.15 : 0), -0.61 - line * 0.12, 0.1);
      sleeve.add(bar);
    }
    sleeve.position.set((index - 1) * 0.65, (index - 1) * 0.08, (index - 1) * 0.38);
    sleeve.rotation.set(0, -0.18, (index - 1) * -0.12);
    group.add(sleeve);
  }
  return group;
}
