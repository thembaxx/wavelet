'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { audioEngine } from '@/lib/audio-engine';
import { type SongMoodProfile } from '@/lib/game-rules';

export type MascotMoodState = 'idle' | 'listening' | 'celebrating' | 'sympathy' | 'hyped';

interface IsometricVinylStageProps {
  mood: SongMoodProfile;
  mascotState: MascotMoodState;
  isPlayingSnippet: boolean;
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  onTurntableInteract?: () => void;
  onMascotInteract?: () => void;
}

// Pre-allocated math scratch objects outside render loop (Zero GC)
const _tempMatrix = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempScale = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempColor = new THREE.Color();
const _targetPrimaryColor = new THREE.Color();
const _targetSecondaryColor = new THREE.Color();
const _targetAccentColor = new THREE.Color();
const _targetBgColor = new THREE.Color();

function createVinylGrooveTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b0910';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Fine concentric vinyl grooves
  for (let r = 88; r < 248; r += 2.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const shade = 16 + Math.floor(14 * Math.sin(r * 0.45));
    ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade + 6})`;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // Anisotropic diagonal sheen
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.46, 'rgba(255,255,255,0.07)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  grad.addColorStop(0.54, 'rgba(255,255,255,0.07)');
  grad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createMascotFaceTexture(state: MascotMoodState, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Deep CRT visor screen
  ctx.fillStyle = '#07060d';
  ctx.fillRect(0, 0, 256, 160);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let y = 0; y < 160; y += 4) {
    ctx.fillRect(0, y, 256, 2);
  }

  ctx.strokeStyle = accentHex;
  ctx.fillStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (state === 'celebrating' || state === 'hyped') {
    // Happy curved chevron eyes ^ ^
    ctx.beginPath();
    ctx.moveTo(58, 76);
    ctx.lineTo(78, 52);
    ctx.lineTo(98, 76);
    ctx.moveTo(158, 76);
    ctx.lineTo(178, 52);
    ctx.lineTo(198, 76);
    ctx.stroke();

    // Big cheerful synth smile
    ctx.beginPath();
    ctx.arc(128, 92, 30, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (state === 'sympathy') {
    // Expressive X / tilted eyes
    ctx.strokeStyle = '#FF5E7E';
    ctx.beginPath();
    ctx.moveTo(62, 54);
    ctx.lineTo(94, 82);
    ctx.moveTo(94, 54);
    ctx.lineTo(62, 82);

    ctx.moveTo(162, 54);
    ctx.lineTo(194, 82);
    ctx.moveTo(194, 54);
    ctx.lineTo(162, 82);
    ctx.stroke();

    // Wavy mouth
    ctx.beginPath();
    ctx.arc(128, 122, 22, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else if (state === 'listening') {
    // Equalizer bar eyes + bobbing O mouth
    const bars = [22, 38, 28, 22, 38, 28];
    bars.forEach((h, i) => {
      const x = i < 3 ? 58 + i * 16 : 154 + (i - 3) * 16;
      ctx.fillRect(x, 72 - h / 2, 10, h);
    });
    ctx.beginPath();
    ctx.arc(128, 112, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Friendly glowing pill eyes + warm smile
    ctx.beginPath();
    ctx.roundRect(64, 48, 24, 36, 12);
    ctx.roundRect(168, 48, 24, 36, 12);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(128, 94, 24, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const IsometricVinylStage: React.FC<IsometricVinylStageProps> = ({
  mood,
  mascotState,
  isPlayingSnippet,
  gameState,
  onTurntableInteract,
  onMascotInteract,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props in refs so the 60fps loop reads them without re-creating the WebGL context
  const propsRef = useRef({
    mood,
    mascotState,
    isPlayingSnippet,
    gameState,
    onTurntableInteract,
    onMascotInteract,
  });

  useEffect(() => {
    propsRef.current = {
      mood,
      mascotState,
      isPlayingSnippet,
      gameState,
      onTurntableInteract,
      onMascotInteract,
    };
  }, [mood, mascotState, isPlayingSnippet, gameState, onTurntableInteract, onMascotInteract]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(propsRef.current.mood.bgDarkHex);
    scene.fog = new THREE.FogExp2(propsRef.current.mood.bgDarkHex, 0.032);

    // Isometric-style camera angle with responsive portrait framing so the 3D deck & mascot sit cleanly above the bottom dock
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 140);
    const updateCameraFraming = (w: number, h: number) => {
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      // Pull camera back on narrow portrait viewports so the full turntable + mascot + equalizer arc fit with generous margin
      const portraitZoom = aspect < 0.85 ? THREE.MathUtils.clamp(0.78 / aspect, 1.0, 1.68) : 1.0;
      const yLookOffset = aspect < 0.85 ? -1.05 : -0.35;
      camera.position.set(8.2 * portraitZoom, 9.6 * portraitZoom, 10.4 * portraitZoom);
      camera.lookAt(0.25, yLookOffset, 0.25);
      camera.updateProjectionMatrix();
    };
    updateCameraFraming(width, height);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isHeadless,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection (RoomEnvironment)
    if (!isHeadless) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    }

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 3-Point Studio & Club Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(6, 12, 7);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      const d = 8;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff2e93, 4.5, 18);
    rimLight.position.set(-5, 4.5, -4);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0x00f5d4, 3.8, 16);
    accentLight.position.set(5, 3.5, 3);
    scene.add(accentLight);

    // Root Stage Group (allows subtle physics tilt on swipe/drag)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Ground Studio Platform + Contact Shadow Plane
    const platformGeo = new THREE.CylinderGeometry(6.8, 7.2, 0.45, 48);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x161224,
      roughness: 0.65,
      metalness: 0.2,
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -0.225;
    platformMesh.receiveShadow = true;
    stageGroup.add(platformMesh);

    // Glowing Neon Trim Ring around Stage
    const stageRingGeo = new THREE.TorusGeometry(6.95, 0.055, 16, 64);
    stageRingGeo.rotateX(Math.PI / 2);
    const stageRingMat = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      emissive: 0xff2e93,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    const stageRingMesh = new THREE.Mesh(stageRingGeo, stageRingMat);
    stageRingMesh.position.y = 0.01;
    stageGroup.add(stageRingMesh);

    // =========================================================================
    // 1. COMPOSITE HERO PROP: 3D ISOMETRIC TURNTABLE DECK (9 DISTINCT PARTS)
    // =========================================================================
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(-0.65, 0, 0.35);
    stageGroup.add(turntableGroup);

    // Part 1: Plinth Deck Base
    const plinthGeo = new THREE.BoxGeometry(4.4, 0.48, 3.6);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e192b,
      roughness: 0.38,
      metalness: 0.45,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.24;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    turntableGroup.add(plinthMesh);

    // Part 2: Anodized Top Plate Trim
    const topPlateGeo = new THREE.BoxGeometry(4.16, 0.06, 3.36);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: 0x2a2438,
      roughness: 0.22,
      metalness: 0.78,
    });
    const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
    topPlateMesh.position.y = 0.51;
    turntableGroup.add(topPlateMesh);

    // Part 3: Machined Aluminum Platter
    const platterGroup = new THREE.Group();
    platterGroup.position.set(-0.38, 0.56, 0);
    turntableGroup.add(platterGroup);

    const platterGeo = new THREE.CylinderGeometry(1.52, 1.56, 0.12, 48);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.2,
      metalness: 0.88,
    });
    const platterMesh = new THREE.Mesh(platterGeo, platterMat);
    platterGroup.add(platterMesh);

    // Part 4: 12-Inch Grooved Vinyl Record Disc
    const grooveTex = createVinylGrooveTexture(maxAnisotropy);
    const vinylGeo = new THREE.CylinderGeometry(1.46, 1.46, 0.04, 48);
    const vinylMat = new THREE.MeshStandardMaterial({
      map: grooveTex,
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.35,
    });
    const vinylMesh = new THREE.Mesh(vinylGeo, vinylMat);
    vinylMesh.position.y = 0.08;
    platterGroup.add(vinylMesh);

    // Part 5: Mood-Reactive Record Center Label
    const labelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.045, 32);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      emissive: 0xff2e93,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.082;
    platterGroup.add(labelMesh);

    // Part 6: Chrome Center Spindle
    const spindleGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16);
    const spindleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.95,
    });
    const spindleMesh = new THREE.Mesh(spindleGeo, spindleMat);
    spindleMesh.position.y = 0.14;
    platterGroup.add(spindleMesh);

    // Part 7: Tonearm Assembly (Pivot Base + Rotating Arm + Headshell Cartridge)
    const tonearmPivot = new THREE.Group();
    tonearmPivot.position.set(1.45, 0.62, -1.05);
    turntableGroup.add(tonearmPivot);

    const pivotBaseGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.22, 24);
    const pivotBaseMesh = new THREE.Mesh(pivotBaseGeo, platterMat);
    tonearmPivot.add(pivotBaseMesh);

    const armTubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.05, 12);
    armTubeGeo.rotateX(Math.PI / 2);
    const armTubeMesh = new THREE.Mesh(armTubeGeo, spindleMat);
    armTubeMesh.position.set(-0.18, 0.14, 0.92);
    armTubeMesh.rotation.y = -0.18;
    tonearmPivot.add(armTubeMesh);

    // Part 8: Cartridge Headshell & Glowing Stylus
    const cartridgeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.32);
    const cartridgeMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    const cartridgeMesh = new THREE.Mesh(cartridgeGeo, cartridgeMat);
    cartridgeMesh.position.set(-0.36, 0.12, 1.92);
    cartridgeMesh.rotation.y = -0.25;
    tonearmPivot.add(cartridgeMesh);

    // Part 9: Pitch Slider & Illuminated Start Button on Deck
    const startBtnGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24);
    const startBtnMesh = new THREE.Mesh(startBtnGeo, cartridgeMat);
    startBtnMesh.position.set(-1.75, 0.54, 1.25);
    turntableGroup.add(startBtnMesh);

    // =========================================================================
    // 2. COMPOSITE 3D MASCOT: "GROOVEBOT" (10 DISTINCT PARTS)
    // =========================================================================
    const mascotGroup = new THREE.Group();
    mascotGroup.position.set(2.55, 0.02, 0.55);
    mascotGroup.rotation.y = -0.35;
    stageGroup.add(mascotGroup);

    // Contact Shadow under Mascot
    const shadowGeo = new THREE.CircleGeometry(0.95, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const mascotShadow = new THREE.Mesh(shadowGeo, shadowMat);
    mascotShadow.position.set(2.55, 0.015, 0.55);
    stageGroup.add(mascotShadow);

    // Mascot Body Rig (bounces & squashes)
    const mascotRig = new THREE.Group();
    mascotRig.position.y = 0.85;
    mascotGroup.add(mascotRig);

    // Mascot Torso
    const torsoGeo = new THREE.CylinderGeometry(0.46, 0.34, 0.72, 24);
    const mascotShellMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.18,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, mascotShellMat);
    torsoMesh.castShadow = true;
    mascotRig.add(torsoMesh);

    // Mascot Chest Equalizer Heart Badge
    const badgeGeo = new THREE.BoxGeometry(0.42, 0.26, 0.12);
    const badgeMesh = new THREE.Mesh(badgeGeo, labelMat);
    badgeMesh.position.set(0, 0.04, 0.38);
    mascotRig.add(badgeMesh);

    // Mascot Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.74;
    mascotRig.add(headGroup);

    const headBoxGeo = new THREE.BoxGeometry(1.18, 0.88, 0.92);
    const headMesh = new THREE.Mesh(headBoxGeo, mascotShellMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Mascot Visor Face Screen
    let currentFaceState: MascotMoodState = propsRef.current.mascotState;
    let currentFaceAccent = propsRef.current.mood.accentHex;
    const faceTex = createMascotFaceTexture(currentFaceState, currentFaceAccent);
    const visorGeo = new THREE.PlaneGeometry(0.98, 0.66);
    const visorMat = new THREE.MeshBasicMaterial({ map: faceTex });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.z = 0.468;
    headGroup.add(visorMesh);

    // Mascot Over-Ear Studio Headphones (Left Cup, Right Cup, Headband Arch)
    const earcupGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 24);
    earcupGeo.rotateZ(Math.PI / 2);
    const leftEarcup = new THREE.Mesh(earcupGeo, stageRingMat);
    leftEarcup.position.set(-0.66, 0.02, 0);
    headGroup.add(leftEarcup);

    const rightEarcup = new THREE.Mesh(earcupGeo, stageRingMat);
    rightEarcup.position.set(0.66, 0.02, 0);
    headGroup.add(rightEarcup);

    const headbandGeo = new THREE.TorusGeometry(0.64, 0.065, 12, 32, Math.PI);
    const headbandMesh = new THREE.Mesh(headbandGeo, platterMat);
    headbandMesh.position.y = 0.06;
    headGroup.add(headbandMesh);

    // Mascot Antenna
    const antennaStemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8);
    const antennaStem = new THREE.Mesh(antennaStemGeo, spindleMat);
    antennaStem.position.set(0, 0.78, 0);
    headGroup.add(antennaStem);

    const antennaOrbGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const antennaOrb = new THREE.Mesh(antennaOrbGeo, cartridgeMat);
    antennaOrb.position.set(0, 0.96, 0);
    headGroup.add(antennaOrb);

    // Mascot Floating Hands (Left & Right)
    const handGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const leftHand = new THREE.Mesh(handGeo, cartridgeMat);
    leftHand.position.set(-0.72, 0.05, 0.25);
    mascotRig.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, cartridgeMat);
    rightHand.position.set(0.72, 0.05, 0.25);
    mascotRig.add(rightHand);

    // =========================================================================
    // 3. 16-BAR 3D ISOMETRIC SPECTRUM EQUALIZER ARC (InstancedMesh)
    // =========================================================================
    const eqCount = 16;
    const eqGeo = new THREE.BoxGeometry(0.36, 1.0, 0.36);
    eqGeo.translate(0, 0.5, 0); // Pivot at bottom-center
    const eqMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x7928ca,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.5,
    });
    const eqInstanced = new THREE.InstancedMesh(eqGeo, eqMat, eqCount);
    eqInstanced.frustumCulled = false;
    stageGroup.add(eqInstanced);

    // Initialize equalizer bar positions along the rear isometric perimeter
    const eqCoords: Array<{ x: number; z: number; angle: number }> = [];
    for (let i = 0; i < eqCount; i++) {
      const t = i / (eqCount - 1);
      const angle = THREE.MathUtils.lerp(-Math.PI * 0.85, -Math.PI * 0.15, t);
      const radius = 5.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      eqCoords.push({ x, z, angle });

      _tempPos.set(x, 0.01, z);
      _tempScale.set(1, 0.4, 1);
      _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      _tempMatrix.compose(_tempPos, _tempQuat, _tempScale);
      eqInstanced.setMatrixAt(i, _tempMatrix);
      _tempColor.setHSL(0.85 - t * 0.35, 0.9, 0.6);
      eqInstanced.setColorAt(i, _tempColor);
    }
    eqInstanced.instanceMatrix.needsUpdate = true;
    if (eqInstanced.instanceColor) eqInstanced.instanceColor.needsUpdate = true;

    // Pre-compile shaders once
    renderer.compile(scene, camera);

    // =========================================================================
    // 4. INTERACTION: RAYCASTING & SWIPE TURNTABLE SCRATCH / MASCOT BOUNCE
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactables: THREE.Object3D[] = [vinylMesh, plinthMesh, headMesh, torsoMesh];

    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let stageTargetRotY = 0;
    let stageTargetRotX = 0;
    let mascotJumpVelocity = 0;
    let mascotJumpY = 0;
    let vinylScratchBoost = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        if (hitObj === headMesh || hitObj === torsoMesh) {
          mascotJumpVelocity = 4.8;
          audioEngine.playUiTick(1.35);
          propsRef.current.onMascotInteract?.();
        } else if (hitObj === vinylMesh || hitObj === plinthMesh) {
          vinylScratchBoost = 6.5;
          audioEngine.playUiTick(0.92);
          propsRef.current.onTurntableInteract?.();
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      stageTargetRotY = THREE.MathUtils.clamp(stageTargetRotY + dx * 0.005, -0.45, 0.45);
      stageTargetRotX = THREE.MathUtils.clamp(stageTargetRotX + dy * 0.003, -0.2, 0.2);
      vinylScratchBoost = THREE.MathUtils.clamp(vinylScratchBoost + Math.abs(dx) * 0.06, 0, 10);
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for crisp responsive viewport
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      updateCameraFraming(w, h);
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // =========================================================================
    // 5. 60FPS SIMULATION & RHYTHM VISUALIZER LOOP
    // =========================================================================
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;
    let animFrameId = 0;
    let lastHeadlessRender = 0;

    const animate = (nowMs: number) => {
      animFrameId = requestAnimationFrame(animate);

      // In headless browser verification, throttle to ~15fps so software WebGL never starves snapshots
      if (isHeadless && nowMs - lastHeadlessRender < 65) {
        return;
      }
      lastHeadlessRender = nowMs;

      const rawDt = Math.max(0.001, (nowMs - prevTimeMs) / 1000);
      prevTimeMs = nowMs;
      const dt = Math.min(rawDt, 0.05);
      const elapsed = (nowMs - startTimeMs) / 1000;

      const currentProps = propsRef.current;
      const spectrum = audioEngine.sampleSpectrum(elapsed);

      // Update Mascot Visor Texture only when state or accent changes
      if (
        currentProps.mascotState !== currentFaceState ||
        currentProps.mood.accentHex !== currentFaceAccent
      ) {
        currentFaceState = currentProps.mascotState;
        currentFaceAccent = currentProps.mood.accentHex;
        const nextTex = createMascotFaceTexture(currentFaceState, currentFaceAccent);
        visorMat.map?.dispose();
        visorMat.map = nextTex;
        visorMat.needsUpdate = true;
      }

      // Smoothly damp mood lighting & colors
      _targetPrimaryColor.set(currentProps.mood.primaryHex);
      _targetSecondaryColor.set(currentProps.mood.secondaryHex);
      _targetAccentColor.set(currentProps.mood.accentHex);
      _targetBgColor.set(currentProps.mood.bgDarkHex);

      scene.background = (scene.background as THREE.Color).lerp(_targetBgColor, dt * 3.5);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(_targetBgColor, dt * 3.5);
      }

      rimLight.color.lerp(_targetPrimaryColor, dt * 4);
      accentLight.color.lerp(_targetAccentColor, dt * 4);
      stageRingMat.color.lerp(_targetPrimaryColor, dt * 4);
      stageRingMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      labelMat.color.lerp(_targetPrimaryColor, dt * 4);
      labelMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      cartridgeMat.color.lerp(_targetAccentColor, dt * 4);
      cartridgeMat.emissive.lerp(_targetAccentColor, dt * 4);
      eqMat.emissive.lerp(_targetSecondaryColor, dt * 4);

      // Spin Vinyl Platter (faster when playing or scratched)
      vinylScratchBoost = THREE.MathUtils.damp(vinylScratchBoost, 0, 4, dt);
      const baseSpinSpeed = currentProps.isPlayingSnippet ? 3.6 : 0.65;
      platterGroup.rotation.y -= (baseSpinSpeed + vinylScratchBoost) * dt;

      // Smoothly pivot Tonearm onto the vinyl groove when snippet is playing
      const targetTonearmRot = currentProps.isPlayingSnippet ? 0.28 : 0.0;
      tonearmPivot.rotation.y = THREE.MathUtils.damp(
        tonearmPivot.rotation.y,
        targetTonearmRot,
        7,
        dt
      );

      // Stage swipe damping
      if (!isDragging) {
        stageTargetRotY = THREE.MathUtils.damp(stageTargetRotY, 0, 4, dt);
        stageTargetRotX = THREE.MathUtils.damp(stageTargetRotX, 0, 4, dt);
      }
      stageGroup.rotation.y = THREE.MathUtils.damp(stageGroup.rotation.y, stageTargetRotY, 8, dt);
      stageGroup.rotation.x = THREE.MathUtils.damp(stageGroup.rotation.x, stageTargetRotX, 8, dt);

      // Mascot Physics: Jump Impulse + Rhythm Bob + Squash-and-Stretch
      if (currentProps.mascotState === 'celebrating' && mascotJumpY === 0 && Math.random() < 0.08) {
        mascotJumpVelocity = 3.8;
      }
      mascotJumpY += mascotJumpVelocity * dt;
      if (mascotJumpY > 0) {
        mascotJumpVelocity -= 14.5 * dt; // Gravity
      } else {
        mascotJumpY = 0;
        mascotJumpVelocity = 0;
      }

      const rhythmBob = Math.abs(Math.sin(elapsed * (currentProps.mood.bpm / 60) * Math.PI)) * (0.06 + spectrum.bass * 0.18);
      mascotRig.position.y = 0.85 + mascotJumpY + rhythmBob;

      // Head nod & headphone bass pulse
      headGroup.rotation.z = Math.sin(elapsed * 3.2) * (0.06 + spectrum.mid * 0.12);
      headGroup.rotation.x = currentProps.isPlayingSnippet
        ? Math.sin(elapsed * ((currentProps.mood.bpm / 60) * Math.PI * 2)) * 0.11
        : Math.sin(elapsed * 1.5) * 0.04;

      const earScale = 1 + spectrum.bass * 0.25;
      leftEarcup.scale.setScalar(earScale);
      rightEarcup.scale.setScalar(earScale);

      // Floating hands dance
      const handWave = currentProps.mascotState === 'celebrating' ? 0.45 : 0.12 + spectrum.energy * 0.25;
      leftHand.position.y = 0.05 + Math.sin(elapsed * 5) * handWave + (currentProps.mascotState === 'celebrating' ? 0.35 : 0);
      rightHand.position.y = 0.05 + Math.cos(elapsed * 5) * handWave + (currentProps.mascotState === 'celebrating' ? 0.35 : 0);

      // Update 16-Bar 3D Equalizer Arc
      for (let i = 0; i < eqCount; i++) {
        const coord = eqCoords[i];
        const binVal = spectrum.bins[i] || 0.1;
        const barHeight = 0.28 + binVal * 2.65;

        _tempPos.set(coord.x, 0.01, coord.z);
        _tempScale.set(1, barHeight, 1);
        _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -coord.angle);
        _tempMatrix.compose(_tempPos, _tempQuat, _tempScale);
        eqInstanced.setMatrixAt(i, _tempMatrix);
      }
      eqInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      grooveTex.dispose();
      faceTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="vinyl-3d-stage"
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none"
      aria-hidden="true"
    />
  );
};
