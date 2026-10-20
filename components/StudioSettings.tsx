'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Check, Desktop, DownloadSimple, SpeakerHigh, Sparkle, X } from '@phosphor-icons/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MASCOT_CHARACTERS, type MascotCharacterId } from '@/lib/game-rules';
import { type StudioPreferences } from '@/lib/studio-preferences';
import { audioEngine } from '@/lib/audio-engine';
import { StudioDialog } from './StudioDialog';
import { WaveletMark } from './WaveletBrand';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function SettingSwitch({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span><span className="setting-label">{label}</span><span className="setting-description">{description}</span></span>
      <input type="checkbox" role="switch" className="studio-switch" checked={checked} onChange={event => onChange(event.target.checked)} />
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
          <label className="setting-volume" htmlFor="studio-volume"><span>Master volume</span><output htmlFor="studio-volume">{Math.round(preferences.volume * 100)}%</output>
            <input id="studio-volume" type="range" min="0" max="100" step="5" value={Math.round(preferences.volume * 100)}
              onChange={event => { const volume = Number(event.target.value) / 100; audioEngine.setVolume(volume); onChange({ volume }); }} />
          </label>
          <SettingSwitch label="Interactive sounds" description="Soft clicks, chimes, and little discoveries." checked={preferences.soundEffects} onChange={soundEffects => change({ soundEffects })} />
          <SettingSwitch label="Haptic feedback" description="A little tap on supported devices." checked={preferences.haptics} onChange={haptics => change({ haptics })} />
          <button type="button" className="studio-text-button" disabled={preferences.muted || !preferences.soundEffects || preferences.volume === 0} onClick={props.onPreviewSound}><Sparkle size={16} /> Play the Wavelet sound</button>
        </section>

        <section className="settings-section" aria-labelledby="look-settings-heading">
          <div className="settings-section-title"><h3 id="look-settings-heading">Look &amp; motion</h3><Desktop size={18} /></div>
          <fieldset className="studio-fieldset"><legend>Appearance</legend><div className="studio-segmented">
            {(['light', 'dark'] as const).map(theme => <button key={theme} type="button" aria-pressed={preferences.theme === theme} onClick={() => change({ theme })}>{theme === 'light' ? 'Daylight' : 'After hours'}</button>)}
          </div></fieldset>
          <label className="setting-row" htmlFor="motion-preference"><span><span className="setting-label">Motion</span><span className="setting-description">Keep the energy. Set your own pace.</span></span>
            <select id="motion-preference" value={preferences.motion} onChange={event => change({ motion: event.target.value as StudioPreferences['motion'] })}>
              <option value="system">Use device setting</option><option value="full">Full motion</option><option value="reduced">Reduced motion</option>
            </select>
          </label>
          <SettingSwitch label="Compact canvas" description="A phone-sized studio on larger screens." checked={preferences.compactCanvas} onChange={compactCanvas => change({ compactCanvas })} />
        </section>

        <section className="settings-section" aria-labelledby="companion-settings-heading">
          <div className="settings-section-title"><h3 id="companion-settings-heading">Your listening buddy</h3><Sparkle size={18} /></div>
          <div className="companion-picker" role="group" aria-label="Choose a companion">
            {MASCOT_CHARACTERS.map(character => <button key={character.id} type="button" aria-pressed={props.characterId === character.id} onClick={() => props.onCharacterChange(character.id)}>
              <span className="companion-portrait"><Image src={character.avatarImg} alt="" width={50} height={50} />{props.characterId === character.id && <span className="companion-check"><Check size={12} weight="bold" /></span>}</span>
              <span>{character.name}</span>
            </button>)}
          </div>
          <SettingSwitch label="Backstage dance video" description={reducedMotion ? 'Paused while reduced motion is active.' : 'A tiny dance cameo in your studio.'} checked={preferences.danceVideo} onChange={danceVideo => change({ danceVideo })} />
        </section>

        <section className="settings-section" aria-labelledby="music-settings-heading">
          <div className="settings-section-title"><h3 id="music-settings-heading">Music &amp; app</h3></div>
          <button type="button" className="settings-link" onClick={props.onOpenMusic}><span><span className="setting-label">Your music crate</span><span className="setting-description">{props.musicConnected ? 'Manage your connected music profile.' : 'Spotify connection & artist-based taste crates.'}</span></span><ArrowUpRight size={18} /></button>
          {props.isInstalled ? <p className="settings-installed"><Check size={16} /> Wavelet is installed. Take it for a spin.</p> : props.isInstallable ? <button type="button" className="settings-link" onClick={() => { void props.onInstall(); }}><span className="setting-label">Install Wavelet</span><DownloadSimple size={18} /></button> : <p className="setting-description settings-install-help">{props.isIOS ? 'To install: open Safari’s Share menu, then Add to Home Screen.' : 'To install, use your browser’s Install app or Add to Home Screen option when available.'}</p>}
        </section>

        <details className="settings-section studio-shortcuts"><summary>Keys to the studio</summary><dl><div><dt>Play / start</dt><dd><kbd>Space</kbd></dd></div><div><dt>Pause / resume</dt><dd><kbd>P</kbd></dd></div><div><dt>Mute all audio</dt><dd><kbd>M</kbd></dd></div><div><dt>Change appearance</dt><dd><kbd>T</kbd></dd></div><div><dt>Hide game controls</dt><dd><kbd>H</kbd></dd></div></dl><p>Some good things are hidden in the groove. Try the logo a few times.</p></details>
        <footer className="settings-footer"><WaveletMark className="h-7 w-7" /><span><strong>Wavelet</strong>Little clips. Big music energy.</span></footer>
      </div>
    </StudioDialog>
  );
}
