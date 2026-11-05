import * as THREE from "three";

/**
 * GPU vertex-driven beat particles for the existing WebGL stage.
 * No GPU readback, compute requirement, per-particle CPU work or extra canvas.
 */
export function createBeatParticleHalo(lowPower: boolean) {
  const count = lowPower ? 64 : 160;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = (i * 0.61803398875) % 1;
    const b = (i * 0.754877666) % 1;
    const angle = a * Math.PI * 2;
    const radius = 1.2 + (i % 7) * 0.15;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.6 + b * 2.6;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.8;
    phases[i] = (i * 0.41421356237) % 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const uniforms = {
    uTime: { value: 0 },
    uEnergy: { value: 0 },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color("#edff8c") },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uEnergy;
      attribute float aPhase;
      varying float vFade;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.82 + aPhase * 18.0) * (0.08 + uEnergy * 0.12);
        p.y += sin(uTime * 0.66 + aPhase * 11.0) * (0.12 + uEnergy * 0.22);
        p.z += cos(uTime * 0.5 + aPhase * 13.0) * 0.05;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 2.0 + uEnergy * 3.0 + aPhase * 1.5;
        vFade = 0.45 + 0.55 * sin(aPhase * 17.0 + uTime) * sin(aPhase * 17.0 + uTime);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float circle = 1.0 - smoothstep(0.15, 0.5, d);
        gl_FragColor = vec4(uColor, circle * vFade * uOpacity);
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.raycast = () => {}; // A decorative field must never steal mascot touches.
  return {
    points,
    update(time: number, energy: number, active: boolean, reducedMotion: boolean, light: boolean) {
      uniforms.uTime.value = reducedMotion ? 0 : time;
      uniforms.uEnergy.value = reducedMotion ? 0 : THREE.MathUtils.clamp(energy, 0, 1);
      uniforms.uOpacity.value = active && !reducedMotion ? (light ? 0.26 : 0.42) : 0;
      uniforms.uColor.value.set(light ? "#308e7f" : "#edff8c");
      points.visible = active && !reducedMotion;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
