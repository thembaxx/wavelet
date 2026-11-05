/** WebGL backing-store policy for the compact, demand-aware onboarding studio. */
export function onboardingRenderQuality(
  pixelRatio: number,
  coarsePointer: boolean,
  softwareRenderer: boolean,
): { dpr: number; antialias: boolean } {
  const normalized = Number.isFinite(pixelRatio) ? Math.max(1, pixelRatio) : 1;
  return {
    dpr: Math.min(normalized, softwareRenderer ? 1 : coarsePointer ? 1.5 : 2),
    antialias: !softwareRenderer && !coarsePointer,
  };
}

export function isSoftwareWebGL(name: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(name);
}
