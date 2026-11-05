"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { getMotionIntent } from "@/lib/motion-intents";

gsap.registerPlugin(useGSAP);

/** Native modality supplies focus trapping, background inertness, Escape, and focus restoration. */
export function StudioDialog({
  open,
  onClose,
  labelledBy,
  reducedMotion,
  children,
  className = "",
  onAfterClose,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  reducedMotion: boolean;
  children: ReactNode;
  className?: string;
  onAfterClose?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backdropPress = useRef(false);

  useGSAP(
    () => {
      const element = dialog.current;
      if (!element) return;
      const motion = getMotionIntent("dialog", reducedMotion);
      if (open) {
        if (!element.open) element.showModal();
        gsap.fromTo(
          panel.current,
          { opacity: reducedMotion ? 1 : 0, y: motion.y, scale: motion.scale },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: motion.duration,
            ease: "power3.out",
            overwrite: true,
          },
        );
      } else if (element.open) {
        gsap.to(panel.current, {
          opacity: 0,
          y: reducedMotion ? 0 : motion.y / 2,
          duration: motion.exitDuration,
          ease: "power2.in",
          overwrite: true,
          onComplete: () => element.close(),
        });
      }
    },
    { dependencies: [open, reducedMotion], scope: dialog, revertOnUpdate: true },
  );

  return (
    <dialog
      ref={dialog}
      className={`studio-dialog ${className}`}
      data-motion-intent="dialog"
      data-motion-reduced={reducedMotion ? "true" : "false"}
      aria-labelledby={labelledBy}
      onClose={onAfterClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panel} className="studio-dialog-panel">
        {children}
      </div>
    </dialog>
  );
}
