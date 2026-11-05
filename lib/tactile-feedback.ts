/** Native-like feedback only when supported; no vibration required for gameplay. */
export type TactileIntent = "tap" | "success";

export function tactilePattern(intent: TactileIntent): number | number[] {
  return intent === "success" ? [12, 28, 18] : 10;
}

export function tactileFeedback(intent: TactileIntent = "tap"): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  if (document.hidden || !document.hasFocus()) return false;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  )
    return false;
  if (typeof navigator.vibrate !== "function") return false;
  return navigator.vibrate(tactilePattern(intent));
}
