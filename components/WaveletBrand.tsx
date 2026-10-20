'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { audioEngine } from '@/lib/audio-engine';

gsap.registerPlugin(useGSAP);

export function WaveletMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M7 18c3 0 3 14 7 14s6-21 10-21 6 21 10 21 4-14 7-14" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WaveletBrand({ reducedMotion, onDiscover }: { reducedMotion: boolean; onDiscover: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const taps = useRef({ count: 0, last: 0 });
  const { contextSafe } = useGSAP({ scope: button });

  const onClick = () => {
    const now = performance.now();
    taps.current.count = now - taps.current.last < 1400 ? taps.current.count + 1 : 1;
    taps.current.last = now;
    audioEngine.playUiTick(0.9 + taps.current.count * 0.12);
    if (!reducedMotion) {
      gsap.fromTo('.wavelet-logo', { rotate: -8, scale: 0.88 }, { rotate: 0, scale: 1, duration: 0.65, ease: 'elastic.out(1, 0.4)', overwrite: true });
    }
    if (taps.current.count === 5) {
      taps.current.count = 0;
      onDiscover();
    }
  };

  return (
    <button ref={button} type="button" className="wavelet-brand" onClick={() => contextSafe(onClick)()} aria-label="Wavelet — little clips, big music energy">
      <span className="wavelet-logo"><Image src="/brand/wavelet-icon-96.webp" alt="" width={44} height={44} unoptimized /></span>
      <span className="wavelet-wordmark">wavelet<span className="wavelet-wordmark-dot">.</span></span>
    </button>
  );
}
