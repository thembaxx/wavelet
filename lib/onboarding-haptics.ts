/** Optional touch feedback; visual and audio cues never depend on vibration support. */
export function onboardingHaptic(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  if (document.visibilityState !== "visible" || !document.hasFocus()) return false;
  if (typeof navigator.vibrate !== "function") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  return navigator.vibrate(10);
}
