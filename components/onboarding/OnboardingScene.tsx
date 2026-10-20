'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { createWelcomeCrate, createWelcomeHeadphones, createWelcomeRecord } from '@/lib/onboarding-objects';

interface Props {
  step: number; impulse: number; reducedMotion: boolean; theme: 'light' | 'dark';
  onInteract: () => void; onReady: () => void;
}

export function OnboardingScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const sync = useRef<(() => void) | null>(null);
  useEffect(() => { latest.current = props; sync.current?.(); }, [props]);

  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
    camera.position.set(0, .1, 5.5);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentMap = pmrem.fromScene(environment, .04);
    scene.environment = environmentMap.texture;
    environment.dispose(); pmrem.dispose();
    scene.add(new THREE.AmbientLight('#f7f8f2', 1.4));
    const key = new THREE.DirectionalLight('#fffaf0', 4);
    key.position.set(-3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight('#b4dda4', 3);
    rim.position.set(3, -1, 2); scene.add(rim);

    const objects = [createWelcomeRecord(), createWelcomeHeadphones(), createWelcomeCrate()];
    const homes = [new THREE.Euler(-.24, -.35, -.18), new THREE.Euler(.06, -.3, .08), new THREE.Euler(-.08, -.26, .05)];
    objects.forEach((object, index) => { object.rotation.copy(homes[index]); scene.add(object); });
    const constellation = new THREE.Group();
    const orbitMaterial = new THREE.MeshStandardMaterial({ color: '#8bb99c', transparent: true, opacity: .3, metalness: .4, roughness: .3 });
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.78, .009, 8, 120), orbitMaterial);
    orbit.rotation.set(.7, -.4, -.3); constellation.add(orbit);
    const beadGeometry = new THREE.SphereGeometry(.065, 16, 12);
    for (let index = 0; index < 5; index++) {
      const bead = new THREE.Mesh(beadGeometry, new THREE.MeshStandardMaterial({ color: index % 2 ? '#176b56' : '#b4dda4', metalness: .25, roughness: .2 }));
      const angle = index / 5 * Math.PI * 2;
      bead.position.set(Math.cos(angle) * 1.78, Math.sin(angle) * 1.42, -.35);
      constellation.add(bead);
    }
    scene.add(constellation);

    let step = -1, lastImpulse = props.impulse, frame = 0, lastTime = 0, elapsed = 0, lastRender = 0;
    let velocity = 0, spin = 0, dirty = true, drag: { x: number; y: number; moved: boolean } | null = null;
    const tilt = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const transitions: gsap.core.Tween[] = [];
    const synchronize = () => {
      dirty = true;
      const current = latest.current;
      if (step !== current.step) {
        transitions.splice(0).forEach(tween => tween.kill());
        step = current.step; spin = 0; velocity = 0; tilt.set(0, 0);
        objects.forEach((object, index) => {
          object.visible = true;
          const active = index === step;
          const duration = current.reducedMotion ? 0 : .75;
          transitions.push(gsap.to(object.scale, { x: active ? 1 : .001, y: active ? 1 : .001, z: active ? 1 : .001, duration, ease: 'power3.inOut' }));
          transitions.push(gsap.to(object.position, { x: active ? 0 : index < step ? -1.6 : 1.6, y: active ? 0 : -.2, z: active ? 0 : -.6, duration, ease: 'power3.inOut', onComplete: () => { object.visible = active; } }));
        });
      }
      orbitMaterial.opacity = current.theme === 'dark' ? .35 : .24;
      if (lastImpulse !== current.impulse) {
        lastImpulse = current.impulse;
        if (current.reducedMotion) spin += Math.PI / 3;
        else velocity += 13;
      }
    };
    sync.current = synchronize;
    // First frame is fully composed; subsequent steps share one continuous stage.
    objects.forEach((object, index) => { object.scale.setScalar(index === props.step ? 1 : .001); object.position.x = index === props.step ? 0 : 1.6; });
    synchronize();
    const resize = () => {
      dirty = true;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height;
      camera.position.z = camera.aspect < .9 ? 5.5 / camera.aspect * .9 : 5.5;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const hit = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(objects[step], true).length > 0;
    };
    const down = (event: PointerEvent) => {
      if (!hit(event)) return;
      drag = { x: event.clientX, y: event.clientY, moved: false };
      element.setPointerCapture(event.pointerId); element.style.cursor = 'grabbing';
      latest.current.onInteract();
      dirty = true;
    };
    const move = (event: PointerEvent) => {
      if (!drag) { element.style.cursor = hit(event) ? 'grab' : 'default'; return; }
      dirty = true;
      const deltaX = event.clientX - drag.x, deltaY = event.clientY - drag.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 2) drag.moved = true;
      spin += deltaX * .014;
      tilt.y = THREE.MathUtils.clamp(tilt.y + deltaY * .007, -.45, .45);
      if (!latest.current.reducedMotion) velocity = deltaX * .35;
      drag.x = event.clientX; drag.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      dirty = true;
      if (drag && !drag.moved) { if (latest.current.reducedMotion) spin += Math.PI / 3; else velocity += 10; }
      drag = null; element.style.cursor = 'grab';
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up);
    let announced = false;
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (document.hidden) { lastTime = now; return; }
      if (now - lastRender < 32) return;
      if (latest.current.reducedMotion && !dirty) return;
      dirty = false;
      const dt = Math.min(.05, (now - (lastTime || now)) / 1000);
      lastTime = now; lastRender = now;
      const reduced = latest.current.reducedMotion;
      if (!reduced) { elapsed += dt; if (!drag) { spin += velocity * dt; velocity *= Math.exp(-dt * 2.3); tilt.y *= Math.exp(-dt * 3); } }
      objects.forEach((object, index) => {
        object.rotation.copy(homes[index]);
        if (index === step) {
          object.position.y = reduced ? 0 : Math.sin(elapsed * 1.3) * .055;
          object.rotation.x += tilt.y;
          if (step === 0) object.rotation.z += spin + (reduced ? 0 : elapsed * .16);
          else object.rotation.y += Math.sin(spin) * .5;
        }
      });
      constellation.rotation.z = reduced ? 0 : Math.sin(elapsed * .15) * .1;
      renderer.render(scene, camera);
      if (!announced) { announced = true; latest.current.onReady(); }
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); sync.current = null;
      transitions.forEach(tween => tween.kill());
      element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach((value: THREE.Material) => materials.add(value)); } });
      geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
      environmentMap.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  // Renderer lifetime is the open intro. Mutable props are synchronized above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mount} className="onboarding-canvas" data-testid="onboarding-3d-scene" aria-hidden="true" />;
}
