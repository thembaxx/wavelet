import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const material = (color: string, metalness = .18, roughness = .3) => new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: 1, clearcoatRoughness: .18 });

function rounded(width: number, height: number, depth: number, color: string, radius = .15) {
  return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material(color));
}

export function createWelcomeRecord() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, .13, 96), material('#102721', .45, .24));
  disc.rotation.x = Math.PI / 2;
  group.add(disc);
  for (let index = 0; index < 22; index++) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(.53 + index * .033, .004, 4, 96), material(index % 6 === 0 ? '#608773' : '#315747', .65, .25));
    groove.position.z = .071;
    group.add(groove);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.34, .027, 12, 100), material('#b4dda4', .5));
  group.add(rim);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .145, 64), material('#deedc5', .1));
  label.rotation.x = Math.PI / 2;
  group.add(label);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.067, .067, .155, 32), material('#102721', .6));
  pin.rotation.x = Math.PI / 2;
  group.add(pin);
  // A small branded ribbon, modeled in 3D rather than rendered as an interface icon.
  const curve = new THREE.CatmullRomCurve3([[-.28,.13,.1],[-.17,-.16,.1],[0,.2,.1],[.17,-.16,.1],[.28,.13,.1]].map(point => new THREE.Vector3(...point as [number, number, number])));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .025, 8, false), material('#176b56')));
  return group;
}

export function createWelcomeHeadphones() {
  const group = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.02, .145, 20, 80, Math.PI), material('#176b56', .28));
  group.add(band);
  const padding = new THREE.Mesh(new THREE.TorusGeometry(.98, .08, 12, 60, Math.PI), material('#deedc5', .05, .6));
  padding.position.z = .08;
  group.add(padding);
  for (const direction of [-1, 1]) {
    const stem = rounded(.13, .7, .16, '#bbcec0', .05);
    stem.position.set(direction * 1.02, -.24, 0);
    group.add(stem);
    const cup = rounded(.59, .87, .5, '#176b56', .22);
    cup.position.set(direction * 1.05, -.64, 0);
    cup.rotation.z = direction * -.08;
    group.add(cup);
    const cushion = rounded(.22, .67, .42, '#102721', .1);
    cushion.position.set(direction * .78, -.64, .01);
    group.add(cushion);
    const detail = rounded(.27, .04, .03, '#deedc5', .015);
    detail.position.set(direction * 1.05, -.64, .265);
    group.add(detail);
  }
  return group;
}

export function createWelcomeCrate() {
  const group = new THREE.Group();
  for (let index = 0; index < 3; index++) {
    const sleeve = new THREE.Group();
    const colors = ['#deedc5', '#176b56', '#f7f8f2'];
    sleeve.add(rounded(1.65, 1.85, .17, colors[index], .12));
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, .035, 64), material('#102721', .4));
    vinyl.rotation.x = Math.PI / 2;
    vinyl.position.set(0, .12, .11);
    sleeve.add(vinyl);
    const label = new THREE.Mesh(new THREE.CircleGeometry(.19, 40), material(index === 1 ? '#deedc5' : '#176b56'));
    label.position.set(0, .12, .133);
    sleeve.add(label);
    for (let line = 0; line < 2; line++) {
      const bar = rounded(line ? .35 : .65, .045, .02, index === 1 ? '#deedc5' : '#176b56', .015);
      bar.position.set(-.28 + (line ? -.15 : 0), -.61 - line * .12, .1);
      sleeve.add(bar);
    }
    sleeve.position.set((index - 1) * .65, (index - 1) * .08, (index - 1) * .38);
    sleeve.rotation.set(0, -.18, (index - 1) * -.12);
    group.add(sleeve);
  }
  return group;
}
