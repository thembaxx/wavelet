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

/**
 * Second-order spring-damper solver for Pixar-grade overlapping action,
 * follow-through, and beat-reactive physical momentum.
 */
class Spring1D {
  value: number;
  velocity = 0;
  stiffness: number;
  damping: number;

  constructor(initialValue = 0, stiffness = 180, damping = 14) {
    this.value = initialValue;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(target: number, dt: number): number {
    const force = (target - this.value) * this.stiffness;
    const drag = -this.velocity * this.damping;
    this.velocity += (force + drag) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  impulse(velDelta: number) {
    this.velocity += velDelta;
  }
}

// Pre-allocated math scratch objects outside render loop (Zero GC)
const _tempMatrix = new THREE.Matrix4();
const _tempPos = new THREE.Vector3();
const _tempScale = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempColor = new THREE.Color();
const _upAxis = new THREE.Vector3(0, 1, 0);
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

  ctx.fillStyle = '#0B0A10';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Micro-grooves with realistic track bands
  for (let r = 82; r < 248; r += 1.8) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const isBandGap = Math.abs(r - 130) < 2 || Math.abs(r - 178) < 2 || Math.abs(r - 215) < 2;
    const shade = isBandGap
      ? 10
      : 16 + Math.floor(14 * Math.sin(r * 0.55) + 6 * Math.cos(r * 0.13));
    ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade + 7})`;
    ctx.lineWidth = isBandGap ? 1.8 : 1.0;
    ctx.stroke();
  }

  // Anisotropic dual bow-tie sheen across the vinyl disc
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.42, 'rgba(255,255,255,0.04)');
  grad.addColorStop(0.48, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  grad.addColorStop(0.52, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.58, 'rgba(255,255,255,0.04)');
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

  // Subtle architectural bevel illumination
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0.38)');
  grad.addColorStop(1, 'rgba(48,159,146,0.09)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 3x3 9-Dot Matrix with #309F92 center dot (matching IMG_5844)
  const spacing = 86;
  const startX = 256 - spacing;
  const startY = 232 - spacing;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const isCenter = row === 1 && col === 1;
      // Subtle acoustic port ring shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.arc(startX + col * spacing, startY + row * spacing + 2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isCenter ? '#309F92' : '#000000';
      ctx.beginPath();
      ctx.arc(startX + col * spacing, startY + row * spacing, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Minimal corner caption ("VINYL" / "365" like IMG_5844)
  ctx.fillStyle = '#000000';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('VINYL', 54, 456);
  ctx.fillText('365', 398, 456);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * High-resolution knitted vertical rib bump map for the sage bucket hat & dusty-blue cat beanie
 * matching IMG_5644 & IMG_5611.
 */
function createRibbedKnitBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Fine vertical knit ribs
  for (let x = 0; x < 512; x += 8) {
    const ribGrad = ctx.createLinearGradient(x, 0, x + 8, 0);
    ribGrad.addColorStop(0, '#3a3a3a');
    ribGrad.addColorStop(0.5, '#efefef');
    ribGrad.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = ribGrad;
    ctx.fillRect(x, 0, 8, 512);
  }

  // Subtle horizontal yarn stitch weave
  for (let y = 0; y < 512; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y, 512, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

/**
 * Organic sculpted peanut-shell waffle & vein relief map matching IMG_5644 & IMG_5611.
 */
function createPeanutWaffleBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 512, 512);

  // Longitudinal peanut shell ridges
  for (let x = 0; x < 512; x += 28) {
    const grad = ctx.createLinearGradient(x, 0, x + 28, 0);
    grad.addColorStop(0, '#464646');
    grad.addColorStop(0.25, '#a8a8a8');
    grad.addColorStop(0.5, '#f2f2f2');
    grad.addColorStop(0.75, '#a8a8a8');
    grad.addColorStop(1, '#464646');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 28, 512);
  }

  // Organic cross-hatch dimples & peanut shell cellular pockets
  ctx.strokeStyle = 'rgba(52,52,52,0.58)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let y = 14; y < 512; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) {
      const waveY = y + Math.sin(x * 0.08 + y * 0.1) * 9;
      ctx.quadraticCurveTo(x - 32, waveY - 6, x, waveY);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.2);
  return tex;
}

/**
 * High-resolution 1024x1024 Pixar/Pop-Mart vinyl face texture with soft airbrushed blush,
 * subsurface skin warmth, and expressive mouth & eye states matching IMG_5644, IMG_5611 & IMG_5583.
 */
function updateVinylToyFaceCanvas(
  canvas: HTMLCanvasElement,
  state: MascotMoodState,
  characterId: MascotCharacterId,
  singOpenAmount: number,
  isBlinking: boolean,
  eyeLookX: number
) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const s = w / 512; // Scale factor for 1024x1024

  ctx.save();
  ctx.scale(s, s);

  // Base creamy porcelain vinyl skin tone
  ctx.fillStyle = '#FCEAD8';
  ctx.fillRect(0, 0, 512, 512);

  // Subsurface warm illumination gradient across face
  const skinGrad = ctx.createRadialGradient(256, 260, 40, 256, 256, 268);
  skinGrad.addColorStop(0, '#FFF7F0');
  skinGrad.addColorStop(0.68, '#FCEAD8');
  skinGrad.addColorStop(1, '#F1D0B3');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft ambient occlusion along top brow under bangs/hat
  const browAO = ctx.createLinearGradient(0, 90, 0, 195);
  browAO.addColorStop(0, 'rgba(130, 82, 54, 0.22)');
  browAO.addColorStop(1, 'rgba(130, 82, 54, 0)');
  ctx.fillStyle = browAO;
  ctx.fillRect(0, 0, 512, 200);

  // Airbrushed rosy cheeks (matching IMG_5611 & IMG_5583)
  const drawBlush = (cx: number, cy: number, radius: number, alpha: number) => {
    const blush = ctx.createRadialGradient(cx, cy, 3, cx, cy, radius);
    blush.addColorStop(0, `rgba(255, 126, 146, ${alpha})`);
    blush.addColorStop(0.55, `rgba(255, 146, 162, ${alpha * 0.48})`);
    blush.addColorStop(1, 'rgba(255, 146, 162, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const blushIntensity = state === 'celebrating' || state === 'hyped' ? 0.72 : 0.54;
  drawBlush(136, 302, 56, blushIntensity);
  drawBlush(376, 302, 56, blushIntensity);

  ctx.strokeStyle = '#261714';
  ctx.fillStyle = '#261714';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leftEyeX = 166 + eyeLookX * 6;
  const rightEyeX = 346 + eyeLookX * 6;
  const eyeY = 232;

  const drawGlossyKawaiiEye = (ex: number, ey: number, sparkleExtra = false) => {
    // Sculpted outer eyelashes (2 flicks on outer corner like IMG_5644 & IMG_5611)
    ctx.strokeStyle = '#261714';
    ctx.lineWidth = 9.5;
    const dir = ex < 256 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(ex + dir * 24, ey - 22);
    ctx.lineTo(ex + dir * 41, ey - 37);
    ctx.moveTo(ex + dir * 30, ey - 7);
    ctx.lineTo(ex + dir * 47, ey - 15);
    ctx.stroke();

    // Deep glossy espresso-black iris
    ctx.fillStyle = '#231512';
    ctx.beginPath();
    ctx.arc(ex, ey, 36, 0, Math.PI * 2);
    ctx.fill();

    // Warm lower iris crescent reflection
    ctx.fillStyle = '#523226';
    ctx.beginPath();
    ctx.arc(ex, ey + 9, 25, 0.14 * Math.PI, 0.86 * Math.PI);
    ctx.fill();

    // Primary large Pixar catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex + 11, ey - 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Secondary lower-left catchlight
    ctx.beginPath();
    ctx.arc(ex - 12, ey + 12, 5.5, 0, Math.PI * 2);
    ctx.fill();

    if (sparkleExtra) {
      ctx.beginPath();
      ctx.arc(ex - 11, ey - 14, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawWinkingArcEye = (ex: number, ey: number, withLashes = true) => {
    ctx.strokeStyle = '#231512';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.arc(ex, ey + 12, 30, 1.14 * Math.PI, 1.86 * Math.PI);
    ctx.stroke();

    if (withLashes) {
      const dir = ex < 256 ? -1 : 1;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(ex + dir * 24, ey - 6);
      ctx.lineTo(ex + dir * 39, ey - 18);
      ctx.moveTo(ex + dir * 28, ey + 5);
      ctx.lineTo(ex + dir * 43, ey + 2);
      ctx.stroke();
    }
  };

  // Eye rendering per character and emotional state
  if (characterId === 'sprout') {
    // Sprout (IMG_5583 right): joyful curved ^ ^ eyes when idle/celebrating, or sparkling when hyped
    if (state === 'hyped' && !isBlinking) {
      drawGlossyKawaiiEye(leftEyeX, eyeY, true);
      drawWinkingArcEye(rightEyeX, eyeY, false);
    } else {
      drawWinkingArcEye(leftEyeX, eyeY, false);
      drawWinkingArcEye(rightEyeX, eyeY, false);
    }
  } else if (characterId === 'bobacat') {
    // BobaCat (IMG_5583 left): cool half-lidded eyes with flat upper eyelid line
    if (isBlinking) {
      drawWinkingArcEye(leftEyeX, eyeY, false);
      drawWinkingArcEye(rightEyeX, eyeY, false);
    } else if (state === 'celebrating' || state === 'hyped') {
      drawGlossyKawaiiEye(leftEyeX, eyeY, true);
      drawGlossyKawaiiEye(rightEyeX, eyeY, true);
    } else {
      drawGlossyKawaiiEye(leftEyeX, eyeY, false);
      drawGlossyKawaiiEye(rightEyeX, eyeY, false);
      // Cool half-lidded upper mask (exact match to IMG_5583 left cat!)
      ctx.fillStyle = '#FCEAD8';
      ctx.fillRect(leftEyeX - 44, eyeY - 44, 88, 25);
      ctx.fillRect(rightEyeX - 44, eyeY - 44, 88, 25);
    }
  } else {
    // Pebble (IMG_5644 & IMG_5611): Signature left glossy kawaii eye + right playful wink!
    if (isBlinking) {
      drawWinkingArcEye(leftEyeX, eyeY, true);
      drawWinkingArcEye(rightEyeX, eyeY, true);
    } else {
      drawGlossyKawaiiEye(leftEyeX, eyeY, state === 'celebrating' || state === 'hyped' || state === 'listening');
      drawWinkingArcEye(rightEyeX, eyeY, true);
    }
  }

  // Mouth / Nose Expression (matching IMG_5644 cat-pout vs IMG_5611 sweet smile vs singing)
  const mouthX = 256;
  const mouthY = 274;
  ctx.strokeStyle = '#261714';
  ctx.fillStyle = '#261714';
  ctx.lineWidth = 10;

  if (
    state === 'sympathy' ||
    (characterId === 'bobacat' && state !== 'celebrating' && singOpenAmount < 0.15)
  ) {
    // Cute rounded-triangle nose + inverted-Y pout (exact match to IMG_5644 & IMG_5583 left!)
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY - 13, 13.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny specular highlight on nose
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(mouthX - 4, mouthY - 16, 4, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#261714';
    ctx.beginPath();
    ctx.moveTo(mouthX, mouthY - 5);
    ctx.lineTo(mouthX, mouthY + 11);
    ctx.moveTo(mouthX, mouthY + 11);
    ctx.lineTo(mouthX - 18, mouthY + 24);
    ctx.moveTo(mouthX, mouthY + 11);
    ctx.lineTo(mouthX + 18, mouthY + 24);
    ctx.stroke();
  } else if (
    state === 'listening' ||
    singOpenAmount > 0.18 ||
    state === 'celebrating' ||
    state === 'hyped'
  ) {
    const openH = state === 'celebrating' ? 27 : 13 + singOpenAmount * 23;
    const openW = state === 'celebrating' ? 28 : 21 + singOpenAmount * 9;

    ctx.fillStyle = '#5E2129';
    ctx.beginPath();
    ctx.roundRect(mouthX - openW, mouthY - 6, openW * 2, openH + 10, [9, 9, 26, 26]);
    ctx.fill();

    ctx.fillStyle = '#FF8FA3';
    ctx.beginPath();
    ctx.arc(mouthX, mouthY + openH - 2, openW * 0.65, 0, Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#261714';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(mouthX - openW, mouthY - 6, openW * 2, openH + 10, [9, 9, 26, 26]);
    ctx.stroke();
  } else {
    // Sweet curved smile (matching IMG_5611 & IMG_5583 center/right!)
    ctx.beginPath();
    ctx.arc(mouthX, mouthY - 4, 21, 0.14 * Math.PI, 0.86 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
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
    scene.fog = new THREE.FogExp2(initialBgHex, 0.02);

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 140);
    const updateCameraFraming = (w: number, h: number) => {
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      const portraitZoom = aspect < 0.85 ? THREE.MathUtils.clamp(0.82 / aspect, 1.0, 1.48) : 1.0;
      const yLookOffset = aspect < 0.85 ? -0.32 : 0.08;
      camera.position.set(5.6 * portraitZoom, 6.05 * portraitZoom, 11.2 * portraitZoom);
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
    renderer.toneMappingExposure = 1.14;
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

    // =========================================================================
    // 0. PIXAR STUDIO THREE-POINT WARM/COOL LIGHTING RIG
    // =========================================================================
    const hemiLight = new THREE.HemisphereLight(0xfffaf2, 0xcad4df, 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffcf5, 2.45);
    keyLight.position.set(6.8, 13.5, 8.5);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      const d = 7.8;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x309f92, 3.8, 18);
    rimLight.position.set(-5.6, 4.8, -4.2);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0xedff8c, 3.1, 16);
    accentLight.position.set(5.2, 4.1, 3.8);
    scene.add(accentLight);

    // Warm Stylus Needle Pool Light over the Vinyl Platter
    const stylusSpotLight = new THREE.PointLight(0xedff8c, 1.8, 4.5);
    stylusSpotLight.position.set(-0.2, 1.15, 0.9);
    scene.add(stylusSpotLight);

    // Root Stage Group
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Multi-layered Architectural Diorama Pedestal
    const platformGeo = new THREE.CylinderGeometry(6.9, 7.25, 0.54, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xffffff : 0x12161d,
      roughness: 0.42,
      metalness: 0.06,
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -0.27;
    platformMesh.receiveShadow = true;
    stageGroup.add(platformMesh);

    // Recessed Woven Studio Rug Pad under Turntable & Mascot (offset Y >= 0.02 for zero Z-fighting)
    const rugGeo = new THREE.CylinderGeometry(5.15, 5.2, 0.03, 64);
    const rugMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xf3f4f1 : 0x181d26,
      roughness: 0.82,
      metalness: 0.02,
    });
    const rugMesh = new THREE.Mesh(rugGeo, rugMat);
    rugMesh.position.y = 0.015;
    rugMesh.receiveShadow = true;
    stageGroup.add(rugMesh);

    // Harmonic Beat Pulse Rings on the Stage Floor
    const pulseRingGeo = new THREE.TorusGeometry(5.22, 0.035, 16, 72);
    pulseRingGeo.rotateX(Math.PI / 2);
    const pulseRingMat = new THREE.MeshStandardMaterial({
      color: 0xedff8c,
      emissive: 0x309f92,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const pulseRingMesh = new THREE.Mesh(pulseRingGeo, pulseRingMat);
    pulseRingMesh.position.y = 0.032;
    stageGroup.add(pulseRingMesh);

    // Outer Teal #309F92 Trim Ring around Stage
    const stageRingGeo = new THREE.TorusGeometry(6.98, 0.06, 20, 72);
    stageRingGeo.rotateX(Math.PI / 2);
    const stageRingMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.55,
      roughness: 0.22,
    });
    const stageRingMesh = new THREE.Mesh(stageRingGeo, stageRingMat);
    stageRingMesh.position.y = 0.012;
    stageGroup.add(stageRingMesh);

    // =========================================================================
    // 1. COMPOSITE HERO PROP: AUDIOPHILE ISOMETRIC TURNTABLE DECK (12 PARTS)
    // =========================================================================
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(-0.98, 0.03, 0.38);
    stageGroup.add(turntableGroup);

    // Soft Contact Shadow beneath Turntable
    const ttShadowGeo = new THREE.PlaneGeometry(4.6, 3.85);
    ttShadowGeo.rotateX(-Math.PI / 2);
    const ttShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const ttShadowMesh = new THREE.Mesh(ttShadowGeo, ttShadowMat);
    ttShadowMesh.position.y = 0.005;
    turntableGroup.add(ttShadowMesh);

    // Part 1: 4 Machined Isolation Feet with Gold Trim
    const isoFootGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.12, 24);
    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.22,
      metalness: 0.88,
    });
    const footCoords = [
      [-1.75, 0.06, -1.38],
      [1.75, 0.06, -1.38],
      [-1.75, 0.06, 1.38],
      [1.75, 0.06, 1.38],
    ];
    for (const [fx, fy, fz] of footCoords) {
      const fMesh = new THREE.Mesh(isoFootGeo, brassTrimMat);
      fMesh.position.set(fx, fy, fz);
      turntableGroup.add(fMesh);
    }

    // Part 2: Architectural Plinth Deck Base
    const plinthGeo = new THREE.BoxGeometry(4.24, 0.46, 3.48);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xf6f6f3 : 0x181e27,
      roughness: 0.28,
      metalness: 0.18,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.32;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    turntableGroup.add(plinthMesh);

    // Part 3: Brushed Anodized Top Plate
    const topPlateGeo = new THREE.BoxGeometry(3.98, 0.06, 3.24);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: propsRef.current.themeMode === 'light' ? 0xe5e5e2 : 0x222a36,
      roughness: 0.22,
      metalness: 0.52,
    });
    const topPlateMesh = new THREE.Mesh(topPlateGeo, topPlateMat);
    topPlateMesh.position.y = 0.58;
    turntableGroup.add(topPlateMesh);

    // Part 4: Machined Aluminum Strobe Platter
    const platterGroup = new THREE.Group();
    platterGroup.position.set(-0.38, 0.64, 0);
    turntableGroup.add(platterGroup);

    const platterGeo = new THREE.CylinderGeometry(1.5, 1.56, 0.14, 64);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0xd8dce3,
      roughness: 0.18,
      metalness: 0.88,
    });
    const platterMesh = new THREE.Mesh(platterGeo, platterMat);
    platterGroup.add(platterMesh);

    // Part 5: 12-Inch Micro-Grooved Vinyl Record Disc with Clearcoat
    const grooveTex = createVinylGrooveTexture(maxAnisotropy);
    const vinylGeo = new THREE.CylinderGeometry(1.44, 1.44, 0.042, 64);
    const vinylMat = new THREE.MeshPhysicalMaterial({
      map: grooveTex,
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0.25,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    });
    const vinylMesh = new THREE.Mesh(vinylGeo, vinylMat);
    vinylMesh.position.y = 0.085;
    platterGroup.add(vinylMesh);

    // Part 6: Center Record Label + Acid-Lime Outer Ring (#EDFF8C / #309F92)
    const labelOuterGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.046, 40);
    const labelOuterMat = new THREE.MeshStandardMaterial({
      color: 0xedff8c,
      roughness: 0.3,
    });
    const labelOuterMesh = new THREE.Mesh(labelOuterGeo, labelOuterMat);
    labelOuterMesh.position.y = 0.088;
    platterGroup.add(labelOuterMesh);

    const labelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 40);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.32,
      roughness: 0.3,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.091;
    platterGroup.add(labelMesh);

    // Part 7: Chrome Center Spindle & Record Clamp Weight
    const spindleGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.28, 20);
    const spindleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.08,
      metalness: 0.96,
    });
    const spindleMesh = new THREE.Mesh(spindleGeo, spindleMat);
    spindleMesh.position.y = 0.16;
    platterGroup.add(spindleMesh);

    // Part 8: Precision Gimbal Tonearm Assembly + Counterweight
    const tonearmPivot = new THREE.Group();
    tonearmPivot.position.set(1.38, 0.68, -0.98);
    turntableGroup.add(tonearmPivot);

    const pivotBaseGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.24, 28);
    const pivotBaseMesh = new THREE.Mesh(pivotBaseGeo, platterMat);
    tonearmPivot.add(pivotBaseMesh);

    // Counterweight cylinder at rear of tonearm
    const counterweightGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.28, 24);
    counterweightGeo.rotateX(Math.PI / 2);
    const counterweightMesh = new THREE.Mesh(counterweightGeo, brassTrimMat);
    counterweightMesh.position.set(0.08, 0.16, -0.34);
    tonearmPivot.add(counterweightMesh);

    const armTubeGeo = new THREE.CylinderGeometry(0.034, 0.034, 1.98, 16);
    armTubeGeo.rotateX(Math.PI / 2);
    const armTubeMesh = new THREE.Mesh(armTubeGeo, spindleMat);
    armTubeMesh.position.set(-0.18, 0.15, 0.88);
    armTubeMesh.rotation.y = -0.18;
    tonearmPivot.add(armTubeMesh);

    // Part 9: Cartridge Headshell & Glowing Diamond Stylus
    const cartridgeGeo = new THREE.BoxGeometry(0.19, 0.11, 0.32);
    const cartridgeMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.5,
      roughness: 0.22,
    });
    const cartridgeMesh = new THREE.Mesh(cartridgeGeo, cartridgeMat);
    cartridgeMesh.position.set(-0.34, 0.13, 1.82);
    cartridgeMesh.rotation.y = -0.25;
    tonearmPivot.add(cartridgeMesh);

    // Part 10: Pitch Slider Track & Fader Knob on Right Flank of Deck
    const faderTrackGeo = new THREE.BoxGeometry(0.16, 0.03, 1.15);
    const faderTrackMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
    });
    const faderTrackMesh = new THREE.Mesh(faderTrackGeo, faderTrackMat);
    faderTrackMesh.position.set(1.62, 0.62, 0.55);
    turntableGroup.add(faderTrackMesh);

    const faderKnobGeo = new THREE.BoxGeometry(0.24, 0.1, 0.14);
    const faderKnobMesh = new THREE.Mesh(faderKnobGeo, spindleMat);
    faderKnobMesh.position.set(1.62, 0.66, 0.55);
    turntableGroup.add(faderKnobMesh);

    // Part 11: Tactile Start/Stop Button + Strobe Illuminator Tower
    const startBtnGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.09, 28);
    const startBtnMesh = new THREE.Mesh(startBtnGeo, cartridgeMat);
    startBtnMesh.position.set(-1.66, 0.62, 1.2);
    turntableGroup.add(startBtnMesh);

    const rpmDialGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.12, 24);
    const rpmDialMesh = new THREE.Mesh(rpmDialGeo, brassTrimMat);
    rpmDialMesh.position.set(-1.18, 0.63, 1.24);
    turntableGroup.add(rpmDialMesh);

    // =========================================================================
    // 1B. SCULPTED BAUHAUS #EDFF8C SPEAKER CUBE ON 4-LEG STAND (IMG_5844!)
    // =========================================================================
    const bauhausCubeTex = createBauhausCubeTexture(maxAnisotropy);
    const speakerCubeGroup = new THREE.Group();
    speakerCubeGroup.position.set(-2.95, 0.03, -1.62);
    speakerCubeGroup.rotation.y = 0.44;
    stageGroup.add(speakerCubeGroup);

    const standMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.32,
      metalness: 0.65,
    });

    // 4 architectural stand legs + frame (exact replica of IMG_5844 right photo!)
    const legGeo = new THREE.BoxGeometry(0.085, 0.46, 0.085);
    const legOffsets = [
      [-0.45, 0.23, -0.45],
      [0.45, 0.23, -0.45],
      [-0.45, 0.23, 0.45],
      [0.45, 0.23, 0.45],
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, standMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      speakerCubeGroup.add(leg);
    }

    const standTopFrameGeo = new THREE.BoxGeometry(1.06, 0.075, 1.06);
    const standTopFrame = new THREE.Mesh(standTopFrameGeo, standMat);
    standTopFrame.position.y = 0.46;
    speakerCubeGroup.add(standTopFrame);

    const cubeBodyGeo = new THREE.BoxGeometry(1.04, 1.04, 1.04);
    const cubeBodyMat = new THREE.MeshStandardMaterial({
      map: bauhausCubeTex,
      color: 0xffffff,
      roughness: 0.26,
      metalness: 0.05,
    });
    const cubeBodyMesh = new THREE.Mesh(cubeBodyGeo, cubeBodyMat);
    cubeBodyMesh.position.y = 1.01;
    cubeBodyMesh.castShadow = true;
    speakerCubeGroup.add(cubeBodyMesh);

    // Center Teal Sub-Bass Dome Driver on the front face of the Bauhaus Cube
    const driverDomeGeo = new THREE.SphereGeometry(0.09, 20, 20);
    driverDomeGeo.scale(1, 1, 0.45);
    const driverDomeMat = new THREE.MeshStandardMaterial({
      color: 0x309f92,
      emissive: 0x309f92,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const driverDomeMesh = new THREE.Mesh(driverDomeGeo, driverDomeMat);
    driverDomeMesh.position.set(0, 1.05, 0.525);
    speakerCubeGroup.add(driverDomeMesh);

    // =========================================================================
    // 1C. WARM VACUUM TUBE PREAMP & WOODEN VINYL RECORD CRATE (STUDIO PROPS)
    // =========================================================================
    const tubeAmpGroup = new THREE.Group();
    tubeAmpGroup.position.set(-2.95, 0.03, 1.35);
    tubeAmpGroup.rotation.y = 0.28;
    stageGroup.add(tubeAmpGroup);

    const ampChassisGeo = new THREE.BoxGeometry(0.95, 0.28, 0.68);
    const ampChassisMesh = new THREE.Mesh(ampChassisGeo, standMat);
    ampChassisMesh.position.y = 0.14;
    ampChassisMesh.castShadow = true;
    tubeAmpGroup.add(ampChassisMesh);

    const tubeGlassGeo = new THREE.CapsuleGeometry(0.065, 0.14, 10, 14);
    const tubeGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffb74d,
      emissive: 0xff7a00,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.88,
    });
    const vacuumTubes: THREE.Mesh[] = [];
    for (let t = -1; t <= 1; t++) {
      const tube = new THREE.Mesh(tubeGlassGeo, tubeGlowMat);
      tube.position.set(t * 0.26, 0.36, -0.06);
      tubeAmpGroup.add(tube);
      vacuumTubes.push(tube);
    }

    // Wooden Vinyl Record Crate on Rear-Right Flank
    const vinylCrateGroup = new THREE.Group();
    vinylCrateGroup.position.set(0.78, 0.03, -2.05);
    vinylCrateGroup.rotation.y = -0.24;
    stageGroup.add(vinylCrateGroup);

    const crateWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd8b48a,
      roughness: 0.62,
      metalness: 0.04,
    });
    const crateBoxGeo = new THREE.BoxGeometry(1.18, 0.68, 0.92);
    const crateBoxMesh = new THREE.Mesh(crateBoxGeo, crateWoodMat);
    crateBoxMesh.position.y = 0.34;
    crateBoxMesh.castShadow = true;
    crateBoxMesh.receiveShadow = true;
    vinylCrateGroup.add(crateBoxMesh);

    const sleeveGeo = new THREE.BoxGeometry(1.02, 0.96, 0.035);
    const sleeveColors = [0x309f92, 0xedff8c, 0xf294a7, 0x7ca1c4, 0xff8a5b];
    const crateSleeves: THREE.Mesh[] = [];
    for (let s = 0; s < 5; s++) {
      const sMat = new THREE.MeshStandardMaterial({
        color: sleeveColors[s],
        roughness: 0.35,
      });
      const sleeve = new THREE.Mesh(sleeveGeo, sMat);
      sleeve.position.set((s - 2) * 0.02, 0.56, -0.26 + s * 0.13);
      sleeve.rotation.x = -0.14 + s * 0.04;
      sleeve.castShadow = true;
      vinylCrateGroup.add(sleeve);
      crateSleeves.push(sleeve);
    }

    // =========================================================================
    // 2. PIXAR-LEVEL KAWAII NINTENDO / POP-MART VINYL TOY MASCOT
    //    (Direct match to IMG_5644, IMG_5611, and IMG_5583!)
    // =========================================================================
    const ribbedBumpTex = createRibbedKnitBumpTexture();
    const peanutBumpTex = createPeanutWaffleBumpTexture();

    const mascotGroup = new THREE.Group();
    mascotGroup.position.set(2.12, 0.03, 0.65);
    mascotGroup.rotation.y = 0.24;
    mascotGroup.scale.setScalar(0.84);
    stageGroup.add(mascotGroup);

    // Soft Contact Shadow under Mascot
    const shadowGeo = new THREE.CircleGeometry(1.08, 36);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const mascotShadow = new THREE.Mesh(shadowGeo, shadowMat);
    mascotShadow.position.set(2.12, 0.032, 0.65);
    stageGroup.add(mascotShadow);

    // Subsurface-like Soft Vinyl Skin Material
    const vinylSkinMat = new THREE.MeshPhysicalMaterial({
      color: 0xfcead8,
      roughness: 0.32,
      metalness: 0.01,
      clearcoat: 0.18,
      clearcoatRoughness: 0.38,
      sheen: 0.45,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xffd2c4),
    });

    // Sculpted Peanut Shell Suit Material (IMG_5644 & IMG_5611)
    const peanutSuitMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6b87d,
      bumpMap: peanutBumpTex,
      bumpScale: 0.048,
      roughness: 0.46,
      metalness: 0.02,
      clearcoat: 0.1,
      clearcoatRoughness: 0.5,
    });

    // Ribbed Sage Bucket Hat Material (IMG_5644, IMG_5611 & IMG_5583 right)
    const sageHatMat = new THREE.MeshPhysicalMaterial({
      color: 0x9bb092,
      bumpMap: ribbedBumpTex,
      bumpScale: 0.052,
      roughness: 0.56,
      metalness: 0.02,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xc5d6be),
    });

    // Ribbed Dusty-Blue Cat-Ear Beanie Material (IMG_5644, IMG_5611 & IMG_5583 left)
    const blueBeanieMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ca1c4,
      bumpMap: ribbedBumpTex,
      bumpScale: 0.058,
      roughness: 0.5,
      metalness: 0.02,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xaec9e4),
    });

    // Pillowy Satin Pink Ribbon Bow Material (IMG_5583 center & IMG_5611)
    const pinkBowMat = new THREE.MeshPhysicalMaterial({
      color: 0xf294a7,
      roughness: 0.34,
      metalness: 0.02,
      clearcoat: 0.22,
      sheen: 0.55,
      sheenColor: new THREE.Color(0xffcad4),
    });

    // Glossy Chestnut Hair Material
    const hairMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b2219,
      roughness: 0.32,
      metalness: 0.05,
      clearcoat: 0.28,
      clearcoatRoughness: 0.25,
    });

    // Translucent Glossy Pastel-Blue Teardrop Gem Material (IMG_5611 & IMG_5644)
    const teardropGemMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ec4ea,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
    });

    const scooterMintMat = new THREE.MeshPhysicalMaterial({
      color: 0x5cb896,
      roughness: 0.24,
      metalness: 0.16,
      clearcoat: 0.35,
    });

    const darkWheelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.38,
      metalness: 0.35,
    });

    const mascotRig = new THREE.Group();
    mascotRig.position.y = 0.0;
    mascotGroup.add(mascotRig);

    // Chubby Stubby Vinyl Legs & Feet (matching IMG_5644 & IMG_5611)
    const footGeo = new THREE.CapsuleGeometry(0.25, 0.22, 20, 28);
    const leftFoot = new THREE.Mesh(footGeo, vinylSkinMat);
    leftFoot.position.set(-0.29, 0.28, 0.04);
    leftFoot.castShadow = true;
    mascotRig.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, vinylSkinMat);
    rightFoot.position.set(0.29, 0.28, 0.04);
    rightFoot.castShadow = true;
    mascotRig.add(rightFoot);

    // Sculpted Plump Hourglass Peanut Pod Torso (Full rounded bottom bulb + gentle waist pinch!)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.94;
    mascotRig.add(torsoGroup);

    const peanutPoints: THREE.Vector2[] = [];
    const latheSteps = 32;
    for (let i = 0; i <= latheSteps; i++) {
      const t = i / latheSteps; // 0 (bottom) to 1 (top collar)
      const y = -0.66 + t * 1.32;
      // Plump flat-bottomed bulb (pow 0.45) + gentle upper waist pinch + turtleneck collar
      const baseSphere = Math.pow(Math.sin(t * Math.PI), 0.48);
      const peanutPinch = 1.0 - 0.14 * Math.exp(-Math.pow((t - 0.66) / 0.2, 2));
      const radius = i === 0 || i === latheSteps ? 0.001 : 0.79 * baseSphere * peanutPinch;
      peanutPoints.push(new THREE.Vector2(radius, y));
    }
    const bellyGeo = new THREE.LatheGeometry(peanutPoints, 48);
    bellyGeo.scale(1.05, 1.0, 0.92);
    const bellyMesh = new THREE.Mesh(bellyGeo, peanutSuitMat);
    bellyMesh.castShadow = true;
    bellyMesh.receiveShadow = true;
    torsoGroup.add(bellyMesh);

    // Cozy Rolled Turtleneck Collar directly under the chin (IMG_5644 & IMG_5611)
    const collarGeo = new THREE.TorusGeometry(0.55, 0.145, 24, 48);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, peanutSuitMat);
    collarMesh.position.y = 0.6;
    collarMesh.scale.set(1.04, 1.0, 0.92);
    torsoGroup.add(collarMesh);

    // Animated S-Curved Cat Tail for BobaCat (IMG_5583 left)
    const catTailGroup = new THREE.Group();
    catTailGroup.position.set(0, -0.28, -0.58);
    torsoGroup.add(catTailGroup);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.18, 0.18, -0.32),
      new THREE.Vector3(-0.34, 0.52, -0.42),
      new THREE.Vector3(-0.22, 0.78, -0.28),
    ]);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 24, 0.11, 16, false);
    const tailMesh = new THREE.Mesh(tailGeo, vinylSkinMat);
    tailMesh.castShadow = true;
    catTailGroup.add(tailMesh);

    // =========================================================================
    // 2B. HEAD, 512PX FACE CANVAS, 3D TEARDROPS, SWEPT HAIR BANGS & 4-LOBED BOW
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.94;
    mascotRig.add(headGroup);

    const headSphereGeo = new THREE.SphereGeometry(0.76, 48, 48);
    headSphereGeo.scale(1.09, 0.96, 0.95);
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
      false,
      0
    );
    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.anisotropy = maxAnisotropy;

    const facePatchGeo = new THREE.SphereGeometry(
      0.766,
      40,
      40,
      Math.PI * 0.25,
      Math.PI * 0.5,
      Math.PI * 0.28,
      Math.PI * 0.48
    );
    facePatchGeo.scale(1.09, 0.96, 0.95);
    const facePatchMat = new THREE.MeshPhysicalMaterial({
      map: faceTex,
      roughness: 0.28,
      metalness: 0.01,
      clearcoat: 0.22,
      clearcoatRoughness: 0.25,
    });
    const facePatchMesh = new THREE.Mesh(facePatchGeo, facePatchMat);
    headGroup.add(facePatchMesh);

    // 3D Sculpted Pastel-Blue Cheek Teardrops (matching IMG_5611 & IMG_5644!)
    const create3DTeardrop = (side: -1 | 1) => {
      const dropGroup = new THREE.Group();
      // Position on lower outer cheek beside rosy blush
      dropGroup.position.set(side * 0.43, -0.15, 0.65);
      dropGroup.rotation.z = -side * 0.28;
      dropGroup.rotation.y = side * 0.38;

      const bulbGeo = new THREE.SphereGeometry(0.062, 20, 20);
      bulbGeo.scale(1.0, 1.15, 0.48);
      const bulb = new THREE.Mesh(bulbGeo, teardropGemMat);
      dropGroup.add(bulb);

      const tipGeo = new THREE.ConeGeometry(0.058, 0.1, 20);
      tipGeo.scale(1.0, 1.0, 0.48);
      const tip = new THREE.Mesh(tipGeo, teardropGemMat);
      tip.position.y = 0.06;
      dropGroup.add(tip);

      return dropGroup;
    };
    const leftTeardrop3D = create3DTeardrop(-1);
    const rightTeardrop3D = create3DTeardrop(1);
    headGroup.add(leftTeardrop3D);
    headGroup.add(rightTeardrop3D);

    // Sculpted Peanut Hood Rim framing the face (IMG_5644 & IMG_5611)
    const hoodRimGeo = new THREE.TorusGeometry(0.745, 0.15, 28, 56);
    const hoodRimMesh = new THREE.Mesh(hoodRimGeo, peanutSuitMat);
    hoodRimMesh.scale.set(1.07, 0.95, 0.92);
    hoodRimMesh.position.set(0, 0.0, 0.15);
    headGroup.add(hoodRimMesh);

    // Outer Peanut Hood Shell wrapping the back of the head
    const hoodBackGeo = new THREE.SphereGeometry(
      0.83,
      36,
      36,
      Math.PI * 0.68,
      Math.PI * 1.64,
      0,
      Math.PI
    );
    hoodBackGeo.scale(1.07, 0.96, 0.95);
    const hoodBackMesh = new THREE.Mesh(hoodBackGeo, peanutSuitMat);
    hoodBackMesh.castShadow = true;
    headGroup.add(hoodBackMesh);

    // Sculpted Swept Chestnut Bangs & Wavy Side Locks (IMG_5644, IMG_5611, IMG_5583)
    const bangsGroup = new THREE.Group();
    headGroup.add(bangsGroup);

    const bangConfigs = [
      { x: -0.32, y: 0.34, z: 0.62, rotZ: 0.42, scaleX: 1.25, scaleY: 0.85 },
      { x: -0.14, y: 0.37, z: 0.67, rotZ: 0.24, scaleX: 1.3, scaleY: 0.92 },
      { x: 0.04, y: 0.38, z: 0.68, rotZ: 0.14, scaleX: 1.35, scaleY: 0.92 },
      { x: 0.24, y: 0.36, z: 0.65, rotZ: -0.32, scaleX: 1.3, scaleY: 0.85 },
    ];
    for (const cfg of bangConfigs) {
      const bangGeo = new THREE.SphereGeometry(0.145, 20, 20);
      bangGeo.scale(cfg.scaleX, cfg.scaleY * 1.35, 0.55);
      const bangMesh = new THREE.Mesh(bangGeo, hairMat);
      bangMesh.position.set(cfg.x, cfg.y, cfg.z);
      bangMesh.rotation.z = cfg.rotZ;
      bangMesh.rotation.x = -0.22;
      bangsGroup.add(bangMesh);
    }

    // Wavy framing hair tendrils + curled shoulder puffs
    const sideLockGeo = new THREE.CapsuleGeometry(0.1, 0.64, 16, 20);
    const leftLock = new THREE.Mesh(sideLockGeo, hairMat);
    leftLock.position.set(-0.62, -0.2, 0.43);
    leftLock.rotation.z = 0.12;
    bangsGroup.add(leftLock);

    const rightLock = new THREE.Mesh(sideLockGeo, hairMat);
    rightLock.position.set(0.62, -0.2, 0.43);
    rightLock.rotation.z = -0.12;
    bangsGroup.add(rightLock);

    const shoulderCurlGeo = new THREE.SphereGeometry(0.23, 24, 24);
    shoulderCurlGeo.scale(0.95, 1.15, 0.85);
    const leftCurl = new THREE.Mesh(shoulderCurlGeo, hairMat);
    leftCurl.position.set(-0.73, -0.5, 0.14);
    bangsGroup.add(leftCurl);

    const rightCurl = new THREE.Mesh(shoulderCurlGeo, hairMat);
    rightCurl.position.set(0.73, -0.5, 0.14);
    bangsGroup.add(rightCurl);

    // 4-Lobed Pillowy Pink Ribbon Bow behind Head (IMG_5583 & IMG_5611!)
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, 0.1, -0.2);
    headGroup.add(bowGroup);

    const bowUpperWingGeo = new THREE.ConeGeometry(0.56, 0.92, 28);
    bowUpperWingGeo.scale(1.05, 1.0, 0.48);
    const leftUpperWing = new THREE.Mesh(bowUpperWingGeo, pinkBowMat);
    leftUpperWing.rotation.z = Math.PI / 2 - 0.22;
    leftUpperWing.position.set(-0.76, 0.24, -0.04);
    bowGroup.add(leftUpperWing);

    const rightUpperWing = new THREE.Mesh(bowUpperWingGeo, pinkBowMat);
    rightUpperWing.rotation.z = -Math.PI / 2 + 0.22;
    rightUpperWing.position.set(0.76, 0.24, -0.04);
    bowGroup.add(rightUpperWing);

    const bowLowerWingGeo = new THREE.ConeGeometry(0.46, 0.82, 28);
    bowLowerWingGeo.scale(1.0, 1.0, 0.44);
    const leftLowerWing = new THREE.Mesh(bowLowerWingGeo, pinkBowMat);
    leftLowerWing.rotation.z = Math.PI / 2 + 0.2;
    leftLowerWing.position.set(-0.78, -0.08, 0.02);
    bowGroup.add(leftLowerWing);

    const rightLowerWing = new THREE.Mesh(bowLowerWingGeo, pinkBowMat);
    rightLowerWing.rotation.z = -Math.PI / 2 - 0.2;
    rightLowerWing.position.set(0.78, -0.08, 0.02);
    bowGroup.add(rightLowerWing);

    // Floppy Bunny Ears for Sprout (IMG_5583 right!)
    const bunnyEarsGroup = new THREE.Group();
    bunnyEarsGroup.position.set(0, 0.22, 0.05);
    headGroup.add(bunnyEarsGroup);

    const bunnyEarGeo = new THREE.CapsuleGeometry(0.16, 0.56, 16, 24);
    bunnyEarGeo.scale(1.0, 1.0, 0.55);
    const leftBunnyEar = new THREE.Mesh(bunnyEarGeo, vinylSkinMat);
    leftBunnyEar.position.set(-0.68, -0.22, 0.08);
    leftBunnyEar.rotation.z = -0.24;
    bunnyEarsGroup.add(leftBunnyEar);

    const rightBunnyEar = new THREE.Mesh(bunnyEarGeo, vinylSkinMat);
    rightBunnyEar.position.set(0.68, -0.22, 0.08);
    rightBunnyEar.rotation.z = 0.24;
    bunnyEarsGroup.add(rightBunnyEar);

    // =========================================================================
    // 2C. SNUG STACKED HATS: RIBBED SAGE BUCKET HAT + DUSTY-BLUE CAT-EAR BEANIE
    //     (Direct proportion match to IMG_5644 & IMG_5611 with zero gap!)
    // =========================================================================
    const bucketHatGroup = new THREE.Group();
    bucketHatGroup.position.set(0, 0.48, -0.06);
    bucketHatGroup.rotation.x = -0.14;
    headGroup.add(bucketHatGroup);

    const brimGeo = new THREE.CylinderGeometry(0.82, 1.06, 0.3, 56, 1, false);
    const brimMesh = new THREE.Mesh(brimGeo, sageHatMat);
    brimMesh.castShadow = true;
    bucketHatGroup.add(brimMesh);

    const crownGeo = new THREE.CylinderGeometry(0.74, 0.84, 0.5, 56);
    const crownMesh = new THREE.Mesh(crownGeo, sageHatMat);
    crownMesh.position.y = 0.34;
    crownMesh.castShadow = true;
    bucketHatGroup.add(crownMesh);

    const catBeanieGroup = new THREE.Group();
    catBeanieGroup.position.y = 0.58;
    bucketHatGroup.add(catBeanieGroup);

    const cuffGeo = new THREE.TorusGeometry(0.65, 0.165, 28, 56);
    cuffGeo.rotateX(Math.PI / 2);
    const cuffMesh = new THREE.Mesh(cuffGeo, blueBeanieMat);
    cuffMesh.scale.set(1.06, 1.0, 1.14);
    catBeanieGroup.add(cuffMesh);

    const domeGeo = new THREE.SphereGeometry(0.65, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const domeMesh = new THREE.Mesh(domeGeo, blueBeanieMat);
    domeMesh.position.y = 0.04;
    catBeanieGroup.add(domeMesh);

    const createCatEar = (side: -1 | 1) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.43, 0.46, 0.05);
      earGroup.rotation.z = -side * 0.24;

      const outerEarGeo = new THREE.ConeGeometry(0.25, 0.46, 28);
      outerEarGeo.scale(1, 1, 0.56);
      const outerEar = new THREE.Mesh(outerEarGeo, blueBeanieMat);
      earGroup.add(outerEar);

      const innerEarGeo = new THREE.ConeGeometry(0.15, 0.29, 20);
      innerEarGeo.scale(1, 1, 0.36);
      const innerEarMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
      const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
      innerEar.position.set(0, -0.02, 0.065);
      earGroup.add(innerEar);

      return earGroup;
    };
    const leftCatEar = createCatEar(-1);
    const rightCatEar = createCatEar(1);
    catBeanieGroup.add(leftCatEar);
    catBeanieGroup.add(rightCatEar);

    // =========================================================================
    // 2D. CHUBBY ARMS, POINTING FINGER & MINT-GREEN MINI SCOOTER (IMG_5611!)
    // =========================================================================
    const armsAndScooterGroup = new THREE.Group();
    armsAndScooterGroup.position.set(0, 1.05, 0.68);
    mascotRig.add(armsAndScooterGroup);

    const armGeo = new THREE.CapsuleGeometry(0.165, 0.28, 18, 24);
    const leftArm = new THREE.Mesh(armGeo, vinylSkinMat);
    leftArm.position.set(-0.46, 0.06, -0.08);
    leftArm.rotation.z = -0.85;
    leftArm.rotation.x = 0.45;
    armsAndScooterGroup.add(leftArm);

    // Sculpted pointing index finger on left hand (matching IMG_5611 & IMG_5583!)
    const fingerGeo = new THREE.CapsuleGeometry(0.055, 0.11, 12, 16);
    const leftPointingFinger = new THREE.Mesh(fingerGeo, vinylSkinMat);
    leftPointingFinger.position.set(-0.27, 0.2, 0.08);
    leftPointingFinger.rotation.z = -1.1;
    armsAndScooterGroup.add(leftPointingFinger);

    const rightArm = new THREE.Mesh(armGeo, vinylSkinMat);
    rightArm.position.set(0.46, -0.02, -0.08);
    rightArm.rotation.z = 0.85;
    rightArm.rotation.x = 0.45;
    armsAndScooterGroup.add(rightArm);

    const scooterProp = new THREE.Group();
    scooterProp.position.set(0.02, -0.08, 0.12);
    armsAndScooterGroup.add(scooterProp);

    const deckGeo = new THREE.BoxGeometry(0.58, 0.055, 0.15);
    const deckMesh = new THREE.Mesh(deckGeo, scooterMintMat);
    scooterProp.add(deckMesh);

    // Dark grip-tape pad on scooter deck
    const gripPadGeo = new THREE.BoxGeometry(0.42, 0.015, 0.12);
    const gripPadMesh = new THREE.Mesh(gripPadGeo, darkWheelMat);
    gripPadMesh.position.y = 0.032;
    scooterProp.add(gripPadMesh);

    const stemGeo = new THREE.CylinderGeometry(0.026, 0.028, 0.48, 16);
    const stemMesh = new THREE.Mesh(stemGeo, scooterMintMat);
    stemMesh.position.set(-0.22, 0.22, 0);
    stemMesh.rotation.z = -0.18;
    scooterProp.add(stemMesh);

    const barGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.25, 16);
    barGeo.rotateX(Math.PI / 2);
    const barMesh = new THREE.Mesh(barGeo, darkWheelMat);
    barMesh.position.set(-0.18, 0.45, 0);
    scooterProp.add(barMesh);

    const wheelGeo = new THREE.CylinderGeometry(0.098, 0.098, 0.052, 24);
    wheelGeo.rotateX(Math.PI / 2);
    const frontWheel = new THREE.Mesh(wheelGeo, darkWheelMat);
    frontWheel.position.set(-0.27, -0.02, 0);
    scooterProp.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, darkWheelMat);
    rearWheel.position.set(0.27, -0.02, 0);
    scooterProp.add(rearWheel);

    // Wheel Hub Caps
    const hubGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.058, 16);
    hubGeo.rotateX(Math.PI / 2);
    const frontHub = new THREE.Mesh(hubGeo, spindleMat);
    frontHub.position.copy(frontWheel.position);
    scooterProp.add(frontHub);

    const rearHub = new THREE.Mesh(hubGeo, spindleMat);
    rearHub.position.copy(rearWheel.position);
    scooterProp.add(rearHub);

    // =========================================================================
    // 3. FLOATING BAUHAUS RHYTHM SHAPES & 20-BAR 3D SPECTRUM EQUALIZER ARC
    // =========================================================================
    const shapeCount = 8;
    const floatingShapes: THREE.Mesh[] = [];
    const torusGeo = new THREE.TorusGeometry(0.14, 0.045, 16, 32);
    const cubeShapeGeo = new THREE.BoxGeometry(0.19, 0.19, 0.19);
    const pillShapeGeo = new THREE.CapsuleGeometry(0.07, 0.16, 12, 18);
    const octaShapeGeo = new THREE.OctahedronGeometry(0.14, 0);

    const shapeColors = [
      0x309f92,
      0xedff8c,
      0xff7a59,
      0x4f5bd5,
      0x309f92,
      0xedff8c,
      0xf294a7,
      0x7ca1c4,
    ];
    for (let i = 0; i < shapeCount; i++) {
      const geo =
        i % 4 === 0
          ? torusGeo
          : i % 4 === 1
            ? cubeShapeGeo
            : i % 4 === 2
              ? pillShapeGeo
              : octaShapeGeo;
      const mat = new THREE.MeshStandardMaterial({
        color: shapeColors[i],
        emissive: shapeColors[i],
        emissiveIntensity: 0.38,
        roughness: 0.2,
        metalness: 0.18,
      });
      const mesh = new THREE.Mesh(geo, mat);
      stageGroup.add(mesh);
      floatingShapes.push(mesh);
    }

    const eqCount = 20;
    const eqGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
    eqGeo.translate(0, 0.5, 0);
    const eqMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x309f92,
      emissiveIntensity: 0.38,
      roughness: 0.22,
      metalness: 0.28,
    });
    const eqInstanced = new THREE.InstancedMesh(eqGeo, eqMat, eqCount);
    eqInstanced.frustumCulled = false;
    stageGroup.add(eqInstanced);

    const eqCoords: Array<{ x: number; z: number; angle: number }> = [];
    for (let i = 0; i < eqCount; i++) {
      const t = i / (eqCount - 1);
      const angle = THREE.MathUtils.lerp(-Math.PI * 0.86, -Math.PI * 0.14, t);
      const radius = 5.35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      eqCoords.push({ x, z, angle });

      _tempPos.set(x, 0.015, z);
      _tempScale.set(1, 0.4, 1);
      _tempQuat.setFromAxisAngle(_upAxis, -angle);
      _tempMatrix.compose(_tempPos, _tempQuat, _tempScale);
      eqInstanced.setMatrixAt(i, _tempMatrix);
      _tempColor.set(i % 2 === 0 ? 0x309f92 : 0xd4eb68);
      eqInstanced.setColorAt(i, _tempColor);
    }
    eqInstanced.instanceMatrix.needsUpdate = true;
    if (eqInstanced.instanceColor) eqInstanced.instanceColor.needsUpdate = true;

    renderer.compile(scene, camera);

    // =========================================================================
    // 4. INTERACTION & SECOND-ORDER SPRING PHYSICS STATE
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
      crateBoxMesh,
    ];

    const mascotBounceSpring = new Spring1D(0, 210, 11);
    const mascotSquashSpring = new Spring1D(1, 240, 12);
    const hatFollowSpring = new Spring1D(0, 150, 9.5);
    const beanieFollowSpring = new Spring1D(0, 130, 8.5);
    const cubeBassSpring = new Spring1D(1, 260, 13);
    const vinylScratchSpring = new Spring1D(0, 95, 8);

    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let stageTargetRotY = 0;
    let stageTargetRotX = 0;
    let mascotSpinBoost = 0;
    let prevBassVal = 0;
    let prevMascotState: MascotMoodState = propsRef.current.mascotState;

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
          mascotBounceSpring.impulse(5.8);
          mascotSquashSpring.impulse(3.2);
          hatFollowSpring.impulse(7.4);
          beanieFollowSpring.impulse(9.2);
          mascotSpinBoost = Math.PI * 2;
          audioEngine.playUiTick(1.38, 'medium');
          propsRef.current.onMascotInteract?.();
        } else if (
          hitObj === vinylMesh ||
          hitObj === plinthMesh ||
          hitObj === cubeBodyMesh ||
          hitObj === crateBoxMesh
        ) {
          vinylScratchSpring.impulse(14.0);
          cubeBassSpring.impulse(2.8);
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
      vinylScratchSpring.impulse(Math.abs(dx) * 0.12);
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
    // 5. 60FPS SIMULATION, SPRING KINEMATICS & PIXAR CHARACTER ANIMATION LOOP
    // =========================================================================
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;
    let animFrameId = 0;
    let lastHeadlessRender = 0;
    let lastFaceSignature = '';

    const animate = (nowMs: number) => {
      animFrameId = requestAnimationFrame(animate);

      if (isHeadless && lastHeadlessRender > 0 && nowMs - lastHeadlessRender < 500) {
        return;
      }
      lastHeadlessRender = nowMs;

      const rawDt = Math.max(0.001, (nowMs - prevTimeMs) / 1000);
      prevTimeMs = nowMs;
      const dt = Math.min(rawDt, 0.045);
      const elapsed = (nowMs - startTimeMs) / 1000;

      const currentProps = propsRef.current;
      const spectrum = audioEngine.sampleSpectrum(elapsed);
      const isLight = currentProps.themeMode === 'light';

      // Trigger celebratory spring jump when mascotState transitions to celebrating or hyped
      if (currentProps.mascotState !== prevMascotState) {
        if (
          currentProps.mascotState === 'celebrating' ||
          currentProps.mascotState === 'hyped'
        ) {
          mascotBounceSpring.impulse(5.5);
          mascotSquashSpring.impulse(2.8);
          hatFollowSpring.impulse(6.8);
          beanieFollowSpring.impulse(8.5);
          mascotSpinBoost = Math.PI * 2;
        } else if (currentProps.mascotState === 'sympathy') {
          mascotSquashSpring.impulse(-2.2);
          hatFollowSpring.impulse(-3.5);
        }
        prevMascotState = currentProps.mascotState;
      }

      // Beat Onset Detection: inject physical impulse on sudden bass spikes
      const bassDelta = spectrum.bass - prevBassVal;
      prevBassVal = spectrum.bass;
      if (currentProps.isPlayingSnippet && bassDelta > 0.14) {
        mascotBounceSpring.impulse(bassDelta * 3.8);
        mascotSquashSpring.impulse(bassDelta * 2.1);
        hatFollowSpring.impulse(bassDelta * 4.5);
        beanieFollowSpring.impulse(bassDelta * 5.8);
        cubeBassSpring.impulse(bassDelta * 3.2);
      }

      // Configure Character-Specific Silhouette & Props (Pebble, BobaCat, Sprout)
      if (currentProps.characterId === 'pebble') {
        bowGroup.visible = true;
        hoodRimMesh.visible = true;
        hoodBackMesh.visible = true;
        bucketHatGroup.visible = true;
        brimMesh.visible = true;
        crownMesh.visible = true;
        catBeanieGroup.visible = true;
        catBeanieGroup.position.y = 0.58;
        bangsGroup.visible = true;
        bunnyEarsGroup.visible = false;
        catTailGroup.visible = false;
        scooterProp.visible = true;
        leftPointingFinger.visible = true;
        leftTeardrop3D.visible = true;
        rightTeardrop3D.visible = true;
        _targetSuitColor.set(0xe6b87d);
      } else if (currentProps.characterId === 'bobacat') {
        bowGroup.visible = false;
        hoodRimMesh.visible = false;
        hoodBackMesh.visible = false;
        bucketHatGroup.visible = true;
        brimMesh.visible = false;
        crownMesh.visible = false;
        catBeanieGroup.visible = true;
        catBeanieGroup.position.y = 0.02;
        bangsGroup.visible = false;
        bunnyEarsGroup.visible = false;
        catTailGroup.visible = true;
        scooterProp.visible = false;
        leftPointingFinger.visible = false;
        leftTeardrop3D.visible = true;
        rightTeardrop3D.visible = currentProps.mascotState === 'sympathy';
        _targetSuitColor.set(0xfcead8);
      } else {
        // Sprout (IMG_5583 right)
        bowGroup.visible = false;
        hoodRimMesh.visible = false;
        hoodBackMesh.visible = false;
        bucketHatGroup.visible = true;
        brimMesh.visible = true;
        crownMesh.visible = true;
        catBeanieGroup.visible = false;
        bangsGroup.visible = false;
        bunnyEarsGroup.visible = true;
        catTailGroup.visible = false;
        scooterProp.visible = true;
        leftPointingFinger.visible = true;
        leftTeardrop3D.visible = currentProps.mascotState === 'sympathy';
        rightTeardrop3D.visible = currentProps.mascotState === 'sympathy';
        _targetSuitColor.set(0x5cb896);
      }
      peanutSuitMat.color.lerp(_targetSuitColor, dt * 6);

      // Update Face Canvas Texture only when quantized expression parameters change (Zero redundant GPU texture uploads!)
      const isBlinking = !isHeadless && Math.sin(elapsed * 1.95) > 0.955;
      const singOpenAmount = currentProps.isPlayingSnippet
        ? Math.round(Math.abs(Math.sin(elapsed * 9.5)) * (0.35 + spectrum.energy * 0.65) * 6) / 6
        : 0;
      const eyeLookX = currentProps.isPlayingSnippet
        ? Math.round(Math.sin(elapsed * 1.8) * 3) / 3
        : 0;
      const nextFaceSig = `${currentProps.mascotState}:${currentProps.characterId}:${singOpenAmount}:${isBlinking ? 1 : 0}:${eyeLookX}`;
      if (nextFaceSig !== lastFaceSignature) {
        lastFaceSignature = nextFaceSig;
        updateVinylToyFaceCanvas(
          faceCanvas,
          currentProps.mascotState,
          currentProps.characterId,
          singOpenAmount,
          isBlinking,
          eyeLookX
        );
        faceTex.needsUpdate = true;
      }

      // Mood & Theme Color Transitions
      _targetPrimaryColor.set(currentProps.mood.primaryHex);
      _targetSecondaryColor.set(currentProps.mood.secondaryHex);
      _targetAccentColor.set(currentProps.mood.accentHex);
      _targetBgColor.set(
        isLight ? currentProps.mood.bgLightHex : currentProps.mood.bgDarkHex
      );
      _targetStageColor.set(isLight ? 0xffffff : 0x12161d);
      _targetPlinthColor.set(isLight ? 0xf6f6f3 : 0x181e27);
      _targetTopPlateColor.set(isLight ? 0xe5e5e2 : 0x222a36);

      scene.background = (scene.background as THREE.Color).lerp(_targetBgColor, dt * 4.5);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(_targetBgColor, dt * 4.5);
      }

      platformMat.color.lerp(_targetStageColor, dt * 4.5);
      rugMat.color.lerp(
        _tempColor.set(isLight ? 0xf2f3ef : 0x171c25),
        dt * 4.5
      );
      plinthMat.color.lerp(_targetPlinthColor, dt * 4.5);
      topPlateMat.color.lerp(_targetTopPlateColor, dt * 4.5);
      shadowMat.opacity = THREE.MathUtils.damp(shadowMat.opacity, isLight ? 0.16 : 0.34, 4, dt);
      ttShadowMat.opacity = THREE.MathUtils.damp(ttShadowMat.opacity, isLight ? 0.12 : 0.28, 4, dt);

      rimLight.color.lerp(_targetPrimaryColor, dt * 4);
      accentLight.color.lerp(_targetAccentColor, dt * 4);
      stylusSpotLight.intensity = currentProps.isPlayingSnippet
        ? 1.6 + spectrum.treble * 2.2
        : 0.4;
      stageRingMat.color.lerp(_targetPrimaryColor, dt * 4);
      stageRingMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      pulseRingMat.color.lerp(_targetAccentColor, dt * 4);
      pulseRingMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      labelMat.color.lerp(_targetPrimaryColor, dt * 4);
      labelMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      cartridgeMat.color.lerp(_targetPrimaryColor, dt * 4);
      cartridgeMat.emissive.lerp(_targetPrimaryColor, dt * 4);
      eqMat.emissive.lerp(_targetPrimaryColor, dt * 4);

      // Harmonic Floor Pulse Ring Expansion
      const ringPulse = 1 + (currentProps.isPlayingSnippet ? spectrum.bass * 0.045 : 0.008 * Math.sin(elapsed * 2));
      pulseRingMesh.scale.set(ringPulse, ringPulse, 1);

      // Bauhaus #EDFF8C Speaker Cube & Acoustic Driver Excursion Physics
      const targetCubeScale =
        1 + (currentProps.isPlayingSnippet ? spectrum.bass * 0.085 : 0.01 * Math.sin(elapsed * 2));
      const cubeScale = cubeBassSpring.step(targetCubeScale, dt);
      cubeBodyMesh.scale.setScalar(cubeScale);
      driverDomeMesh.position.z = 0.525 + (cubeScale - 1) * 0.85;
      driverDomeMesh.scale.setScalar(0.95 + spectrum.bass * 0.35);

      // Warm Tube Preamp Filament Glow & Vinyl Crate Sleeve Hop
      tubeGlowMat.emissiveIntensity = currentProps.isPlayingSnippet
        ? 0.75 + spectrum.mid * 1.35
        : 0.45 + 0.15 * Math.sin(elapsed * 2.4);
      for (let s = 0; s < crateSleeves.length; s++) {
        const sleeve = crateSleeves[s];
        const hop = currentProps.isPlayingSnippet
          ? Math.max(0, Math.sin(elapsed * 7 + s * 0.9)) * spectrum.bass * 0.12
          : 0;
        sleeve.position.y = 0.56 + hop;
        sleeve.rotation.z = currentProps.isPlayingSnippet
          ? Math.sin(elapsed * 4.5 + s) * 0.04 * spectrum.energy
          : 0;
      }

      // Spin Vinyl Platter + Pitch Fader Tracking
      const scratchBoost = Math.max(0, vinylScratchSpring.step(0, dt));
      const bpmRatio = THREE.MathUtils.clamp(currentProps.mood.bpm / 120, 0.75, 1.45);
      const baseSpinSpeed = currentProps.isPlayingSnippet ? 3.5 * bpmRatio : 0.6;
      platterGroup.rotation.y -= (baseSpinSpeed + scratchBoost) * dt;
      faderKnobMesh.position.z = THREE.MathUtils.damp(
        faderKnobMesh.position.z,
        0.55 + (bpmRatio - 1) * 0.65,
        5,
        dt
      );

      // Tonearm Swing & Stylus Drop Kinematics
      const targetTonearmRot = currentProps.isPlayingSnippet ? 0.29 : 0.0;
      const targetTonearmLift = currentProps.isPlayingSnippet ? -0.025 : 0.04;
      tonearmPivot.rotation.y = THREE.MathUtils.damp(
        tonearmPivot.rotation.y,
        targetTonearmRot,
        7,
        dt
      );
      armTubeMesh.rotation.x = THREE.MathUtils.damp(
        armTubeMesh.rotation.x,
        Math.PI / 2 + targetTonearmLift,
        7,
        dt
      );

      if (!isDragging) {
        stageTargetRotY = THREE.MathUtils.damp(stageTargetRotY, 0, 4, dt);
        stageTargetRotX = THREE.MathUtils.damp(stageTargetRotX, 0, 4, dt);
      }
      stageGroup.rotation.y = THREE.MathUtils.damp(stageGroup.rotation.y, stageTargetRotY, 8, dt);
      stageGroup.rotation.x = THREE.MathUtils.damp(stageGroup.rotation.x, stageTargetRotX, 8, dt);

      // =======================================================================
      // PIXAR MASCOT DANCE CHOREOGRAPHY & SECONDARY SPRING FOLLOW-THROUGH
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
        mascotBounceSpring.value < 0.04 &&
        Math.random() < 0.06
      ) {
        mascotBounceSpring.impulse(4.4);
        hatFollowSpring.impulse(5.4);
        beanieFollowSpring.impulse(6.8);
      }

      const targetRhythmBounce =
        Math.abs(Math.sin(elapsed * beatFreq)) * (0.055 + spectrum.bass * 0.22) * danceIntensity;
      const bounceY = Math.max(0, mascotBounceSpring.step(targetRhythmBounce, dt));
      mascotRig.position.y = bounceY;

      // Dynamic shadow size & opacity inverse to jump height
      const shadowScale = THREE.MathUtils.clamp(1.0 - bounceY * 0.28, 0.65, 1.08);
      mascotShadow.scale.setScalar(shadowScale);

      // Squash & Stretch Volume Preservation
      const targetSquash = 1 + Math.sin(elapsed * beatFreq * 2) * 0.048 * danceIntensity;
      const squash = THREE.MathUtils.clamp(mascotSquashSpring.step(targetSquash, dt), 0.84, 1.2);
      mascotRig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

      mascotSpinBoost = THREE.MathUtils.damp(mascotSpinBoost, 0, 5, dt);
      mascotRig.rotation.z = Math.sin(elapsed * beatFreq) * 0.085 * danceIntensity;
      mascotRig.rotation.y =
        Math.sin(elapsed * beatFreq * 0.5) * 0.24 * danceIntensity + mascotSpinBoost;

      // Expressive Head Bob & Gaze Tilt
      headGroup.rotation.z =
        Math.sin(elapsed * beatFreq + 0.4) * (0.095 + spectrum.mid * 0.11) * danceIntensity;
      headGroup.rotation.x =
        -0.18 +
        (currentProps.isPlayingSnippet
          ? Math.sin(elapsed * beatFreq * 2) * 0.085
          : Math.sin(elapsed * 1.6) * 0.035);

      // Overlapping Secondary Action on Stacked Hats, Ribbon Bow, Teardrops & Ears!
      const hatFollowVal = hatFollowSpring.step(0, dt);
      const beanieFollowVal = beanieFollowSpring.step(0, dt);

      bucketHatGroup.position.y = 0.48 + Math.max(-0.025, hatFollowVal * 0.038);
      bucketHatGroup.rotation.z = Math.sin(elapsed * beatFreq - 0.5) * 0.055 * danceIntensity;
      bucketHatGroup.rotation.x = -0.14 + hatFollowVal * 0.05;

      if (currentProps.characterId === 'pebble') {
        catBeanieGroup.position.y = 0.58 + Math.max(-0.02, beanieFollowVal * 0.045);
      }
      catBeanieGroup.rotation.z = Math.sin(elapsed * beatFreq - 0.9) * 0.065 * danceIntensity;

      // Cat Ear & Bunny Ear Secondary Twitches
      leftCatEar.rotation.z = 0.24 + Math.sin(elapsed * beatFreq * 2) * 0.07 * danceIntensity;
      rightCatEar.rotation.z = -0.24 - Math.sin(elapsed * beatFreq * 2) * 0.07 * danceIntensity;
      leftBunnyEar.rotation.z = -0.24 - Math.abs(Math.sin(elapsed * beatFreq)) * 0.18 * danceIntensity;
      rightBunnyEar.rotation.z = 0.24 + Math.abs(Math.sin(elapsed * beatFreq)) * 0.18 * danceIntensity;

      // BobaCat Tail Swish
      catTailGroup.rotation.y = Math.sin(elapsed * beatFreq) * 0.38 * danceIntensity;
      catTailGroup.rotation.x = Math.cos(elapsed * beatFreq * 0.5) * 0.12;

      // 4-Lobed Plush Pink Bow Follow-Through
      bowGroup.rotation.z = Math.sin(elapsed * beatFreq * 2 - 0.4) * 0.13 * danceIntensity;
      bowGroup.scale.setScalar(1 + Math.sin(elapsed * beatFreq * 2) * 0.04 * danceIntensity);

      // 3D Teardrop Quiver on Cheeks
      const tearQuiver =
        currentProps.mascotState === 'sympathy'
          ? 1.15 + Math.sin(elapsed * 14) * 0.1
          : 1.0 + Math.sin(elapsed * beatFreq * 2) * 0.05;
      leftTeardrop3D.scale.setScalar(tearQuiver);
      rightTeardrop3D.scale.setScalar(tearQuiver);

      // Alternating Happy Foot Taps
      leftFoot.position.y =
        0.28 + Math.max(0, Math.sin(elapsed * beatFreq)) * 0.15 * danceIntensity;
      rightFoot.position.y =
        0.28 + Math.max(0, -Math.sin(elapsed * beatFreq)) * 0.15 * danceIntensity;

      // Chubby Arms & Mint Scooter Groove + Spinning Scooter Wheels
      armsAndScooterGroup.position.y =
        1.05 + Math.sin(elapsed * beatFreq * 2 - 0.25) * 0.085 * danceIntensity;
      armsAndScooterGroup.rotation.z =
        Math.cos(elapsed * beatFreq) * 0.145 * danceIntensity;
      frontWheel.rotation.z -= (1.5 + spectrum.energy * 6.5) * dt * danceIntensity;
      rearWheel.rotation.z -= (1.5 + spectrum.energy * 6.5) * dt * danceIntensity;

      // Orbiting Bauhaus 3D Rhythm Shapes around Stage Perimeter (never blocking mascot face)
      for (let i = 0; i < shapeCount; i++) {
        const shape = floatingShapes[i];
        const shapeMat = shape.material as THREE.MeshStandardMaterial;
        const targetMoodColor =
          i % 3 === 0
            ? _targetPrimaryColor
            : i % 3 === 1
              ? _targetSecondaryColor
              : _targetAccentColor;
        shapeMat.color.lerp(targetMoodColor, dt * 4.5);
        shapeMat.emissive.lerp(targetMoodColor, dt * 4.5);
        shapeMat.emissiveIntensity = currentProps.isPlayingSnippet
          ? 0.38 + spectrum.energy * 0.48
          : 0.25;

        const a = elapsed * (0.45 + spectrum.mid * 0.35) + (i * Math.PI * 2) / shapeCount;
        const r = 4.35 + Math.sin(elapsed * 1.8 + i) * 0.25 + spectrum.bass * 0.22;
        const beatLift = Math.abs(Math.sin(elapsed * beatFreq + i * 0.7)) * spectrum.bass * 0.45;
        shape.position.set(
          Math.cos(a) * r,
          0.95 + Math.sin(elapsed * 1.4 + i * 0.9) * 0.35 + beatLift,
          Math.sin(a) * r - 0.6
        );
        const s =
          currentProps.isPlayingSnippet || currentProps.mascotState === 'celebrating'
            ? 0.85 + spectrum.energy * 0.55
            : 0.55;
        shape.scale.setScalar(s);
        shape.rotation.y = elapsed * (1.6 + spectrum.treble * 1.4);
        shape.rotation.x = elapsed * (1.2 + spectrum.bass * 1.1);
      }

      // 20-Bar Curved Isometric Equalizer Arc
      for (let i = 0; i < eqCount; i++) {
        const coord = eqCoords[i];
        const binIndex = i % spectrum.bins.length;
        const binVal = spectrum.bins[binIndex] || 0.1;
        const barHeight = 0.26 + binVal * 2.75;

        _tempPos.set(coord.x, 0.015, coord.z);
        _tempScale.set(1, barHeight, 1);
        _tempQuat.setFromAxisAngle(_upAxis, -coord.angle);
        _tempMatrix.compose(_tempPos, _tempQuat, _tempScale);
        eqInstanced.setMatrixAt(i, _tempMatrix);

        const mixRatio = i / Math.max(1, eqCount - 1);
        _tempColor.copy(_targetPrimaryColor).lerp(_targetSecondaryColor, mixRatio);
        if (binVal > 0.52) {
          _tempColor.lerp(_targetAccentColor, (binVal - 0.52) * 1.45);
        }
        eqInstanced.setColorAt(i, _tempColor);
      }
      eqInstanced.instanceMatrix.needsUpdate = true;
      if (eqInstanced.instanceColor) eqInstanced.instanceColor.needsUpdate = true;

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

  const isLight = themeMode === 'light';

  return (
    <div
      className="absolute inset-0 z-0 w-full h-full overflow-hidden select-none touch-none"
      aria-hidden="true"
    >
      {/* Dynamic Mood & Rhythm Animated Gradient Aura */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: isLight
            ? `radial-gradient(circle at 22% 18%, ${mood.primaryHex}24 0%, transparent 52%), radial-gradient(circle at 82% 28%, ${mood.secondaryHex}44 0%, transparent 48%), radial-gradient(circle at 50% 78%, ${mood.accentHex}20 0%, transparent 58%)`
            : `radial-gradient(circle at 22% 18%, ${mood.primaryHex}38 0%, transparent 55%), radial-gradient(circle at 82% 28%, ${mood.secondaryHex}28 0%, transparent 50%), radial-gradient(circle at 50% 78%, ${mood.accentHex}30 0%, transparent 60%)`,
          opacity: isPlayingSnippet ? 1 : 0.74,
        }}
      />
      <div
        ref={mountRef}
        data-testid="vinyl-3d-stage"
        className="relative w-full h-full"
      />
    </div>
  );
};
