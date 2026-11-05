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
  group.name = "wavelet-vinyl-studio";
  const vinyl = new THREE.Group();
  vinyl.name = "wavelet-vinyl-spin";

  // A machined platter stays stationary while the record and label rotate.
  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.39, 1.39, 0.14, 96),
    material("#a3b4a8", 0.78, 0.24),
  );
  platter.rotation.x = Math.PI / 2;
  platter.position.z = -0.095;
  group.add(platter);

  const underside = new THREE.Mesh(
    new THREE.TorusGeometry(1.385, 0.025, 10, 120),
    material("#243e36", 0.72, 0.26),
  );
  underside.position.z = -0.05;
  group.add(underside);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.12, 128),
    new THREE.MeshPhysicalMaterial({
      color: "#11231e",
      metalness: 0.28,
      roughness: 0.22,
      clearcoat: 0.82,
      clearcoatRoughness: 0.16,
    }),
  );
  disc.rotation.x = Math.PI / 2;
  vinyl.add(disc);

  // A single instanced draw call replaces dozens of separate groove meshes.
  const grooveCount = 43;
  const grooveMesh = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, 0.003, 4, 128),
    new THREE.MeshStandardMaterial({
      color: "#aecbb4",
      metalness: 0.64,
      roughness: 0.28,
      vertexColors: false,
    }),
    grooveCount,
  );
  const transform = new THREE.Matrix4();
  for (let index = 0; index < grooveCount; index++) {
    const radius = 0.53 + index * 0.016;
    transform.makeScale(radius, radius, 1);
    transform.setPosition(0, 0, 0.068);
    grooveMesh.setMatrixAt(index, transform);
    grooveMesh.setColorAt(
      index,
      new THREE.Color(index % 8 === 0 ? "#8ab59d" : index % 3 === 0 ? "#456b59" : "#24463a"),
    );
  }
  grooveMesh.instanceMatrix.needsUpdate = true;
  vinyl.add(grooveMesh);

  const runout = new THREE.Mesh(
    new THREE.TorusGeometry(0.485, 0.006, 6, 96),
    material("#658d77", 0.52, 0.28),
  );
  runout.position.z = 0.073;
  vinyl.add(runout);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.14, 72),
    material("#deedc5", 0.08, 0.44),
  );
  label.rotation.x = Math.PI / 2;
  vinyl.add(label);

  const labelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.375, 0.009, 8, 96),
    material("#176b56", 0.22, 0.32),
  );
  labelRing.position.z = 0.073;
  vinyl.add(labelRing);

  // The logo is part of the rotating record rather than a screen-space decal.
  const logoCurve = new THREE.CatmullRomCurve3(
    [
      [-0.27, 0.12, 0.078],
      [-0.17, -0.15, 0.078],
      [0, 0.19, 0.078],
      [0.17, -0.15, 0.078],
      [0.27, 0.12, 0.078],
    ].map((point) => new THREE.Vector3(...(point as [number, number, number]))),
  );
  vinyl.add(
    new THREE.Mesh(new THREE.TubeGeometry(logoCurve, 40, 0.024, 8, false), material("#176b56")),
  );
  group.add(vinyl);

  // The spindle and stylus are fixed parts; they must not spin with the vinyl.
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.043, 0.055, 0.22, 24),
    material("#bdcbc0", 0.89, 0.18),
  );
  spindle.rotation.x = Math.PI / 2;
  spindle.position.z = 0.1;
  group.add(spindle);

  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.18, 32),
    material("#bdcbc0", 0.88, 0.19),
  );
  pivot.rotation.x = Math.PI / 2;
  pivot.position.set(1.3, 1.13, 0.13);
  group.add(pivot);

  const arm = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.3, 1.12, 0.24),
    new THREE.Vector3(1.27, 0.86, 0.23),
    new THREE.Vector3(1.04, 0.61, 0.24),
    new THREE.Vector3(0.84, 0.39, 0.24),
  ]);
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(arm, 32, 0.033, 10, false),
      material("#d7ded5", 0.8, 0.2),
    ),
  );
  const cartridge = rounded(0.22, 0.13, 0.14, "#263c34", 0.035);
  cartridge.name = "wavelet-vinyl-cartridge";
  cartridge.position.set(0.81, 0.35, 0.26);
  cartridge.rotation.z = -0.38;
  group.add(cartridge);

  const stylus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.012, 0.12, 8),
    material("#9faea5", 0.76, 0.22),
  );
  stylus.rotation.x = Math.PI / 2;
  stylus.position.set(0.81, 0.35, 0.17);
  group.add(stylus);
  return group;
}

