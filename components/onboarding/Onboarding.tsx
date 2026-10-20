'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowClockwise, ArrowLeft, ArrowRight, CalendarBlank, Check, Desktop, Hand, Headphones, MicrophoneStage, Moon, MusicNotes, Sun, VinylRecord } from '@phosphor-icons/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StudioDialog } from '@/components/StudioDialog';
import { OnboardingScene } from './OnboardingScene';
import { audioEngine } from '@/lib/audio-engine';
import type { GuessChallengeMode, ThemeMode } from '@/lib/game-rules';
import type { StudioPreferences } from '@/lib/studio-preferences';

const STEPS = [
  { name: 'Listen', eyebrow: 'A little spin to begin', title: ['Small clip.', 'Big feeling.'], description: 'Every round starts with a tiny piece of a song. A few seconds is all it takes to find your groove.' },
  { name: 'Guess', eyebrow: 'Let your music memory take over', title: ['You know', 'that feeling.'], description: 'Guess the track, artist, genre, or year. Shorter clips earn more points. Which will you try first?' },
  { name: 'Make it yours', eyebrow: 'A studio that feels like you', title: ['Your music.', 'Your little world.'], description: 'Go all-in on one artist or explore a mix. Find sound, motion, and your listening buddy in Settings.' },
] as const;
const MODES = [{ id: 'track', label: 'Track', icon: MusicNotes }, { id: 'artist', label: 'Artist', icon: MicrophoneStage }, { id: 'genre', label: 'Genre', icon: VinylRecord }, { id: 'year', label: 'Year', icon: CalendarBlank }] as const;

interface Props {
  open: boolean; replaying: boolean; reducedMotion: boolean; theme: ThemeMode;
  appearance: StudioPreferences['theme']; onAppearance: (theme: StudioPreferences['theme']) => void;
  challenge: GuessChallengeMode; onChallenge: (mode: GuessChallengeMode) => void;
  onDismiss: (completed: boolean) => void; onAfterClose: () => void;
}

export default function Onboarding(props: Props) {
  const [step, setStep] = useState(0);
  const [impulse, setImpulse] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const copy = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = STEPS[step];
  const ready = useCallback(() => setSceneReady(true), []);
  const interact = useCallback(() => { audioEngine.playUiTick(1.05, 'selection'); setInteracted(true); }, []);

  useGSAP(() => {
    if (!props.open) return;
    heading.current?.focus({ preventScroll: true });
    gsap.fromTo('.onboarding-reveal', { y: props.reducedMotion ? 0 : 12, opacity: props.reducedMotion ? 1 : 0 }, {
      y: 0, opacity: 1, duration: props.reducedMotion ? 0 : .5, stagger: props.reducedMotion ? 0 : .06, ease: 'power3.out',
    });
  }, { dependencies: [step, props.open, props.reducedMotion], scope: copy, revertOnUpdate: true });

  const go = (next: number) => { if (next === step) return; audioEngine.playTabSwitch(next > step); setStep(next); setInteracted(false); };
  const close = (completed: boolean) => { audioEngine.playTabSwitch(false); props.onDismiss(completed); };

  return <StudioDialog open={props.open} onClose={() => close(false)} onAfterClose={props.onAfterClose} labelledBy="onboarding-title" reducedMotion={props.reducedMotion} className="onboarding-dialog">
    <header className="onboarding-header"><div className="onboarding-brand"><Image src="/brand/wavelet-icon-96.webp" width={32} height={32} alt="" unoptimized /><span>wavelet.</span></div><button type="button" className="onboarding-skip" onClick={() => close(false)}>{props.replaying ? 'Close intro' : 'Skip for now'}<ArrowRight size={15} /></button></header>
    <div className="onboarding-layout">
      <div className="onboarding-visual" data-step={step} data-ready={sceneReady}>
        <div className="onboarding-orbit" aria-hidden="true" />
        {!sceneReady && <div className="onboarding-fallback" aria-hidden="true">{step === 1 ? <Headphones size={170} weight="duotone" /> : <VinylRecord size={170} weight="duotone" />}</div>}
        {props.open && <OnboardingScene step={step} impulse={impulse} theme={props.theme} reducedMotion={props.reducedMotion} onInteract={interact} onReady={ready} />}
        <div className="onboarding-object-note" aria-hidden="true"><Hand size={14} /> {step === 0 ? 'Give it a spin' : step === 1 ? 'A little listening magic' : 'A crate full of possibilities'}</div>
        <button type="button" className="onboarding-spin" onClick={() => { setImpulse(previous => previous + 1); interact(); }} aria-label={step === 0 ? 'Spin the 3D record' : step === 1 ? 'Turn the 3D headphones' : 'Turn the 3D music crate'}><ArrowClockwise size={16} /><span>{step === 0 ? 'Spin it' : 'Take a look'}</span></button>
      </div>
      <div className="onboarding-content">
        <div ref={copy} className="onboarding-copy">
          <p className="onboarding-eyebrow onboarding-reveal"><span>{String(step + 1).padStart(2, '0')} / 03</span> {current.eyebrow}</p>
          <h2 id="onboarding-title" ref={heading} tabIndex={-1} className="onboarding-reveal">{current.title[0]}<br /><span>{current.title[1]}</span></h2>
          <p className="onboarding-description onboarding-reveal">{current.description}</p>
          <div className="onboarding-choices onboarding-reveal">
            {step === 0 ? <p className="onboarding-interaction-status" role="status">{interacted ? <><Check size={16} /> There it is. You’ve got the feel.</> : <><Headphones size={16} /> Tiny clips. Big “I know this one” energy.</>}</p> : step === 1 ? <ToggleGroup type="single" value={props.challenge} onValueChange={value => { if (value) props.onChallenge(value as GuessChallengeMode); }} className="onboarding-modes" aria-label="Your first guessing challenge">{MODES.map(mode => <ToggleGroupItem key={mode.id} value={mode.id}><mode.icon size={20} weight={props.challenge === mode.id ? 'fill' : 'regular'} />{mode.label}</ToggleGroupItem>)}</ToggleGroup> : <ToggleGroup type="single" value={props.appearance} onValueChange={value => { if (value) { audioEngine.playUiTick(); props.onAppearance(value as StudioPreferences['theme']); } }} className="onboarding-appearance" aria-label="Studio appearance"><ToggleGroupItem value="light"><Sun size={18} />Daylight</ToggleGroupItem><ToggleGroupItem value="dark"><Moon size={18} />After hours</ToggleGroupItem><ToggleGroupItem value="system"><Desktop size={18} />Device</ToggleGroupItem></ToggleGroup>}
          </div>
        </div>
        <footer className="onboarding-footer">
          <nav aria-label="Intro steps"><ol>{STEPS.map((item, index) => <li key={item.name}><button type="button" aria-label={`Step ${index + 1}: ${item.name}`} aria-current={step === index ? 'step' : undefined} onClick={() => go(index)}><span /></button></li>)}</ol></nav>
          <div className="onboarding-actions"><Button variant="ghost" size="icon" className="onboarding-back" aria-label="Previous intro step" disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft size={19} /></Button><Button className="onboarding-next squircle" size="lg" onClick={() => step === 2 ? close(true) : go(step + 1)}>{step === 2 ? props.replaying ? 'Back to my studio' : 'Find my groove' : 'Keep going'}<ArrowRight size={18} /></Button></div>
          <p className="onboarding-footnote">Just three little steps. Replay anytime in Settings.</p>
        </footer>
      </div>
    </div>
  </StudioDialog>;
}
