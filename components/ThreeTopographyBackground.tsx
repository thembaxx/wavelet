"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ThemeMode } from "@/lib/game-rules";

// Contour treatment adapted from React Bits Topography / Background Studio.
// This Three.js implementation shares Wavelet's theme and motion preferences.
const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  uniform vec3 uInk;
  uniform vec3 uPaper;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    return mix(mix(hash(i), hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
  }
  float terrain(vec2 p) {
    float h = .5 * noise(p);
    p = mat2(1.6, -1.2, 1.2, 1.6) * p;
    h += .25 * noise(p + 3.1);
    h += .125 * noise(p * 1.8 - 2.4);
    return h;
  }
  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.);
    vec2 p = (vUv - .5) * vec2(aspect, 1.) * 3.8;
    p += uPointer * .12 + vec2(uTime * .018, uTime * .008);
    float height = terrain(p) * 18.;
    float distanceToLine = abs(fract(height) - .5);
    float edge = max(fwidth(height) * .9, .018);
    float contour = 1. - smoothstep(.014, .014 + edge, distanceToLine);
    float vignette = smoothstep(.12, .9, length((vUv - .5) * vec2(1., .85)));
    float wash = (1. - smoothstep(0., .65, length(vUv - vec2(.1,.9)))) * uOpacity * .2;
    vec3 color = mix(uPaper, uInk, contour * uOpacity * (.3 + vignette * .7) + wash);
    gl_FragColor = vec4(color, 1.);
    #include <colorspace_fragment>
  }
`;

export function ThreeTopographyBackground({
  theme,
  reducedMotion,
  enabled = true,
}: {
  theme: ThemeMode;
  reducedMotion: boolean;
  enabled?: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const props = useRef({ theme, reducedMotion, enabled });
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    props.current = { theme, reducedMotion, enabled };
    refresh.current?.();
  }, [theme, reducedMotion, enabled]);

  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
    } catch {
      return;
    }
    // The full-viewport decorative shader needs fewer pixels and updates on touch screens.
    const touchLayout = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchLayout ? 1 : 1.25));
    const frameInterval = touchLayout ? 55 : 34;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.12 },
        uPointer: { value: new THREE.Vector2() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uInk: { value: new THREE.Color("#718b6f") },
        uPaper: { value: new THREE.Color("#f7f8f2") },
      },
      vertexShader:
        "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const pointer = new THREE.Vector2();
    let frame = 0;
    let pendingTimer: number | undefined;
    const start = performance.now();
    const draw = (now: number) => {
      frame = 0;
      const state = props.current;
      if (document.hidden) return;
      material.uniforms.uPaper.value.set(state.theme === "dark" ? "#102721" : "#f7f8f2");
        material.uniforms.uInk.value.set(state.theme === "dark" ? "#78b58e" : "#6b896a");
        material.uniforms.uOpacity.value = state.enabled
          ? state.theme === "dark"
            ? 0.09
            : 0.12
          : 0;
        material.uniforms.uTime.value = state.reducedMotion ? 0 : (now - start) / 1000;
        material.uniforms.uPointer.value.lerp(
          state.reducedMotion ? new THREE.Vector2() : pointer,
          0.035,
        );
        renderer.render(scene, camera);
      if (!state.reducedMotion && state.enabled) {
        pendingTimer = window.setTimeout(() => {
          pendingTimer = undefined;
          frame = requestAnimationFrame(draw);
        }, frameInterval);
      }
    };
    const requestDraw = () => {
      if (document.hidden) return;
      if (pendingTimer !== undefined) {
        window.clearTimeout(pendingTimer);
        pendingTimer = undefined;
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    refresh.current = requestDraw;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
      requestDraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const onPointer = (event: PointerEvent) => {
      if (document.hidden || !props.current.enabled || props.current.reducedMotion) return;
      pointer.set(event.clientX / innerWidth - 0.5, 0.5 - event.clientY / innerHeight);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", requestDraw);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      if (pendingTimer !== undefined) window.clearTimeout(pendingTimer);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", requestDraw);
      refresh.current = null;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mount}
      className="topography-background"
      data-testid="topography-background"
      aria-hidden="true"
    />
  );
}
