'use client';

import { useId, useRef } from 'react';
import { ArrowCounterClockwise, ArrowUpRight, Check, Desktop, DownloadSimple, SpeakerHigh, Sparkle, X } from '@phosphor-icons/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MASCOT_CHARACTERS, type MascotCharacterId } from '@/lib/game-rules';
import { type StudioPreferences } from '@/lib/studio-preferences';
import { audioEngine } from '@/lib/audio-engine';
import { StudioDialog } from './StudioDialog';
import { WaveletMark } from './WaveletBrand';
import { CompanionPortrait } from './CompanionPortrait';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AnimatedTabs } from './easyui/AnimatedTabs';
import { UnfoldAccordion } from './easyui/UnfoldAccordion';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function SettingSwitch({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label className="setting-row" htmlFor={id}>
      <span><span className="setting-label">{label}</span><span className="setting-description">{description}</span></span>
      <Switch id={id} aria-label={label} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

interface StudioSettingsProps {
  open: boolean;
  onClose: () => void;
  preferences: StudioPreferences;
  onChange: (patch: Partial<StudioPreferences>) => void;
  reducedMotion: boolean;
  characterId: MascotCharacterId;
  onCharacterChange: (id: MascotCharacterId) => void;
  onOpenMusic: () => void;
  musicConnected: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
  onPreviewSound: () => void;
  onReplayIntro: () => void;
  appStatus?: string | null;
  offlineReady?: boolean;
  updateAvailable?: boolean;
  canUpdate?: boolean;
  onUpdate?: () => void;
  isFullscreen?: boolean;
  onFullscreen?: () => void;
}

export function StudioSettings(props: StudioSettingsProps) {
  const { open, onClose, preferences, onChange, reducedMotion } = props;
  const body = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!open || reducedMotion) return;
    const sections = gsap.utils.toArray<HTMLElement>('.settings-section', body.current);
    sections.forEach(section => {
      gsap.fromTo(section, { opacity: 0.75, y: 8 }, {
        opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
        scrollTrigger: { trigger: section, scroller: body.current, start: 'top 98%', once: true },
      });
    });
  }, { dependencies: [open, reducedMotion], scope: body, revertOnUpdate: true });

  const change = (patch: Partial<StudioPreferences>) => {
    onChange(patch);
    // Apply sound preferences before previewing the change.
    if (patch.soundEffects !== undefined) audioEngine.setSoundEffectsEnabled(patch.soundEffects);
    if (patch.haptics !== undefined) audioEngine.setHapticsEnabled(patch.haptics);
    if (patch.muted !== undefined) audioEngine.setMuted(patch.muted);
    audioEngine.playUiTick();
  };

  return (
    <StudioDialog open={open} onClose={onClose} labelledBy="studio-settings-title" reducedMotion={reducedMotion}>
      <div className="settings-header">
        <div><p className="studio-eyebrow">Make yourself at home</p><h2 id="studio-settings-title">Your studio.</h2></div>
        <button type="button" className="studio-icon-button" aria-label="Close settings" onClick={onClose} autoFocus><X size={20} /></button>
      </div>
      <div className="settings-body" ref={body}>
        <section className="settings-section" aria-labelledby="sound-settings-heading">
          <div className="settings-section-title"><h3 id="sound-settings-heading">Sound &amp; feel</h3><SpeakerHigh size={18} /></div>
          <SettingSwitch label="Mute all audio" description="Song clips and studio sounds. Shortcut: M." checked={preferences.muted} onChange={muted => change({ muted })} />
          <div className="setting-volume"><span>Master volume</span><output>{Math.round(preferences.volume * 100)}%</output>
            <Slider id="studio-volume" className="volume-slider" aria-label="Master volume" min={0} max={100} step={5} value={[Math.round(preferences.volume * 100)]}
              onValueChange={values => { const volume = values[0] / 100; audioEngine.setVolume(volume); onChange({ volume }); }} />
          </div>
          <SettingSwitch label="Interactive sounds" description="Soft clicks, chimes, and little discoveries." checked={preferences.soundEffects} onChange={soundEffects => change({ soundEffects })} />
          <SettingSwitch label="Haptic feedback" description="A little tap on supported devices." checked={preferences.haptics} onChange={haptics => change({ haptics })} />
          <button type="button" className="studio-text-button" disabled={preferences.muted || !preferences.soundEffects || preferences.volume === 0} onClick={props.onPreviewSound}><Sparkle size={16} /> Play the Wavelet sound</button>
        </section>

        <section className="settings-section" aria-labelledby="look-settings-heading">
          <div className="settings-section-title"><h3 id="look-settings-heading">Look &amp; motion</h3><Desktop size={18} /></div>
          <fieldset className="studio-fieldset"><legend>Appearance</legend><AnimatedTabs className="round-segmented" ariaLabel="Appearance" reducedMotion={reducedMotion} value={preferences.theme} onValueChange={theme => change({ theme: theme as StudioPreferences['theme'] })} tabs={[{ id: 'light', label: 'Daylight' }, { id: 'dark', label: 'After hours' }, { id: 'system', label: 'Device' }]} /></fieldset>
          <label className="setting-row" htmlFor="motion-preference"><span><span className="setting-label">Motion</span><span className="setting-description">Keep the energy. Set your own pace.</span></span>
            <select id="motion-preference" value={preferences.motion} onChange={event => change({ motion: event.target.value as StudioPreferences['motion'] })}>
              <option value="system">Use device setting</option><option value="full">Full motion</option><option value="reduced">Reduced motion</option>
            </select>
          </label>
          <SettingSwitch label="Compact canvas" description="A phone-sized studio on larger screens." checked={preferences.compactCanvas} onChange={compactCanvas => change({ compactCanvas })} />
          <SettingSwitch label="Animated background" description={reducedMotion ? 'Still contours while reduced motion is active.' : 'A slow-moving landscape, responsive to your cursor.'} checked={preferences.animatedBackground} onChange={animatedBackground => change({ animatedBackground })} />
        </section>

        <section className="settings-section" aria-labelledby="companion-settings-heading">
          <div className="settings-section-title"><h3 id="companion-settings-heading">Your listening buddy</h3><Sparkle size={18} /></div>
          <div className="companion-picker" role="group" aria-label="Choose a companion">
            {MASCOT_CHARACTERS.map(character => <button key={character.id} type="button" aria-pressed={props.characterId === character.id} onClick={() => props.onCharacterChange(character.id)}>
              <span className="relative inline-block"><CompanionPortrait character={character} reducedMotion={reducedMotion} />{props.characterId === character.id && <span className="companion-check"><Check size={12} weight="bold" /></span>}</span>
              <span>{character.name}</span>
            </button>)}
          </div>
          <SettingSwitch label="Backstage dance video" description={reducedMotion ? 'Paused while reduced motion is active.' : 'A tiny dance cameo in your studio.'} checked={preferences.danceVideo} onChange={danceVideo => change({ danceVideo })} />
        </section>

        <section className="settings-section" aria-labelledby="music-settings-heading">
          <div className="settings-section-title"><h3 id="music-settings-heading">Music &amp; app</h3></div>
          <button type="button" className="settings-link" onClick={props.onOpenMusic}><span><span className="setting-label">Your music crate</span><span className="setting-description">{props.musicConnected ? 'Manage your connected music profile.' : 'Spotify connection & artist-based taste crates.'}</span></span><ArrowUpRight size={18} /></button>
          {props.isInstalled ? <p className="settings-installed"><Check size={16} /> Wavelet is installed. Take it for a spin.</p> : props.isInstallable ? <button type="button" className="settings-link" onClick={() => { void props.onInstall(); }}><span className="setting-label">Install Wavelet</span><DownloadSimple size={18} /></button> : <p className="setting-description settings-install-help">{props.isIOS ? 'To install: open Safari’s Share menu, then Add to Home Screen.' : 'To install, use your browser’s Install app or Add to Home Screen option when available.'}</p>}
          <p className="setting-description" role="status">{props.appStatus || (props.offlineReady ? 'Your studio is saved for offline use. Song clips are available offline after they’ve been played.' : 'Your studio is being saved for offline use. Keep this page open for a moment.')}</p>
          {props.onFullscreen && <button type="button" className="settings-link" onClick={props.onFullscreen}><span className="setting-label">{props.isFullscreen ? 'Leave fullscreen' : 'Open fullscreen'}</span><Desktop size={18} /></button>}
          {props.updateAvailable && <div className="setting-row"><span><span className="setting-label">A fresh Wavelet is ready</span><span className="setting-description">{props.canUpdate ? 'Refresh your studio to get the latest version.' : 'Finish this set to update without losing your round.'}</span></span><Button size="sm" disabled={!props.canUpdate} onClick={props.onUpdate}>Update</Button></div>}
        </section>

        <section className="settings-section" aria-labelledby="intro-settings-heading">
          <div className="settings-section-title"><h3 id="intro-settings-heading">A fresh little start</h3><Sparkle size={18} /></div>
          <button type="button" className="settings-link" aria-label="Replay the Wavelet intro" onClick={props.onReplayIntro}><span><span className="setting-label">Replay the intro</span><span className="setting-description">Three little steps. A few things to play with.</span></span><ArrowCounterClockwise size={20} /></button>
        </section>

        <section className="settings-section studio-shortcuts"><UnfoldAccordion reducedMotion={reducedMotion} items={[{ id: 'keyboard', title: 'Keys to the studio', content: <><dl><div><dt>Play / start</dt><dd><kbd>Space</kbd></dd></div><div><dt>Pause / resume</dt><dd><kbd>P</kbd></dd></div><div><dt>Mute all audio</dt><dd><kbd>M</kbd></dd></div><div><dt>Change appearance</dt><dd><kbd>T</kbd></dd></div><div><dt>Hide game controls</dt><dd><kbd>H</kbd></dd></div></dl><p>Some good things are hidden in the groove. Try the logo a few times.</p></> }]} /></section>
        <footer className="settings-footer"><WaveletMark className="h-7 w-7" /><span><strong>Wavelet</strong>Little clips. Big music energy.</span></footer>
      </div>
    </StudioDialog>
  );
}
