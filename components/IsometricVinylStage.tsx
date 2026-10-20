'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { audioEngine } from '@/lib/audio-engine';
import {
  type SongMoodProfile,
  type ThemeMode,
  type MascotCharacterId,
} from '@/lib/game-rules';

export type MascotMoodState = 'idle' | 'listening' | 'celebrating' | 'sympathy' | 'hyped';

interface IsometricVinylStageProps {
  mood: SongMoodProfile;
  mascotState: MascotMoodState;
  characterId: MascotCharacterId;
  themeMode: ThemeMode;
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
const _targetStageColor = new THREE.Color();
const _targetPlinthColor = new THREE.Color();
const _targetTopPlateColor = new THREE.Color();
const _targetSuitColor = new THREE.Color();

function createVinylGrooveTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0e0c14';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  for (let r = 86; r < 248; r += 2.1) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const shade = 18 + Math.floor(15 * Math.sin(r * 0.45));
    ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade + 8})`;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.19)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates the Acid Lime (#EDFF8C) 9-Dot Bauhaus Cube texture inspired directly by IMG_5844.
 */
function createBauhausCubeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#EDFF8C';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle top-left illumination gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(48,159,146,0.08)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 3x3 9-Dot Matrix with #309F92 center dot (matching IMG_5844!)
  const spacing = 86;
  const startX = 256 - spacing;
  const startY = 236 - spacing;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const isCenter = row === 1 && col === 1;
      ctx.fillStyle = isCenter ? '#309F92' : '#000000';
      ctx.beginPath();
      ctx.arc(startX + col * spacing, startY + row * spacing, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Minimal corner caption ("365" / "2026" like IMG_5844)
  ctx.fillStyle = '#000000';
  ctx.font = '600 28px sans-serif';
  ctx.fillText('VINYL', 54, 456);
  ctx.fillText('365', 396, 456);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRibbedKnitBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 6) {
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(x, 0, 3, 256);
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 3, 0, 3, 256);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = 0; y < 256; y += 8) {
    ctx.fillRect(0, y, 256, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function createPeanutWaffleBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 16) {
    const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.5, '#dcdcdc');
    grad.addColorStop(1, '#555555');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 16, 256);
  }

  for (let y = 0; y < 256; y += 22) {
    ctx.strokeStyle = 'rgba(60,60,60,0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + 6, 192, y - 6, 256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function updateVinylToyFaceCanvas(
  canvas: HTMLCanvasElement,
  state: MascotMoodState,
  characterId: MascotCharacterId,
  singOpenAmount: number,
  isBlinking: boolean
) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#FCEAD8';
  ctx.fillRect(0, 0, w, h);

  const skinGrad = ctx.createRadialGradient(
    w * 0.5,
    h * 0.52,
    w * 0.1,
    w * 0.5,
    h * 0.5,
    w * 0.52
  );
  skinGrad.addColorStop(0, '#FFF5EB');
  skinGrad.addColorStop(0.75, '#FCEAD8');
  skinGrad.addColorStop(1, '#F3D5BA');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  const drawBlush = (cx: number, cy: number, radius: number, alpha: number) => {
    const blush = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    blush.addColorStop(0, `rgba(255, 132, 150, ${alpha})`);
    blush.addColorStop(0.6, `rgba(255, 150, 165, ${alpha * 0.45})`);
    blush.addColorStop(1, 'rgba(255, 150, 165, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const blushIntensity = state === 'celebrating' || state === 'hyped' ? 0.68 : 0.48;
  drawBlush(136, 305, 52, blushIntensity);
  drawBlush(376, 305, 52, blushIntensity);

  const drawTeardrop = (tx: number, ty: number, tiltRad: number, scale = 1) => {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(tiltRad);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#7EC4EA';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.bezierCurveTo(18, -6, 22, 16, 0, 24);
    ctx.bezierCurveTo(-22, 16, -18, -6, 0, -24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-5, 2, 3.5, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (characterId === 'pebble' || state === 'sympathy') {
    drawTeardrop(112, 294, 0.22, state === 'sympathy' ? 1.12 : 0.95);
    drawTeardrop(400, 294, -0.22, state === 'sympathy' ? 1.12 : 0.95);
  } else if (characterId === 'bobacat') {
    drawTeardrop(108, 296, 0.15, 0.95);
  }

  ctx.strokeStyle = '#2B1B17';
  ctx.fillStyle = '#2B1B17';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leftEyeX = 166;
  const rightEyeX = 346;
  const eyeY = 232;

  const drawGlossyKawaiiEye = (ex: number, ey: number, sparkleExtra = false) => {
    ctx.lineWidth = 8.5;
    const dir = ex < 256 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(ex + dir * 24, ey - 22);
    ctx.lineTo(ex + dir * 40, ey - 36);
    ctx.moveTo(ex + dir * 30, ey - 8);
    ctx.lineTo(ex + dir * 46, ey - 16);
    ctx.stroke();

    ctx.fillStyle = '#261815';
    ctx.beginPath();
    ctx.arc(ex, ey, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4A2E24';
    ctx.beginPath();
    ctx.arc(ex, ey + 8, 24, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex + 11, ey - 12, 11.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ex - 12, ey + 12, 5, 0, Math.PI * 2);
    ctx.fill();

    if (sparkleExtra) {
      ctx.beginPath();
      ctx.arc(ex - 10, ey - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawWinkingArcEye = (ex: number, ey: number) => {
    ctx.strokeStyle = '#261815';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(ex, ey + 12, 30, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();

    const dir = ex < 256 ? -1 : 1;
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(ex + dir * 24, ey - 6);
    ctx.lineTo(ex + dir * 38, ey - 18);
    ctx.moveTo(ex + dir * 28, ey + 4);
    ctx.lineTo(ex + dir * 42, ey + 1);
    ctx.stroke();
  };

  if (state === 'celebrating' || state === 'hyped' || characterId === 'sprout') {
    if (characterId === 'sprout' && state === 'idle' && !isBlinking) {
      drawWinkingArcEye(leftEyeX, eyeY);
      drawWinkingArcEye(rightEyeX, eyeY);
    } else if (state === 'celebrating' || state === 'hyped') {
      drawGlossyKawaiiEye(leftEyeX, eyeY, true);
      drawWinkingArcEye(rightEyeX, eyeY);
    } else {
      drawWinkingArcEye(leftEyeX, eyeY);
      drawWinkingArcEye(rightEyeX, eyeY);
    }
  } else if (isBlinking) {
    drawWinkingArcEye(leftEyeX, eyeY);
    drawWinkingArcEye(rightEyeX, eyeY);
  } else if (characterId === 'bobacat' && state === 'idle') {
    drawGlossyKawaiiEye(leftEyeX, eyeY);
    drawGlossyKawaiiEye(rightEyeX, eyeY);
    ctx.fillStyle = '#FCEAD8';
    ctx.fillRect(leftEyeX - 42, eyeY - 42, 84, 22);
    ctx.fillRect(rightEyeX - 42, eyeY - 42, 84, 22);
  } else {
    drawGlossyKawaiiEye(leftEyeX, eyeY, state === 'listening');
    drawWinkingArcEye(rightEyeX, eyeY);
  }

  const mouthX = 256;
  const mouthY = 274;
  ctx.strokeStyle = '#2B1B17';
  ctx.fillStyle = '#2B1B17';
  ctx.lineWidth = 9.5;

  if (
    state === 'sympathy' ||
    (characterId === 'bobacat' && state !== 'celebrating' && singOpenAmount < 0.15)
  ) {
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY - 12, 13, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(mouthX, mouthY - 5);
    ctx.lineTo(mouthX, mouthY + 12);
    ctx.moveTo(mouthX, mouthY + 12);
    ctx.lineTo(mouthX - 18, mouthY + 24);
    ctx.moveTo(mouthX, mouthY + 12);
    ctx.lineTo(mouthX + 18, mouthY + 24);
    ctx.stroke();
  } else if (
    state === 'listening' ||
    singOpenAmount > 0.18 ||
    state === 'celebrating' ||
    state === 'hyped'
  ) {
    const openH = state === 'celebrating' ? 26 : 14 + singOpenAmount * 22;
    const openW = state === 'celebrating' ? 28 : 22 + singOpenAmount * 8;

    ctx.fillStyle = '#5E2129';
    ctx.beginPath();
    ctx.roundRect(mouthX - openW, mouthY - 6, openW * 2, openH + 10, [8, 8, 24, 24]);
    ctx.fill();

    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.arc(mouthX, mouthY + openH - 2, openW * 0.65, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#2B1B17';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.roundRect(mouthX - openW, mouthY - 6, openW * 2, openH + 10, [8, 8, 24, 24]);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(mouthX, mouthY - 4, 21, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

export const IsometricVinylStage: React.FC<IsometricVinylStageProps> = ({
  mood,
  mascotState,
  characterId,
  themeMode,
  isPlayingSnippet,
  gameState,
  onTurntableInteract,
  onMascotInteract,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    mood,
    mascotState,
    characterId,
    themeMode,
    isPlayingSnippet,
    gameState,
    onTurntableInteract,
    onMascotInteract,
  });

  useEffect(() => {
    propsRef.current = {
      mood,
      mascotState,
      characterId,
      themeMode,
      isPlayingSnippet,
      gameState,
      onTurntableInteract,
      onMascotInteract,
    };
  }, [
    mood,
    mascotState,
    characterId,
    themeMode,
    isPlayingSnippet,
    gameState,
    onTurntableInteract,
    onMascotInteract,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const initialBgHex =
      propsRef.current.themeMode === 'light'
        ? propsRef.current.mood.bgLightHex
        : propsRef.current.mood.bgDarkHex;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialBgHex);
    scene.fog = new THREE.FogExp2(initialBgHex, 0.022);

    const camera = new THREE.PerspectiveCamera(31, width / height, 0.1, 140);
    const updateCameraFraming = (w: number, h: number) => {
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      const portraitZoom = aspect < 0.85 ? THREE.MathUtils.clamp(0.82 / aspect, 1.0, 1.52) : 1.0;
      const yLookOffset = aspect < 0.85 ? -0.35 : 0.05;
      camera.position.set(5.8 * portraitZoom, 6.2 * portraitZoom, 11.4 * portraitZoom);
      camera.lookAt(0.35, yLookOffset, 0.25);
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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    if (!isHeadless) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    }

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd1d1d1, 1.3);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffcf5, 2.3);
    keyLight.position.set(6.5, 13, 8);
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

    const rimLight = new THREE.PointLight(0x309f92, 3.6, 18);
    rimLight.position.set(-5.5, 4.5, -4);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0xedff8c, 2.8, 16);
    accentLight.position.set(5, 3.8, 3.5);
    scene.add(accentLight);

    // Root Stage Group
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Ground Diorama Platform (#FFFFFF in Light Mode, #12161D in Dark Mode)
    const platformGeo = new THREE.CylinderGeometry(6.8, 7.15, 0.5, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xffffff : 0x12161d,
      roughness: 0.48,
      metalness: 0.06,
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -0.25;
    platformMesh.receiveShadow = true;
    stageGroup.add(platformMesh);

    // Teal #309F92 Trim Ring around Stage
    const stageRingGeo = new THREE.TorusGeometry(6.92, 0.055, 20, 72);
    stageRingGeo.rotateX(Math.PI / 2);
    const stageRingMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });
    const stageRingMesh = new THREE.Mesh(stageRingGeo, stageRingMat);
    stageRingMesh.position.y = 0.01;
    stageGroup.add(stageRingMesh);

    // =========================================================================
    // 1. COMPOSITE HERO PROP: 3D ISOMETRIC TURNTABLE DECK + BAUHAUS STAND CUBE
    // =========================================================================
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(-0.95, 0, 0.35);
    stageGroup.add(turntableGroup);

    // Part 1: Plinth Deck Base
    const plinthGeo = new THREE.BoxGeometry(4.2, 0.48, 3.45);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xf5f5f3 : 0x181e27,
      roughness: 0.3,
      metalness: 0.2,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.24;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    turntableGroup.add(plinthMesh);

    // Part 2: Anodized Top Plate Trim
    const topPlateGeo = new THREE.BoxGeometry(3.96, 0.06, 3.22);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xe5e5e2 : 0x222a36,
      roughness: 0.25,
      metalness: 0.45,
    });
    const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
    topPlateMesh.position.y = 0.51;
    turntableGroup.add(topPlateMesh);

    // Part 3: Machined Aluminum Platter
    const platterGroup = new THREE.Group();
    platterGroup.position.set(-0.36, 0.56, 0);
    turntableGroup.add(platterGroup);

    const platterGeo = new THREE.CylinderGeometry(1.48, 1.52, 0.12, 48);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.2,
      metalness: 0.85,
    });
    const platterMesh = new THREE.Mesh(platterGeo, platterMat);
    platterGroup.add(platterMesh);

    // Part 4: 12-Inch Grooved Vinyl Record Disc
    const grooveTex = createVinylGrooveTexture(maxAnisotropy);
    const vinylGeo = new THREE.CylinderGeometry(1.42, 1.42, 0.04, 48);
    const vinylMat = new THREE.MeshStandardMaterial({
      map: grooveTex,
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.35,
    });
    const vinylMesh = new THREE.Mesh(vinylGeo, vinylMat);
    vinylMesh.position.y = 0.08;
    platterGroup.add(vinylMesh);

    // Part 5: Acid-Lime & Teal Record Center Label (#EDFF8C / #309F92)
    const labelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.045, 32);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.28,
      roughness: 0.35,
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

    // Part 7: Tonearm Assembly
    const tonearmPivot = new THREE.Group();
    tonearmPivot.position.set(1.38, 0.62, -1.0);
    turntableGroup.add(tonearmPivot);

    const pivotBaseGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.22, 24);
    const pivotBaseMesh = new THREE.Mesh(pivotBaseGeo, platterMat);
    tonearmPivot.add(pivotBaseMesh);

    const armTubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.95, 12);
    armTubeGeo.rotateX(Math.PI / 2);
    const armTubeMesh = new THREE.Mesh(armTubeGeo, spindleMat);
    armTubeMesh.position.set(-0.18, 0.14, 0.88);
    armTubeMesh.rotation.y = -0.18;
    tonearmPivot.add(armTubeMesh);

    // Part 8: Cartridge Headshell & Glowing Stylus
    const cartridgeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.3);
    const cartridgeMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const cartridgeMesh = new THREE.Mesh(cartridgeGeo, cartridgeMat);
    cartridgeMesh.position.set(-0.34, 0.12, 1.82);
    cartridgeMesh.rotation.y = -0.25;
    tonearmPivot.add(cartridgeMesh);

    // Part 9: Tactile Start Button on Deck
    const startBtnGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24);
    const startBtnMesh = new THREE.Mesh(startBtnGeo, cartridgeMat);
    startBtnMesh.position.set(-1.65, 0.54, 1.18);
    turntableGroup.add(startBtnMesh);

    // =========================================================================
    // 1B. SCULPTED BAUHAUS #EDFF8C SPEAKER CUBE ON 4-LEG STAND (IMG_5844!)
    // =========================================================================
    const bauhausCubeTex = createBauhausCubeTexture(maxAnisotropy);
    const speakerCubeGroup = new THREE.Group();
    speakerCubeGroup.position.set(-2.9, 0.02, -1.65);
    speakerCubeGroup.rotation.y = 0.42;
    stageGroup.add(speakerCubeGroup);

    const standMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.35,
      metalness: 0.6,
    });

    // 4 architectural stand legs + frame (exact replica of IMG_5844 right photo!)
    const legGeo = new THREE.BoxGeometry(0.08, 0.44, 0.08);
    const legOffsets = [
      [-0.44, 0.22, -0.44],
      [0.44, 0.22, -0.44],
      [-0.44, 0.22, 0.44],
      [0.44, 0.22, 0.44],
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, standMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      speakerCubeGroup.add(leg);
    }

    const standTopFrameGeo = new THREE.BoxGeometry(1.02, 0.07, 1.02);
    const standTopFrame = new THREE.Mesh(standTopFrameGeo, standMat);
    standTopFrame.position.y = 0.44;
    speakerCubeGroup.add(standTopFrame);

    const cubeBodyGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const cubeBodyMat = new THREE.MeshStandardMaterial({
      map: bauhausCubeTex,
      roughness: 0.28,
      metalness: 0.05,
    });
    const cubeBodyMesh = new THREE.Mesh(cubeBodyGeo, cubeBodyMat);
    cubeBodyMesh.position.y = 0.98;
    cubeBodyMesh.castShadow = true;
    speakerCubeGroup.add(cubeBodyMesh);

    // =========================================================================
    // 2. SMOOTH KAWAII NINTENDO / POP-MART VINYL TOY MASCOT
    // =========================================================================
    const ribbedBumpTex = createRibbedKnitBumpTexture();
    const peanutBumpTex = createPeanutWaffleBumpTexture();

    const mascotGroup = new THREE.Group();
    mascotGroup.position.set(2.25, 0.02, 0.72);
    mascotGroup.rotation.y = 0.28;
    stageGroup.add(mascotGroup);

    // Soft Contact Shadow under Mascot
    const shadowGeo = new THREE.CircleGeometry(1.1, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const mascotShadow = new THREE.Mesh(shadowGeo, shadowMat);
    mascotShadow.position.set(2.25, 0.015, 0.72);
    stageGroup.add(mascotShadow);

    const vinylSkinMat = new THREE.MeshPhysicalMaterial({
      color: 0xfcead8,
      roughness: 0.34,
      metalness: 0.02,
      clearcoat: 0.14,
      clearcoatRoughness: 0.45,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xffd8cc),
    });

    const peanutSuitMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6b87d,
      bumpMap: peanutBumpTex,
      bumpScale: 0.035,
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: 0.08,
    });

    const sageHatMat = new THREE.MeshPhysicalMaterial({
      color: 0x9cb094,
      bumpMap: ribbedBumpTex,
      bumpScale: 0.04,
      roughness: 0.58,
      metalness: 0.02,
    });

    const blueBeanieMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ca1c4,
      bumpMap: ribbedBumpTex,
      bumpScale: 0.045,
      roughness: 0.52,
      metalness: 0.02,
    });

    const pinkBowMat = new THREE.MeshPhysicalMaterial({
      color: 0xf294a7,
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.15,
    });

    const hairMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b2219,
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.18,
    });

    const scooterMintMat = new THREE.MeshPhysicalMaterial({
      color: 0x309f92,
      roughness: 0.26,
      metalness: 0.15,
      clearcoat: 0.25,
    });

    const darkWheelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.3,
    });

    const mascotRig = new THREE.Group();
    mascotRig.position.y = 0.0;
    mascotGroup.add(mascotRig);

    const footGeo = new THREE.CapsuleGeometry(0.24, 0.2, 16, 24);
    const leftFoot = new THREE.Mesh(footGeo, vinylSkinMat);
    leftFoot.position.set(-0.28, 0.28, 0.04);
    leftFoot.castShadow = true;
    mascotRig.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, vinylSkinMat);
    rightFoot.position.set(0.28, 0.28, 0.04);
    rightFoot.castShadow = true;
    mascotRig.add(rightFoot);

    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.92;
    mascotRig.add(torsoGroup);

    const bellyGeo = new THREE.SphereGeometry(0.74, 40, 40);
    bellyGeo.scale(1.02, 1.08, 0.92);
    const bellyMesh = new THREE.Mesh(bellyGeo, peanutSuitMat);
    bellyMesh.castShadow = true;
    bellyMesh.receiveShadow = true;
    torsoGroup.add(bellyMesh);

    const collarGeo = new THREE.TorusGeometry(0.52, 0.13, 20, 40);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, peanutSuitMat);
    collarMesh.position.y = 0.62;
    torsoGroup.add(collarMesh);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.98;
    mascotRig.add(headGroup);

    const headSphereGeo = new THREE.SphereGeometry(0.76, 48, 48);
    headSphereGeo.scale(1.08, 0.96, 0.95);
    const headSphereMesh = new THREE.Mesh(headSphereGeo, vinylSkinMat);
    headSphereMesh.castShadow = true;
    headGroup.add(headSphereMesh);

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    updateVinylToyFaceCanvas(
      faceCanvas,
      propsRef.current.mascotState,
      propsRef.current.characterId,
      0,
      false
    );
    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.anisotropy = maxAnisotropy;

    const facePatchGeo = new THREE.SphereGeometry(
      0.768,
      36,
      36,
      Math.PI * 0.25,
      Math.PI * 0.5,
      Math.PI * 0.28,
      Math.PI * 0.48
    );
    facePatchGeo.scale(1.08, 0.96, 0.95);
    const facePatchMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: false,
    });
    const facePatchMesh = new THREE.Mesh(facePatchGeo, facePatchMat);
    headGroup.add(facePatchMesh);

    const hoodRimGeo = new THREE.TorusGeometry(0.74, 0.14, 24, 48);
    const hoodRimMesh = new THREE.Mesh(hoodRimGeo, peanutSuitMat);
    hoodRimMesh.scale.set(1.06, 0.95, 0.9);
    hoodRimMesh.position.set(0, 0.0, 0.15);
    headGroup.add(hoodRimMesh);

    const bangsGroup = new THREE.Group();
    headGroup.add(bangsGroup);

    for (let i = -2; i <= 2; i++) {
      const bangGeo = new THREE.CapsuleGeometry(0.11, 0.22, 12, 16);
      const bangMesh = new THREE.Mesh(bangGeo, hairMat);
      bangMesh.position.set(i * 0.16, 0.34 - Math.abs(i) * 0.03, 0.66 - Math.abs(i) * 0.04);
      bangMesh.rotation.z = i * 0.12;
      bangMesh.rotation.x = -0.25;
      bangsGroup.add(bangMesh);
    }

    const sideLockGeo = new THREE.CapsuleGeometry(0.11, 0.65, 12, 16);
    const leftLock = new THREE.Mesh(sideLockGeo, hairMat);
    leftLock.position.set(-0.62, -0.22, 0.42);
    leftLock.rotation.z = 0.15;
    bangsGroup.add(leftLock);

    const rightLock = new THREE.Mesh(sideLockGeo, hairMat);
    rightLock.position.set(0.62, -0.22, 0.42);
    rightLock.rotation.z = -0.15;
    bangsGroup.add(rightLock);

    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 0.08, -0.18);
    headGroup.add(bowGroup);

    const bowWingGeo = new THREE.ConeGeometry(0.55, 0.85, 24);
    bowWingGeo.scale(1, 1, 0.45);
    const leftBowWing = new THREE.Mesh(bowWingGeo, pinkBowMat);
    leftBowWing.rotation.z = Math.PI / 2 + 0.12;
    leftBowWing.position.set(-0.78, 0, 0);
    bowGroup.add(leftBowWing);

    const rightBowWing = new THREE.Mesh(bowWingGeo, pinkBowMat);
    rightBowWing.rotation.z = -Math.PI / 2 - 0.12;
    rightBowWing.position.set(0.78, 0, 0);
    bowGroup.add(rightBowWing);

    const bucketHatGroup = new THREE.Group();
    bucketHatGroup.position.set(0, 0.78, -0.16);
    bucketHatGroup.rotation.x = -0.36;
    headGroup.add(bucketHatGroup);

    const brimGeo = new THREE.CylinderGeometry(0.76, 0.94, 0.28, 48, 1, false);
    const brimMesh = new THREE.Mesh(brimGeo, sageHatMat);
    brimMesh.castShadow = true;
    bucketHatGroup.add(brimMesh);

    const crownGeo = new THREE.CylinderGeometry(0.72, 0.84, 0.56, 48);
    const crownMesh = new THREE.Mesh(crownGeo, sageHatMat);
    crownMesh.position.y = 0.42;
    crownMesh.castShadow = true;
    bucketHatGroup.add(crownMesh);

    const catBeanieGroup = new THREE.Group();
    catBeanieGroup.position.y = 0.78;
    bucketHatGroup.add(catBeanieGroup);

    const cuffGeo = new THREE.TorusGeometry(0.64, 0.16, 24, 48);
    cuffGeo.rotateX(Math.PI / 2);
    const cuffMesh = new THREE.Mesh(cuffGeo, blueBeanieMat);
    cuffMesh.scale.set(1.05, 1.0, 1.15);
    catBeanieGroup.add(cuffMesh);

    const domeGeo = new THREE.SphereGeometry(0.64, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMesh = new THREE.Mesh(domeGeo, blueBeanieMat);
    domeMesh.position.y = 0.04;
    catBeanieGroup.add(domeMesh);

    const createCatEar = (side: -1 | 1) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.42, 0.46, 0.05);
      earGroup.rotation.z = -side * 0.24;

      const outerEarGeo = new THREE.ConeGeometry(0.24, 0.44, 24);
      outerEarGeo.scale(1, 1, 0.55);
      const outerEar = new THREE.Mesh(outerEarGeo, blueBeanieMat);
      earGroup.add(outerEar);

      const innerEarGeo = new THREE.ConeGeometry(0.14, 0.28, 16);
      innerEarGeo.scale(1, 1, 0.35);
      const innerEarMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
      const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
      innerEar.position.set(0, -0.02, 0.06);
      earGroup.add(innerEar);

      return earGroup;
    };
    catBeanieGroup.add(createCatEar(-1));
    catBeanieGroup.add(createCatEar(1));

    const armsAndScooterGroup = new THREE.Group();
    armsAndScooterGroup.position.set(0, 1.05, 0.68);
    mascotRig.add(armsAndScooterGroup);

    const armGeo = new THREE.CapsuleGeometry(0.16, 0.28, 16, 24);
    const leftArm = new THREE.Mesh(armGeo, vinylSkinMat);
    leftArm.position.set(-0.46, 0.06, -0.08);
    leftArm.rotation.z = -0.85;
    leftArm.rotation.x = 0.45;
    armsAndScooterGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, vinylSkinMat);
    rightArm.position.set(0.46, -0.02, -0.08);
    rightArm.rotation.z = 0.85;
    rightArm.rotation.x = 0.45;
    armsAndScooterGroup.add(rightArm);

    const scooterProp = new THREE.Group();
    scooterProp.position.set(0.02, -0.08, 0.12);
    armsAndScooterGroup.add(scooterProp);

    const deckGeo = new THREE.BoxGeometry(0.56, 0.055, 0.14);
    const deckMesh = new THREE.Mesh(deckGeo, scooterMintMat);
    scooterProp.add(deckMesh);

    const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.46, 12);
    const stemMesh = new THREE.Mesh(stemGeo, scooterMintMat);
    stemMesh.position.set(-0.22, 0.22, 0);
    stemMesh.rotation.z = -0.18;
    scooterProp.add(stemMesh);

    const barGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.24, 12);
    barGeo.rotateX(Math.PI / 2);
    const barMesh = new THREE.Mesh(barGeo, darkWheelMat);
    barMesh.position.set(-0.18, 0.44, 0);
    scooterProp.add(barMesh);

    const wheelGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.05, 20);
    wheelGeo.rotateX(Math.PI / 2);
    const frontWheel = new THREE.Mesh(wheelGeo, darkWheelMat);
    frontWheel.position.set(-0.26, -0.02, 0);
    scooterProp.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, darkWheelMat);
    rearWheel.position.set(0.26, -0.02, 0);
    scooterProp.add(rearWheel);

    // Floating Bauhaus Geometric Shapes (Torus rings, Rounded Cubes, Capsules inspired by IMG_5845 & IMG_5813)
    const shapeCount = 6;
    const floatingShapes: THREE.Mesh[] = [];
    const torusGeo = new THREE.TorusGeometry(0.11, 0.038, 14, 28);
    const cubeShapeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pillShapeGeo = new THREE.CapsuleGeometry(0.06, 0.14, 10, 16);

    const shapeColors = [0x309f92, 0xedff8c, 0xff7a59, 0x4f5bd5, 0x309f92, 0xedff8c];
    for (let i = 0; i < shapeCount; i++) {
      const geo = i % 3 === 0 ? torusGeo : i % 3 === 1 ? cubeShapeGeo : pillShapeGeo;
      const mat = new THREE.MeshStandardMaterial({
        color: shapeColors[i],
        emissive: shapeColors[i],
        emissiveIntensity: 0.35,
        roughness: 0.22,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mascotGroup.add(mesh);
      floatingShapes.push(mesh);
    }

    // =========================================================================
    // 3. 16-BAR 3D ISOMETRIC SPECTRUM EQUALIZER ARC (InstancedMesh)
    // =========================================================================
    const eqCount = 16;
    const eqGeo = new THREE.BoxGeometry(0.34, 1.0, 0.34);
    eqGeo.translate(0, 0.5, 0);
    const eqMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x309f92,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.25,
    });
    const eqInstanced = new THREE.InstancedMesh(eqGeo, eqMat, eqCount);
    eqInstanced.frustumCulled = false;
    stageGroup.add(eqInstanced);

    const eqCoords: Array<{ x: number; z: number; angle: number }> = [];
    for (let i = 0; i < eqCount; i++) {
      const t = i / (eqCount - 1);
      const angle = THREE.MathUtils.lerp(-Math.PI * 0.85, -Math.PI * 0.15, t);
      const radius = 5.25;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      eqCoords.push({ x, z, angle });

      _tempPos.set(x, 0.01, z);
      _tempScale.set(1, 0.4, 1);
      _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      _tempMatrix.compose(_tempPos, _tempQuat, _tempScale);
      eqInstanced.setMatrixAt(i, _tempMatrix);
      // Alternate between Teal #309F92 and Acid Lime #EDFF8C across the arc
      _tempColor.set(i % 2 === 0 ? 0x309f92 : 0xd4eb68);
      eqInstanced.setColorAt(i, _tempColor);
    }
    eqInstanced.instanceMatrix.needsUpdate = true;
    if (eqInstanced.instanceColor) eqInstanced.instanceColor.needsUpdate = true;

    renderer.compile(scene, camera);

    // =========================================================================
    // 4. INTERACTION: RAYCASTING & SWIPE TURNTABLE SCRATCH / MASCOT DANCE SPIN
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactables: THREE.Object3D[] = [
      vinylMesh,
      plinthMesh,
      cubeBodyMesh,
      headSphereMesh,
      bellyMesh,
      brimMesh,
      domeMesh,
    ];

    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let stageTargetRotY = 0;
    let stageTargetRotX = 0;
    let mascotJumpVelocity = 0;
    let mascotJumpY = 0;
    let mascotSpinBoost = 0;
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
        if (
          hitObj === headSphereMesh ||
          hitObj === bellyMesh ||
          hitObj === brimMesh ||
          hitObj === domeMesh
        ) {
          mascotJumpVelocity = 5.2;
          mascotSpinBoost = Math.PI * 2;
          audioEngine.playUiTick(1.38, 'medium');
          propsRef.current.onMascotInteract?.();
        } else if (hitObj === vinylMesh || hitObj === plinthMesh || hitObj === cubeBodyMesh) {
          vinylScratchBoost = 6.5;
          audioEngine.playUiTick(0.92, 'medium');
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
    // 5. 60FPS SIMULATION, KAWAII EXPRESSION & DANCE CHOREOGRAPHY LOOP
    // =========================================================================
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;
    let animFrameId = 0;
    let lastHeadlessRender = 0;
    let lastFaceRedrawMs = 0;

    const animate = (nowMs: number) => {
      animFrameId = requestAnimationFrame(animate);

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
      const isLight = currentProps.themeMode === 'light';

      if (currentProps.characterId === 'pebble') {
        bowGroup.visible = true;
        bucketHatGroup.visible = true;
        catBeanieGroup.visible = true;
        catBeanieGroup.position.y = 0.78;
        bangsGroup.visible = true;
        scooterProp.visible = true;
        _targetSuitColor.set(0xe6b87d);
      } else if (currentProps.characterId === 'bobacat') {
        bowGroup.visible = false;
        bucketHatGroup.visible = true;
        brimMesh.visible = false;
        crownMesh.visible = false;
        catBeanieGroup.visible = true;
        catBeanieGroup.position.y = 0.05;
        bangsGroup.visible = false;
        scooterProp.visible = false;
        _targetSuitColor.set(0xfaf0e4);
      } else {
        bowGroup.visible = false;
        bucketHatGroup.visible = true;
        brimMesh.visible = true;
        crownMesh.visible = true;
        catBeanieGroup.visible = false;
        bangsGroup.visible = false;
        scooterProp.visible = true;
        _targetSuitColor.set(0x309f92);
      }
      if (currentProps.characterId !== 'bobacat') {
        brimMesh.visible = true;
        crownMesh.visible = true;
      }
      peanutSuitMat.color.lerp(_targetSuitColor, dt * 6);

      if (nowMs - lastFaceRedrawMs > 65) {
        lastFaceRedrawMs = nowMs;
        const isBlinking = Math.sin(elapsed * 1.9) > 0.96;
        const singOpenAmount = currentProps.isPlayingSnippet
          ? Math.abs(Math.sin(elapsed * 9.5)) * (0.35 + spectrum.energy * 0.65)
          : 0;
        updateVinylToyFaceCanvas(
          faceCanvas,
          currentProps.mascotState,
          currentProps.characterId,
          singOpenAmount,
          isBlinking
        );
        faceTex.needsUpdate = true;
      }

      _targetPrimaryColor.set(currentProps.mood.primaryHex);
      _targetSecondaryColor.set(currentProps.mood.secondaryHex);
      _targetAccentColor.set(currentProps.mood.accentHex);
      _targetBgColor.set(
        isLight ? currentProps.mood.bgLightHex : currentProps.mood.bgDarkHex
      );
      _targetStageColor.set(isLight ? 0xffffff : 0x12161d);
      _targetPlinthColor.set(isLight ? 0xf5f5f3 : 0x181e27);
      _targetTopPlateColor.set(isLight ? 0xe5e5e2 : 0x222a36);

      scene.background = (scene.background as THREE.Color).lerp(_targetBgColor, dt * 4.5);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(_targetBgColor, dt * 4.5);
      }

      platformMat.color.lerp(_targetStageColor, dt * 4.5);
      plinthMat.color.lerp(_targetPlinthColor, dt * 4.5);
      topPlateMat.color.lerp(_targetTopPlateColor, dt * 4.5);
      shadowMat.opacity = THREE.MathUtils.damp(shadowMat.opacity, isLight ? 0.14 : 0.34, 4, dt);

      rimLight.color.lerp(_targetPrimaryColor, dt * 4);
      accentLight.color.lerp(_targetAccentColor, dt * 4);
      stageRingMat.color.lerp(_targetPrimaryColor, dt * 4);
      stageRingMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      labelMat.color.lerp(_targetPrimaryColor, dt * 4);
      labelMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      cartridgeMat.color.lerp(_targetPrimaryColor, dt * 4);
      cartridgeMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      eqMat.emissive.lerp(_targetPrimaryColor, dt * 4);

      // Subtle bass pulse on the Bauhaus #EDFF8C speaker cube
      const cubeScale = 1 + (currentProps.isPlayingSnippet ? spectrum.bass * 0.08 : 0.01 * Math.sin(elapsed * 2));
      cubeBodyMesh.scale.setScalar(cubeScale);

      // Spin Vinyl Platter
      vinylScratchBoost = THREE.MathUtils.damp(vinylScratchBoost, 0, 4, dt);
      const baseSpinSpeed = currentProps.isPlayingSnippet ? 3.6 : 0.65;
      platterGroup.rotation.y -= (baseSpinSpeed + vinylScratchBoost) * dt;

      const targetTonearmRot = currentProps.isPlayingSnippet ? 0.28 : 0.0;
      tonearmPivot.rotation.y = THREE.MathUtils.damp(
        tonearmPivot.rotation.y,
        targetTonearmRot,
        7,
        dt
      );

      if (!isDragging) {
        stageTargetRotY = THREE.MathUtils.damp(stageTargetRotY, 0, 4, dt);
        stageTargetRotX = THREE.MathUtils.damp(stageTargetRotX, 0, 4, dt);
      }
      stageGroup.rotation.y = THREE.MathUtils.damp(stageGroup.rotation.y, stageTargetRotY, 8, dt);
      stageGroup.rotation.x = THREE.MathUtils.damp(stageGroup.rotation.x, stageTargetRotX, 8, dt);

      const beatFreq = (currentProps.mood.bpm / 60) * Math.PI;
      const danceIntensity =
        currentProps.isPlayingSnippet || currentProps.mascotState === 'celebrating'
          ? 1.0
          : currentProps.mascotState === 'hyped'
          ? 0.85
          : 0.35;

      if (
        (currentProps.mascotState === 'celebrating' || currentProps.mascotState === 'hyped') &&
        mascotJumpY === 0 &&
        Math.random() < 0.07
      ) {
        mascotJumpVelocity = 4.2;
      }

      mascotJumpY += mascotJumpVelocity * dt;
      if (mascotJumpY > 0) {
        mascotJumpVelocity -= 15.0 * dt;
      } else {
        mascotJumpY = 0;
        mascotJumpVelocity = 0;
      }

      mascotSpinBoost = THREE.MathUtils.damp(mascotSpinBoost, 0, 5, dt);

      const rhythmBounce =
        Math.abs(Math.sin(elapsed * beatFreq)) * (0.05 + spectrum.bass * 0.2) * danceIntensity;
      mascotRig.position.y = mascotJumpY + rhythmBounce;

      const squash = 1 + Math.sin(elapsed * beatFreq * 2) * 0.045 * danceIntensity;
      mascotRig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

      mascotRig.rotation.z = Math.sin(elapsed * beatFreq) * 0.08 * danceIntensity;
      mascotRig.rotation.y =
        Math.sin(elapsed * beatFreq * 0.5) * 0.22 * danceIntensity + mascotSpinBoost;

      headGroup.rotation.z =
        Math.sin(elapsed * beatFreq + 0.4) * (0.09 + spectrum.mid * 0.1) * danceIntensity;
      headGroup.rotation.x =
        -0.26 +
        (currentProps.isPlayingSnippet
          ? Math.sin(elapsed * beatFreq * 2) * 0.09
          : Math.sin(elapsed * 1.6) * 0.04);
      bowGroup.rotation.z = Math.sin(elapsed * beatFreq * 2) * 0.12 * danceIntensity;

      leftFoot.position.y =
        0.28 + Math.max(0, Math.sin(elapsed * beatFreq)) * 0.14 * danceIntensity;
      rightFoot.position.y =
        0.28 + Math.max(0, -Math.sin(elapsed * beatFreq)) * 0.14 * danceIntensity;

      armsAndScooterGroup.position.y =
        1.05 + Math.sin(elapsed * beatFreq * 2) * 0.08 * danceIntensity;
      armsAndScooterGroup.rotation.z =
        Math.cos(elapsed * beatFreq) * 0.14 * danceIntensity;

      for (let i = 0; i < shapeCount; i++) {
        const shape = floatingShapes[i];
        const a = elapsed * 1.6 + (i * Math.PI * 2) / shapeCount;
        const r = 1.18 + Math.sin(elapsed * 2.5 + i) * 0.14;
        shape.position.set(
          Math.cos(a) * r,
          1.1 + ((elapsed * 0.75 + i * 0.4) % 2.1),
          Math.sin(a) * r
        );
        const s =
          currentProps.isPlayingSnippet || currentProps.mascotState === 'celebrating'
            ? 0.72 + spectrum.energy * 0.55
            : 0.38;
        shape.scale.setScalar(s);
        shape.rotation.y = elapsed * 1.8;
        shape.rotation.x = elapsed * 1.3;
      }

      for (let i = 0; i < eqCount; i++) {
        const coord = eqCoords[i];
        const binVal = spectrum.bins[i] || 0.1;
        const barHeight = 0.26 + binVal * 2.55;

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
      bauhausCubeTex.dispose();
      ribbedBumpTex.dispose();
      peanutBumpTex.dispose();
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
