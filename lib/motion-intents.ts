/** Motion contracts for the existing Motion + GSAP surfaces. No new runtime. */
export type MotionIntent = "setup" | "dialog" | "result";

type MotionSettings = Readonly<{
  duration: number;
  exitDuration: number;
  y: number;
  scale: number;
  stagger: number;
  delay: number;
}>;

const presets: Record<MotionIntent, MotionSettings> = {
  setup: { duration: 0.22, exitDuration: 0.16, y: 10, scale: 1, stagger: 0.04, delay: 0.04 },
  dialog: { duration: 0.26, exitDuration: 0.16, y: 24, scale: 0.98, stagger: 0, delay: 0 },
  result: { duration: 0.28, exitDuration: 0.16, y: 12, scale: 0.97, stagger: 0, delay: 0 },
};

/** Zero-duration presentation for reduced-motion users. Semantics never depend on animation. */
export function getMotionIntent(intent: MotionIntent, reducedMotion: boolean): MotionSettings {
  if (!reducedMotion) return presets[intent];
  return { duration: 0, exitDuration: 0, y: 0, scale: 1, stagger: 0, delay: 0 };
}
