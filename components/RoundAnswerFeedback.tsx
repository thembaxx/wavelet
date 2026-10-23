"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "motion/react";
import { ArrowRight, Check, Sparkle, X } from "@phosphor-icons/react";

interface RoundAnswerFeedbackProps {
  correct: boolean;
  points: number;
  xpGained: number;
  coinsGained: number;
  correctAnswer: string;
  songLabel: string;
  selectedAnswer?: string;
  challengeLabel: string;
  roundIndex: number;
  isFinalRound: boolean;
  isLight: boolean;
  reducedMotion: boolean;
  onNext: () => void;
}

const PARTICLES = Array.from({ length: 14 }, (_, index) => index);

/**
 * An unmistakable, inline result state. Effects use the GSAP already bundled
 * with Wavelet rather than introducing a WebGL renderer for a short celebration.
 */
export function RoundAnswerFeedback({
  correct,
  points,
  xpGained,
  coinsGained,
  correctAnswer,
  songLabel,
  selectedAnswer,
  challengeLabel,
  roundIndex,
  isFinalRound,
  isLight,
  reducedMotion,
  onNext,
}: RoundAnswerFeedbackProps) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reducedMotion) return;

      const emblem = root.querySelector<HTMLElement>("[data-result-emblem]");
      if (emblem) {
        gsap.fromTo(
          emblem,
          { scale: 0.55, rotate: correct ? -20 : 12, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: "back.out(1.7)" },
        );
      }

      if (correct) {
        const particles = gsap.utils.toArray<HTMLElement>("[data-result-particle]", root);
        particles.forEach((particle, index) => {
          const angle = (index / particles.length) * Math.PI * 2 - Math.PI / 2;
          const distance = 62 + (index % 4) * 12;
          const burst = gsap.timeline({ delay: 0.1 + (index % 3) * 0.035 });
          burst.fromTo(
            particle,
            { x: 0, y: 0, scale: 0.3, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.12,
              ease: "power2.out",
            },
          );
          burst.to(particle, {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            rotation: index % 2 ? -120 : 120,
            scale: 0.4,
            opacity: 0,
            duration: 0.95,
            ease: "power3.out",
          });
        });
      } else {
        const shake = root.querySelector<HTMLElement>("[data-result-shake]");
        if (shake) {
          gsap
            .timeline({ delay: 0.1 })
            .to(shake, { x: -6, duration: 0.07 })
            .to(shake, { x: 5, duration: 0.07 })
            .to(shake, { x: -3, duration: 0.07 })
            .to(shake, { x: 0, duration: 0.1, ease: "power2.out" });
        }
      }
    },
    { scope: rootRef, dependencies: [correct, roundIndex, reducedMotion], revertOnUpdate: true },
  );

  const surface = correct
    ? isLight
      ? "border-[#61b68b] bg-[#e9f9ef] text-[#164e38]"
      : "border-[#458d70] bg-[#173e31] text-[#e7fff0]"
    : isLight
      ? "border-[#d88f7e] bg-[#fff0ea] text-[#763729]"
      : "border-[#a76458] bg-[#482e2b] text-[#fff0ea]";

  const emphasis = correct
    ? isLight
      ? "text-[#176a4b]"
      : "text-[#b0f6c5]"
    : isLight
      ? "text-[#ab4337]"
      : "text-[#ffb5a2]";

  const secondarySurface = correct
    ? isLight
      ? "border-[#b4dec5] bg-white/75"
      : "border-[#46725c] bg-[#0e3024]/65"
    : isLight
      ? "border-[#ebc9bf] bg-white/75"
      : "border-[#83564e] bg-[#342320]/65";

  return (
    <motion.section
      ref={rootRef}
      key={roundIndex}
      aria-label={correct ? "Correct guess" : "Incorrect guess"}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }}
      className={
        "relative isolate overflow-hidden rounded-[24px] border-2 p-3.5 shadow-lg sm:p-4 " + surface
      }
    >
      <div data-result-shake>
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            {!reducedMotion && correct && (
              <>
                <motion.span
                  className="absolute inset-2 rounded-full border-[3px] border-[#48b98a]/60"
                  initial={{ opacity: 0.65, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.8 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                />
                {PARTICLES.map((index) => (
                  <span
                    key={index}
                    data-result-particle
                    className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-[3px]"
                    style={{
                      backgroundColor:
                        index % 3 === 0 ? "#e7c95d" : index % 3 === 1 ? "#43b994" : "#ffffff",
                      width: index % 4 === 0 ? 5 : 8,
                      height: index % 4 === 0 ? 12 : 8,
                      opacity: 0,
                    }}
                  />
                ))}
              </>
            )}
            <div
              data-result-emblem
              className={
                "relative z-10 grid h-[62px] w-[62px] place-items-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.14)] " +
                (correct ? "bg-[#1c9068] text-white" : "bg-[#c4594a] text-white")
              }
            >
              {correct ? (
                <Check weight="bold" className="h-9 w-9" />
              ) : (
                <X weight="bold" className="h-9 w-9" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={
                "font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] " + emphasis
              }
            >
              {correct ? "Correct answer" : "Incorrect answer"} · Round {roundIndex + 1}
            </p>
            <h2 className="mt-0.5 text-[clamp(1.45rem,5vw,2rem)] font-black leading-[1.05] tracking-tight">
              {correct ? "NAILED IT!" : "NOT QUITE!"}
            </h2>
            <p className="mt-1 text-xs font-semibold">
              {correct ? "You found the groove." : "Close one. The next track is yours."}
            </p>
          </div>
        </div>

        <div className={"mt-3 rounded-[16px] border px-3 py-2.5 " + secondarySurface}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
            {correct
              ? "You guessed correctly"
              : "The correct " + challengeLabel.toLowerCase() + " was"}
          </p>
          <p className="mt-0.5 break-words text-sm font-extrabold leading-snug">{correctAnswer}</p>
          <p className="mt-0.5 break-words text-[11px] font-medium opacity-75">{songLabel}</p>
          {!correct && selectedAnswer && (
            <p className="mt-2 border-t border-current/15 pt-2 text-[11px] font-semibold">
              Your pick: <span className="font-extrabold">{selectedAnswer}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Round rewards">
          <span
            className={
              "rounded-full px-3 py-1 font-mono text-xs font-black " +
              (correct ? "bg-[#1c9068] text-white" : "bg-[#c4594a] text-white")
            }
          >
            {correct ? "+" + points + " POINTS" : "0 POINTS"}
          </span>
          {xpGained > 0 && (
            <span
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-extrabold " + secondarySurface
              }
            >
              +{xpGained} XP
            </span>
          )}
          {coinsGained > 0 && (
            <span
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-extrabold " + secondarySurface
              }
            >
              +{coinsGained} coins
            </span>
          )}
          {correct && (
            <Sparkle weight="fill" className={"ml-auto h-5 w-5 " + emphasis} aria-hidden="true" />
          )}
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        onClick={onNext}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#203d32] px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-[#305d4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <span>{isFinalRound ? "Finish Set" : "Next Song"}</span>
        <ArrowRight weight="bold" className="h-4 w-4" aria-hidden="true" />
      </motion.button>
    </motion.section>
  );
}
