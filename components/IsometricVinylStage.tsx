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

  // Anisotropic diagonal sheen
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
 * Generates a vertical ribbed knit bump texture matching the sage bucket hat & blue cat beanie in IMG_5611 / IMG_5644.
 */
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

  // Subtle horizontal knit stitch rows
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

/**
 * Generates a soft organic peanut/cable-knit bump texture matching Pebble's peanut suit in IMG_5611 / IMG_5644.
 */
function createPeanutWaffleBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, 256, 256);

  // Vertical peanut ridges
  for (let x = 0; x < 256; x += 16) {
    const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.5, '#dcdcdc');
    grad.addColorStop(1, '#555555');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 16, 256);
  }

  // Organic horizontal dimples
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

/**
 * Draws the smooth Pop-Mart / Nintendo vinyl toy kawaii facial expression onto a decal canvas.
 * Matches IMG_5611 (winking smile + blue teardrop cheek stickers), IMG_5644 (pouty cat whisker mouth),
 * and IMG_5583 (happy curved ^ ^ eyes).
 */
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

  // Warm porcelain vinyl skin base
  ctx.fillStyle = '#FCEAD8';
  ctx.fillRect(0, 0, w, h);

  // Soft subsurface ambient shading around edges
  const skinGrad = ctx.createRadialGradient(w * 0.5, h * 0.52, w * 0.1, w * 0.5, h * 0.5, w * 0.52);
  skinGrad.addColorStop(0, '#FFF5EB');
  skinGrad.addColorStop(0.75, '#FCEAD8');
  skinGrad.addColorStop(1, '#F3D5BA');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  // Soft airbrushed coral-pink blush cheeks
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

  // Cute sky-blue teardrop cheek stickers (signature look from IMG_5611, IMG_5644 & video!)
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

    // Subtle glossy highlight on teardrop
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
    // BobaCat has a single sky-blue cheek drop on the left cheek (matching IMG_5583 left character!)
    drawTeardrop(108, 296, 0.15, 0.95);
  }

  ctx.strokeStyle = '#2B1B17';
  ctx.fillStyle = '#2B1B17';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // LEFT & RIGHT EYES
  const leftEyeX = 166;
  const rightEyeX = 346;
  const eyeY = 232;

  const drawGlossyKawaiiEye = (ex: number, ey: number, sparkleExtra = false) => {
    // Upper eyelashes (2 cute flicks on outer corner like IMG_5611)
    ctx.lineWidth = 8.5;
    const dir = ex < 256 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(ex + dir * 24, ey - 22);
    ctx.lineTo(ex + dir * 40, ey - 36);
    ctx.moveTo(ex + dir * 30, ey - 8);
    ctx.lineTo(ex + dir * 46, ey - 16);
    ctx.stroke();

    // Big glossy dark espresso iris/pupil
    ctx.fillStyle = '#261815';
    ctx.beginPath();
    ctx.arc(ex, ey, 35, 0, Math.PI * 2);
    ctx.fill();

    // Warm chocolate lower iris crescent
    ctx.fillStyle = '#4A2E24';
    ctx.beginPath();
    ctx.arc(ex, ey + 8, 24, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.fill();

    // Large upper-right specular catchlight (IMG_5611 signature!)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex + 11, ey - 12, 11.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary lower-left catchlight dot
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

    // Cute outer eyelash flicks on wink
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
      // Sprout's signature double happy arc eyes ^ ^ from IMG_5583 right character
      drawWinkingArcEye(leftEyeX, eyeY);
      drawWinkingArcEye(rightEyeX, eyeY);
    } else if (state === 'celebrating' || state === 'hyped') {
      // Joyful sparkling eyes or happy arcs
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
    // BobaCat cool half-lidded plush eyes from IMG_5583 left character
    drawGlossyKawaiiEye(leftEyeX, eyeY);
    drawGlossyKawaiiEye(rightEyeX, eyeY);
    // Cool upper eyelid crop
    ctx.fillStyle = '#FCEAD8';
    ctx.fillRect(leftEyeX - 42, eyeY - 42, 84, 22);
    ctx.fillRect(rightEyeX - 42, eyeY - 42, 84, 22);
  } else {
    // Pebble signature look from IMG_5611 & IMG_5644: Big glossy left eye + cute winking right eye!
    drawGlossyKawaiiEye(leftEyeX, eyeY, state === 'listening');
    drawWinkingArcEye(rightEyeX, eyeY);
  }

  // MOUTH EXPRESSION (Reacts to music singing, smiling, or pouty cat whisker mouth)
  const mouthX = 256;
  const mouthY = 274;
  ctx.strokeStyle = '#2B1B17';
  ctx.fillStyle = '#2B1B17';
  ctx.lineWidth = 9.5;

  if (state === 'sympathy' || (characterId === 'bobacat' && state !== 'celebrating' && singOpenAmount < 0.15)) {
    // Iconic cute cat nose + inverted Y mouth from IMG_5644 & BobaCat in IMG_5583!
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
  } else if (state === 'listening' || singOpenAmount > 0.18 || state === 'celebrating' || state === 'hyped') {
    // Expressive singing / laughing kawaii open mouth (like frames 00:01-00:03 of the attached video!)
    const openH = state === 'celebrating' ? 26 : 14 + singOpenAmount * 22;
    const openW = state === 'celebrating' ? 28 : 22 + singOpenAmount * 8;

    ctx.fillStyle = '#5E2129';
    ctx.beginPath();
    ctx.roundRect(mouthX - openW, mouthY - 6, openW * 2, openH + 10, [8, 8, 24, 24]);
    ctx.fill();

    // Cute coral-pink inner tongue tint
    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.arc(mouthX, mouthY + openH - 2, openW * 0.65, 0, Math.PI);
    ctx.fill();

    // Crisp outline
    ctx.strokeStyle = '#2B1B17';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.roundRect(mouthX - openW, mouthY - 6, openW * 2, openH + 10, [8, 8, 24, 24]);
    ctx.stroke();
  } else {
    // Sweet warm Nintendo vinyl smile (IMG_5611 & IMG_5583 center/right)
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

  // Store latest props in refs so the 60fps loop reads them without re-creating the WebGL context
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
    scene.fog = new THREE.FogExp2(initialBgHex, 0.024);

    // Nintendo 3D Isometric Diorama camera angle with flattering front-3/4 view of the mascot face & vinyl deck
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

    // Soft Nintendo Toybox & Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0xc7d2fe, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 2.35);
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

    const rimLight = new THREE.PointLight(0x4e946b, 3.6, 18);
    rimLight.position.set(-5.5, 4.5, -4);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0x38bdf8, 3.2, 16);
    accentLight.position.set(5, 3.8, 3.5);
    scene.add(accentLight);

    // Root Stage Group (interactive physics tilt on swipe/drag)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Ground Toy Diorama Platform
    const platformGeo = new THREE.CylinderGeometry(6.8, 7.15, 0.5, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xfcf9f2 : 0x0b1c2c,
      roughness: 0.55,
      metalness: 0.08,
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -0.25;
    platformMesh.receiveShadow = true;
    stageGroup.add(platformMesh);

    // Glowing Trim Ring around Stage
    const stageRingGeo = new THREE.TorusGeometry(6.92, 0.055, 20, 72);
    stageRingGeo.rotateX(Math.PI / 2);
    const stageRingMat = new THREE.MeshStandardMaterial({
      color: 0x4e946b,
      emissive: 0x4e946b,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    });
    const stageRingMesh = new THREE.Mesh(stageRingGeo, stageRingMat);
    stageRingMesh.position.y = 0.01;
    stageGroup.add(stageRingMesh);

    // =========================================================================
    // 1. COMPOSITE HERO PROP: 3D ISOMETRIC TURNTABLE DECK (9 DISTINCT PARTS)
    // =========================================================================
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(-0.95, 0, 0.35);
    stageGroup.add(turntableGroup);

    // Part 1: Plinth Deck Base (adapts between warm oat-birch in Light Mode and deep aero-sapphire in Dark Mode)
    const plinthGeo = new THREE.BoxGeometry(4.2, 0.48, 3.45);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xefe9dd : 0x0e2235,
      roughness: 0.32,
      metalness: 0.25,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.24;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    turntableGroup.add(plinthMesh);

    // Part 2: Anodized Top Plate Trim
    const topPlateGeo = new THREE.BoxGeometry(3.96, 0.06, 3.22);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xe0d8c8 : 0x16324c,
      roughness: 0.25,
      metalness: 0.55,
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

    // Part 5: Mood-Reactive Record Center Label
    const labelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.045, 32);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xff4791,
      emissive: 0xff4791,
      emissiveIntensity: 0.3,
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
      color: 0x00d2b8,
      emissive: 0x00d2b8,
      emissiveIntensity: 0.5,
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
    // 2. SMOOTH KAWAII NINTENDO / POP-MART VINYL TOY MASCOT (15 SMOOTH PARTS)
    //    Inspired directly by IMG_5611, IMG_5644, IMG_5583 & Attached Video!
    // =========================================================================
    const ribbedBumpTex = createRibbedKnitBumpTexture();
    const peanutBumpTex = createPeanutWaffleBumpTexture();

    const mascotGroup = new THREE.Group();
    mascotGroup.position.set(2.25, 0.02, 0.72);
    // Face directly toward the front-right camera so kawaii eyes, blush, and smile are front-and-center
    mascotGroup.rotation.y = 0.28;
    stageGroup.add(mascotGroup);

    // Soft Contact Shadow under Mascot
    const shadowGeo = new THREE.CircleGeometry(1.1, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const mascotShadow = new THREE.Mesh(shadowGeo, shadowMat);
    mascotShadow.position.set(2.25, 0.015, 0.72);
    stageGroup.add(mascotShadow);

    // Shared Smooth Vinyl Toy Materials (Subsurface-like matte clearcoat finish)
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
      color: 0x67b894,
      roughness: 0.28,
      metalness: 0.15,
      clearcoat: 0.25,
    });

    const darkWheelMat = new THREE.MeshStandardMaterial({
      color: 0x26262a,
      roughness: 0.4,
      metalness: 0.3,
    });

    // Mascot Root Rig (handles bounce, jump, hip sway, squash & stretch)
    const mascotRig = new THREE.Group();
    mascotRig.position.y = 0.0;
    mascotGroup.add(mascotRig);

    // Part 1 & 2: Plump Rounded Stubby Vinyl Legs/Feet (step to the beat!)
    const footGeo = new THREE.CapsuleGeometry(0.24, 0.2, 16, 24);
    const leftFoot = new THREE.Mesh(footGeo, vinylSkinMat);
    leftFoot.position.set(-0.28, 0.28, 0.04);
    leftFoot.castShadow = true;
    mascotRig.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, vinylSkinMat);
    rightFoot.position.set(0.28, 0.28, 0.04);
    rightFoot.castShadow = true;
    mascotRig.add(rightFoot);

    // Part 3: Smooth Plump Peanut/Sweater Torso (High-poly sphere + collar roll)
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

    // Part 4: Oversized Kawaii Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.98;
    mascotRig.add(headGroup);

    // Smooth Rounded Vinyl Head Sphere
    const headSphereGeo = new THREE.SphereGeometry(0.76, 48, 48);
    headSphereGeo.scale(1.08, 0.96, 0.95);
    const headSphereMesh = new THREE.Mesh(headSphereGeo, vinylSkinMat);
    headSphereMesh.castShadow = true;
    headGroup.add(headSphereMesh);

    // Dynamic Kawaii Face Canvas Mapped onto Front Curved Surface of Head
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

    // Curved front face patch matching the head sphere curvature
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
    // Rotate so the patch faces +Z cleanly
    facePatchGeo.rotateY(0);
    const facePatchMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: false,
    });
    const facePatchMesh = new THREE.Mesh(facePatchGeo, facePatchMat);
    headGroup.add(facePatchMesh);

    // Part 5: Cozy Peanut Hood Rim Framing the Face (IMG_5611 / IMG_5644)
    const hoodRimGeo = new THREE.TorusGeometry(0.74, 0.14, 24, 48);
    const hoodRimMesh = new THREE.Mesh(hoodRimGeo, peanutSuitMat);
    hoodRimMesh.scale.set(1.06, 0.95, 0.9);
    hoodRimMesh.position.set(0, 0.0, 0.15);
    headGroup.add(hoodRimMesh);

    // Part 6: Sculpted 3D Dark-Chocolate Bangs & Side Hair Curls (IMG_5611)
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

    // Twin side hair locks curling down beside the cheeks
    const sideLockGeo = new THREE.CapsuleGeometry(0.11, 0.65, 12, 16);
    const leftLock = new THREE.Mesh(sideLockGeo, hairMat);
    leftLock.position.set(-0.62, -0.22, 0.42);
    leftLock.rotation.z = 0.15;
    bangsGroup.add(leftLock);

    const rightLock = new THREE.Mesh(sideLockGeo, hairMat);
    rightLock.position.set(0.62, -0.22, 0.42);
    rightLock.rotation.z = -0.15;
    bangsGroup.add(rightLock);

    // Part 7: Oversized Pastel-Pink Bow behind the Head (IMG_5611 & IMG_5583!)
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

    // Part 8: Ribbed Sage-Green Bucket Hat (tilted back on the crown so the kawaii eyes & bangs face the camera!)
    const bucketHatGroup = new THREE.Group();
    bucketHatGroup.position.set(0, 0.78, -0.16);
    bucketHatGroup.rotation.x = -0.36;
    headGroup.add(bucketHatGroup);

    // Flared lower brim
    const brimGeo = new THREE.CylinderGeometry(0.76, 0.94, 0.28, 48, 1, false);
    const brimMesh = new THREE.Mesh(brimGeo, sageHatMat);
    brimMesh.castShadow = true;
    bucketHatGroup.add(brimMesh);

    // Upper crown of bucket hat
    const crownGeo = new THREE.CylinderGeometry(0.72, 0.84, 0.56, 48);
    const crownMesh = new THREE.Mesh(crownGeo, sageHatMat);
    crownMesh.position.y = 0.42;
    crownMesh.castShadow = true;
    bucketHatGroup.add(crownMesh);

    // Part 9: Stacked Ribbed Sky-Blue Cat-Ear Beanie (IMG_5611, IMG_5644, IMG_5583!)
    const catBeanieGroup = new THREE.Group();
    catBeanieGroup.position.y = 0.78;
    bucketHatGroup.add(catBeanieGroup);

    // Rolled ribbed beanie cuff
    const cuffGeo = new THREE.TorusGeometry(0.64, 0.16, 24, 48);
    cuffGeo.rotateX(Math.PI / 2);
    const cuffMesh = new THREE.Mesh(cuffGeo, blueBeanieMat);
    cuffMesh.scale.set(1.05, 1.0, 1.15);
    catBeanieGroup.add(cuffMesh);

    // Beanie dome
    const domeGeo = new THREE.SphereGeometry(0.64, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMesh = new THREE.Mesh(domeGeo, blueBeanieMat);
    domeMesh.position.y = 0.04;
    catBeanieGroup.add(domeMesh);

    // Sculpted 3D Cat Ears with Creamy White Inner Triangles
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

    // Part 10: Plump Cream Vinyl Arms & Miniature Mint-Green Kick-Scooter Prop (IMG_5611 & Video!)
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

    // Miniature Mint-Green Kick-Scooter held across front
    const scooterProp = new THREE.Group();
    scooterProp.position.set(0.02, -0.08, 0.12);
    armsAndScooterGroup.add(scooterProp);

    // Scooter deck
    const deckGeo = new THREE.BoxGeometry(0.56, 0.055, 0.14);
    const deckMesh = new THREE.Mesh(deckGeo, scooterMintMat);
    scooterProp.add(deckMesh);

    // Scooter steering stem
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.46, 12);
    const stemMesh = new THREE.Mesh(stemGeo, scooterMintMat);
    stemMesh.position.set(-0.22, 0.22, 0);
    stemMesh.rotation.z = -0.18;
    scooterProp.add(stemMesh);

    // Scooter handlebar
    const barGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.24, 12);
    barGeo.rotateX(Math.PI / 2);
    const barMesh = new THREE.Mesh(barGeo, darkWheelMat);
    barMesh.position.set(-0.18, 0.44, 0);
    scooterProp.add(barMesh);

    // Scooter front & rear wheels
    const wheelGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.05, 20);
    wheelGeo.rotateX(Math.PI / 2);
    const frontWheel = new THREE.Mesh(wheelGeo, darkWheelMat);
    frontWheel.position.set(-0.26, -0.02, 0);
    scooterProp.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, darkWheelMat);
    rearWheel.position.set(0.26, -0.02, 0);
    scooterProp.add(rearWheel);

    // Floating 3D Rhythm / Emotion Orbs around the Mascot
    const noteCount = 6;
    const noteOrbs: THREE.Mesh[] = [];
    const noteGeo = new THREE.OctahedronGeometry(0.11, 1);
    for (let i = 0; i < noteCount; i++) {
      const noteMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff4791 : 0x00d2b8,
        emissive: i % 2 === 0 ? 0xff4791 : 0x00d2b8,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const orb = new THREE.Mesh(noteGeo, noteMat);
      mascotGroup.add(orb);
      noteOrbs.push(orb);
    }

    // =========================================================================
    // 3. 16-BAR 3D ISOMETRIC SPECTRUM EQUALIZER ARC (InstancedMesh)
    // =========================================================================
    const eqCount = 16;
    const eqGeo = new THREE.BoxGeometry(0.36, 1.0, 0.36);
    eqGeo.translate(0, 0.5, 0);
    const eqMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.38,
      roughness: 0.25,
      metalness: 0.35,
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
      _tempColor.setHSL(0.85 - t * 0.35, 0.85, 0.62);
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
          audioEngine.playUiTick(1.38);
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
    // 5. 60FPS SIMULATION, KAWAII EXPRESSION & NINTENDO DANCE CHOREOGRAPHY LOOP
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

      // Configure character outfit visibility & colors based on selected characterId ('pebble' | 'bobacat' | 'sprout')
      if (currentProps.characterId === 'pebble') {
        bowGroup.visible = true;
        bucketHatGroup.visible = true;
        catBeanieGroup.visible = true;
        catBeanieGroup.position.y = 0.78;
        bangsGroup.visible = true;
        scooterProp.visible = true;
        _targetSuitColor.set(0xe6b87d); // Warm peanut suit
      } else if (currentProps.characterId === 'bobacat') {
        bowGroup.visible = false;
        bucketHatGroup.visible = true;
        brimMesh.visible = false;
        crownMesh.visible = false;
        catBeanieGroup.visible = true;
        catBeanieGroup.position.y = 0.05; // Direct blue cat beanie on head
        bangsGroup.visible = false;
        scooterProp.visible = false;
        _targetSuitColor.set(0xfaf0e4); // Cream vinyl kitty body
      } else {
        // 'sprout' (Sage bucket hat buddy)
        bowGroup.visible = false;
        bucketHatGroup.visible = true;
        brimMesh.visible = true;
        crownMesh.visible = true;
        catBeanieGroup.visible = false;
        bangsGroup.visible = false;
        scooterProp.visible = true;
        _targetSuitColor.set(0x4b7457); // Cozy forest knit sweater
      }
      if (currentProps.characterId !== 'bobacat') {
        brimMesh.visible = true;
        crownMesh.visible = true;
      }
      peanutSuitMat.color.lerp(_targetSuitColor, dt * 6);

      // Update Kawaii Facial Expression Canvas (~15fps for blinking & singing lip-sync)
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

      // Smoothly damp Light Mode vs Dark Mode studio colors & mood lighting
      _targetPrimaryColor.set(currentProps.mood.primaryHex);
      _targetSecondaryColor.set(currentProps.mood.secondaryHex);
      _targetAccentColor.set(currentProps.mood.accentHex);
      _targetBgColor.set(
        isLight ? currentProps.mood.bgLightHex : currentProps.mood.bgDarkHex
      );
      _targetStageColor.set(isLight ? 0xfcf9f2 : 0x0b1c2c);
      _targetPlinthColor.set(isLight ? 0xefe9dd : 0x0e2235);
      _targetTopPlateColor.set(isLight ? 0xe0d8c8 : 0x16324c);

      scene.background = (scene.background as THREE.Color).lerp(_targetBgColor, dt * 4.5);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(_targetBgColor, dt * 4.5);
      }

      platformMat.color.lerp(_targetStageColor, dt * 4.5);
      plinthMat.color.lerp(_targetPlinthColor, dt * 4.5);
      topPlateMat.color.lerp(_targetTopPlateColor, dt * 4.5);
      shadowMat.opacity = THREE.MathUtils.damp(shadowMat.opacity, isLight ? 0.16 : 0.36, 4, dt);

      rimLight.color.lerp(_targetPrimaryColor, dt * 4);
      accentLight.color.lerp(_targetAccentColor, dt * 4);
      stageRingMat.color.lerp(_targetPrimaryColor, dt * 4);
      stageRingMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      labelMat.color.lerp(_targetPrimaryColor, dt * 4);
      labelMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      cartridgeMat.color.lerp(_targetAccentColor, dt * 4);
      cartridgeMat.emissive.lerp(_targetAccentColor, dt * 4);
      eqMat.emissive.lerp(_targetSecondaryColor, dt * 4);

      // Spin Vinyl Platter
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

      // =======================================================================
      // NINTENDO-STYLE EXPRESSIVE MASCOT DANCING & SQUASH-AND-STRETCH PHYSICS
      // =======================================================================
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

      // Spin boost decay when tapped
      mascotSpinBoost = THREE.MathUtils.damp(mascotSpinBoost, 0, 5, dt);

      // Rhythmic bounce & squash-and-stretch
      const rhythmBounce =
        Math.abs(Math.sin(elapsed * beatFreq)) * (0.05 + spectrum.bass * 0.2) * danceIntensity;
      mascotRig.position.y = mascotJumpY + rhythmBounce;

      const squash = 1 + Math.sin(elapsed * beatFreq * 2) * 0.045 * danceIntensity;
      mascotRig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

      // Hip sway & playful dance twist (like the attached video!)
      mascotRig.rotation.z = Math.sin(elapsed * beatFreq) * 0.08 * danceIntensity;
      mascotRig.rotation.y =
        Math.sin(elapsed * beatFreq * 0.5) * 0.22 * danceIntensity + mascotSpinBoost;

      // Expressive head tilt, nod & bow wiggle (tilted -0.26 rad up to make eye contact with isometric camera)
      headGroup.rotation.z =
        Math.sin(elapsed * beatFreq + 0.4) * (0.09 + spectrum.mid * 0.1) * danceIntensity;
      headGroup.rotation.x =
        -0.26 +
        (currentProps.isPlayingSnippet
          ? Math.sin(elapsed * beatFreq * 2) * 0.09
          : Math.sin(elapsed * 1.6) * 0.04);
      bowGroup.rotation.z = Math.sin(elapsed * beatFreq * 2) * 0.12 * danceIntensity;

      // Alternating stubby foot steps
      leftFoot.position.y =
        0.28 + Math.max(0, Math.sin(elapsed * beatFreq)) * 0.14 * danceIntensity;
      rightFoot.position.y =
        0.28 + Math.max(0, -Math.sin(elapsed * beatFreq)) * 0.14 * danceIntensity;

      // Arms & miniature mint scooter groove wave (matching the video!)
      armsAndScooterGroup.position.y =
        1.05 + Math.sin(elapsed * beatFreq * 2) * 0.08 * danceIntensity;
      armsAndScooterGroup.rotation.z =
        Math.cos(elapsed * beatFreq) * 0.14 * danceIntensity;

      // Floating 3D Rhythm Orbs around Mascot
      for (let i = 0; i < noteCount; i++) {
        const orb = noteOrbs[i];
        const a = elapsed * 1.8 + (i * Math.PI * 2) / noteCount;
        const r = 1.15 + Math.sin(elapsed * 3 + i) * 0.15;
        orb.position.set(
          Math.cos(a) * r,
          1.1 + ((elapsed * 0.8 + i * 0.4) % 2.2),
          Math.sin(a) * r
        );
        const orbScale =
          currentProps.isPlayingSnippet || currentProps.mascotState === 'celebrating'
            ? 0.7 + spectrum.energy * 0.6
            : 0.35;
        orb.scale.setScalar(orbScale);
        orb.rotation.y = elapsed * 2;
        orb.rotation.x = elapsed * 1.5;
      }

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