export function createWelcomeHeadphones() {
  const group = new THREE.Group();
  group.name = "wavelet-headphones";

  // Powder-coated metal crown and soft underside, both following a real arc.
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1.04, 0.12, 20, 100, Math.PI),
    material("#176b56", 0.54, 0.27),
  );
  band.name = "headphone-headband";
  group.add(band);
  const lining = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.074, 12, 100, Math.PI),
    material("#c9d7b8", 0.04, 0.87),
  );
  lining.position.z = 0.07;
  group.add(lining);

  for (const direction of [-1, 1] as const) {
    const stem = rounded(0.14, 0.66, 0.12, "#b8cabf", 0.045);
    stem.name = "headphone-height-slider";
    stem.position.set(direction * 1.04, -0.22, 0);
    group.add(stem);

    // The hinge owns every shell, grille and ear pad: they move as one assembly.
    const hinge = new THREE.Group();
    hinge.name =
      direction < 0 ? "wavelet-headphones-left-earcup" : "wavelet-headphones-right-earcup";
    hinge.position.set(direction * 1.06, -0.63, 0);
    group.add(hinge);

    const shell = new THREE.Mesh(
      new RoundedBoxGeometry(0.6, 0.91, 0.48, 5, 0.23),
      new THREE.MeshPhysicalMaterial({
        color: "#176b56",
        metalness: 0.32,
        roughness: 0.24,
        clearcoat: 0.9,
        clearcoatRoughness: 0.2,
      }),
    );
    shell.name = "headphone-acoustic-shell";
    shell.rotation.z = direction * -0.06;
    hinge.add(shell);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.012, 8, 80),
      material("#aec7b5", 0.82, 0.19),
    );
    rim.scale.set(0.73, 1.15, 1);
    rim.position.z = 0.258;
    hinge.add(rim);

    const grill = rounded(0.41, 0.7, 0.035, "#234f3d", 0.16);
    grill.name = "headphone-speaker-grille";
    grill.position.z = 0.26;
    hinge.add(grill);

    // One GPU instanced grille per cup keeps the perforations crisp up close.
    const holes: { x: number; y: number }[] = [];
    for (let y = -0.28; y <= 0.28; y += 0.055) {
      for (let x = -0.16; x <= 0.16; x += 0.055) {
        if ((x / 0.19) ** 2 + (y / 0.315) ** 2 < 0.92) holes.push({ x, y });
      }
    }
    const grille = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.012, 8, 6),
      new THREE.MeshStandardMaterial({
        color: "#142c25",
        metalness: 0.25,
        roughness: 0.82,
      }),
      holes.length,
    );
    grille.name = "headphone-batched-grille";
    const transform = new THREE.Matrix4();
    holes.forEach((hole, index) => {
      transform.makeTranslation(hole.x, hole.y, 0.282);
      grille.setMatrixAt(index, transform);
    });
    grille.instanceMatrix.needsUpdate = true;
    hinge.add(grille);

    // The inward-facing cushion is distinct from the polished exterior.
    const cushion = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.7, 0.46, 4, 0.1),
      new THREE.MeshPhysicalMaterial({
        color: "#102721",
        roughness: 0.92,
        metalness: 0,
        clearcoat: 0,
      }),
    );
    cushion.name = "headphone-memory-foam-pad";
    cushion.position.set(-direction * 0.265, 0, 0.015);
    hinge.add(cushion);

    const hingePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.2, 24),
      material("#cedbcf", 0.8, 0.24),
    );
    hingePin.rotation.z = Math.PI / 2;
    hingePin.position.set(0, 0.46, 0);
    hinge.add(hingePin);

    const cableJack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.13, 16),
      material("#a3bdae", 0.75, 0.24),
    );
    cableJack.position.set(0, -0.45, 0.08);
    hinge.add(cableJack);
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
