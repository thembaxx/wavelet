"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { WaveletMark } from "./WaveletBrand";

export function DiscoveryDelight({
  discovery,
  reducedMotion,
}: {
  discovery: { id: number; label: string } | null;
  reducedMotion: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!discovery) return;
      gsap.fromTo(
        ".discovery-message",
        { opacity: 0, y: reducedMotion ? 0 : 10, scale: reducedMotion ? 1 : 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.5)" },
      );
      if (reducedMotion) return;
      gsap.utils.toArray<HTMLElement>(".discovery-record").forEach((record, index) => {
        const angle = (index / 12) * Math.PI * 2;
        gsap.fromTo(
          record,
          { x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 },
          {
            x: Math.cos(angle) * (100 + (index % 3) * 36),
            y: Math.sin(angle) * 110 - 20,
            scale: 0.55 + (index % 3) * 0.2,
            rotate: 180 + index * 25,
            duration: 1.5,
            ease: "power3.out",
          },
        );
        gsap.to(record, { opacity: 0, delay: 0.7, duration: 0.8 });
      });
    },
    { dependencies: [discovery?.id, reducedMotion], scope: root, revertOnUpdate: true },
  );

  return (
    <div ref={root} className="discovery-layer" aria-live="polite" role="status">
      {discovery && (
        <>
          <div className="discovery-burst" aria-hidden="true">
            {!reducedMotion &&
              Array.from({ length: 12 }, (_, index) => (
                <span key={index} className="discovery-record" />
              ))}
          </div>
          <div className="discovery-message">
            <WaveletMark className="h-8 w-8" />
            <div>
              <strong>{discovery.label}</strong>
              <span>You found a hidden groove.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
