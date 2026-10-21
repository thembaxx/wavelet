'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import type { MascotCharacterProfile } from '@/lib/game-rules';

interface CompanionPortraitProps {
  character: MascotCharacterProfile;
  reducedMotion: boolean;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Lightweight, touch-friendly 2.5D treatment for the existing character artwork.
 * The actual articulated, blinking character lives in IsometricVinylStage.
 */
export function CompanionPortrait({
  character,
  reducedMotion,
  size = 50,
  className = '',
  alt = '',
}: CompanionPortraitProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const reactionRef = useRef<HTMLSpanElement>(null);
  const gazeRef = useRef<HTMLSpanElement>(null);
  const breathRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const reaction = reactionRef.current;
    const gaze = gazeRef.current;
    const breath = breathRef.current;
    if (!root || !reaction || !gaze || !breath) return;

    gsap.set([reaction, gaze, breath], { clearProps: 'transform' });
    if (reducedMotion) return;

    const duration = character.id === 'bobacat' ? 3.25 : character.id === 'sprout' ? 2.6 : 2.95;
    const breathing = gsap.to(breath, {
      y: -1.25,
      scale: 1.025,
      rotation: character.id === 'sprout' ? 0.8 : -0.55,
      duration,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // An offscreen settings dialog should never keep running its portrait tweens.
    let visible = false;
    const sync = () => breathing.paused(!visible || document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(root);
    document.addEventListener('visibilitychange', sync);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      breathing.kill();
      gsap.killTweensOf([reaction, gaze, breath]);
    };
  }, [character.id, reducedMotion]);

  const followPointer = (event: PointerEvent<HTMLSpanElement>) => {
    if (reducedMotion || event.pointerType === 'touch' || !gazeRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    gsap.to(gazeRef.current, {
      x: x * 3,
      y: y * 2,
      rotation: x * 5,
      duration: 0.36,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const lookForward = () => {
    if (!reducedMotion && gazeRef.current) {
      gsap.to(gazeRef.current, { x: 0, y: 0, rotation: 0, duration: 0.85, ease: 'elastic.out(1, 0.55)', overwrite: 'auto' });
    }
  };

  const reactToTouch = () => {
    if (reducedMotion || !reactionRef.current) return;
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .to(reactionRef.current, { scaleX: 1.09, scaleY: 0.9, y: 2, duration: 0.11, ease: 'power2.in' })
      .to(reactionRef.current, { scaleX: 0.95, scaleY: 1.12, y: -3, duration: 0.2, ease: 'back.out(2)' })
      .to(reactionRef.current, { scaleX: 1, scaleY: 1, y: 0, duration: 0.52, ease: 'elastic.out(1, 0.5)' });
  };

  return (
    <span
      ref={rootRef}
      className={`companion-portrait living-companion relative inline-block shrink-0 overflow-visible ${className}`}
      style={{ width: size, height: size }}
      onPointerMove={followPointer}
      onPointerLeave={lookForward}
      onPointerDown={reactToTouch}
      aria-hidden={alt ? undefined : true}
    >
      <span ref={reactionRef} className="living-companion-reaction">
        <span ref={gazeRef} className="living-companion-gaze">
          <span ref={breathRef} className="living-companion-breath">
            <Image src={character.avatarImg} alt={alt} width={size} height={size} className="living-companion-image" />
          </span>
        </span>
      </span>
    </span>
  );
}
