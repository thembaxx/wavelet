'use client';

import { CalendarBlank, CircleNotch, Headphones, MicrophoneStage, MusicNotes, Play, SlidersHorizontal, VinylRecord, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StudioDialog } from './StudioDialog';
import { CratePicker, type CratePickerProps } from './CratePicker';
import { DIFFICULTY_TIERS, GAME_CHALLENGE_MODES, type DifficultyTier, type GuessChallengeMode, type PlayMode, type SnippetDuration } from '@/lib/game-rules';
import { audioEngine } from '@/lib/audio-engine';
import { BloomShape } from './react-bits/BloomShape';

const MODE_ICONS = { track: MusicNotes, artist: MicrophoneStage, genre: VinylRecord, year: CalendarBlank };

interface Props extends CratePickerProps {
  challenge: GuessChallengeMode; onChallenge: (mode: GuessChallengeMode) => void;
  difficulty: DifficultyTier; onDifficulty: (tier: DifficultyTier) => void;
  duration: SnippetDuration; onDuration: (duration: SnippetDuration) => void;
  count: number; onCount: (count: number) => void;
  playMode: PlayMode; onPlayMode: (mode: PlayMode) => void;
  rulesOpen: boolean; onRulesOpen: (open: boolean) => void;
  reducedMotion: boolean; loading: boolean; availableTracks: number;
  error: string | null; onStart: () => void;
}

export function GameSetup(props: Props) {
  const { challenge, difficulty, duration, count } = props;
  const actualCount = Math.min(count, props.availableTracks);
  const activeMode = GAME_CHALLENGE_MODES.find(mode => mode.id === challenge)!;
  const select = (action: () => void) => { audioEngine.playUiTick(); action(); };

  return <section aria-label="Game Configuration Dock" data-testid="game-configuration" className="studio-game-dock setup-panel squircle">
    <div className="setup-heading"><span>What are we guessing?</span><BloomShape key={challenge} className="setup-bloom" /></div>
    <ToggleGroup type="single" value={challenge} onValueChange={value => { if (value) props.onChallenge(value as GuessChallengeMode); }} className="guess-mode-tabs" aria-label="Guessing game modes">{GAME_CHALLENGE_MODES.map(mode => { const Icon = MODE_ICONS[mode.id]; return <ToggleGroupItem data-spark key={mode.id} value={mode.id} data-testid={`mode-${mode.id}-btn`} aria-label={`Guess the ${mode.id}`}><Icon size={19} weight={challenge === mode.id ? 'fill' : 'regular'} /><span>{mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}</span></ToggleGroupItem>; })}</ToggleGroup>
    <div className="setup-music-row"><CratePicker {...props} /><Button variant="outline" className="round-options-trigger squircle" data-testid="tune-rules-btn" aria-label="Round options" aria-haspopup="dialog" onClick={() => { audioEngine.playTabSwitch(); props.onRulesOpen(true); }}><SlidersHorizontal size={21} /><span>{duration}s · {count}</span></Button></div>
    <p className="setup-description" role="status">{props.loading ? <><CircleNotch size={14} className="animate-spin" /> Getting your crate ready…</> : props.error ? props.error : props.mode === 'artist' ? <><Headphones size={14} /> {props.availableTracks} {props.availableTracks === 1 ? 'song' : 'songs'} · only {props.artist?.name || props.value}{actualCount < count && actualCount > 0 ? ` · ${actualCount}-song set` : ''}</> : <>{activeMode.promptLabel} <span aria-hidden="true">·</span> {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</>}</p>
    <div className="play-spark">
      <Button data-spark data-start="true" size="lg" className="setup-play-button squircle" disabled={props.loading || actualCount === 0} onClick={props.onStart}><span>{props.loading ? <CircleNotch size={18} className="animate-spin" /> : <Play size={18} weight="fill" />} Let’s play</span><span className="setup-play-count">{actualCount || count} {actualCount === 1 ? 'song' : 'songs'}</span></Button>
    </div>

    <StudioDialog open={props.rulesOpen} onClose={() => props.onRulesOpen(false)} labelledBy="round-options-title" reducedMotion={props.reducedMotion}>
      <div className="round-options-heading"><div><p className="studio-eyebrow">A set, your way</p><h2 id="round-options-title">Set the tempo.</h2></div><button type="button" className="studio-icon-button" aria-label="Close round options" onClick={() => props.onRulesOpen(false)}><X size={20} /></button></div><div className="round-options-body">
        <fieldset className="round-field"><legend>Difficulty</legend><ToggleGroup type="single" value={difficulty} onValueChange={value => { if (value) props.onDifficulty(value as DifficultyTier); }} className="round-segmented" aria-label="Difficulty">{DIFFICULTY_TIERS.map(tier => <ToggleGroupItem key={tier.id} value={tier.id}>{tier.shortLabel}</ToggleGroupItem>)}</ToggleGroup><p>{DIFFICULTY_TIERS.find(tier => tier.id === difficulty)?.description}</p></fieldset>
        <fieldset className="round-field"><legend>How much can you guess from?</legend><div className="round-duration-options">{([1, 3, 5, 10, 15, 30] as const).map(seconds => <Button key={seconds} variant={duration === seconds ? 'default' : 'outline'} aria-pressed={duration === seconds} onClick={() => select(() => props.onDuration(seconds))}>{seconds}s</Button>)}</div></fieldset>
        <fieldset className="round-field"><legend>Songs in your set</legend><ToggleGroup type="single" value={String(count)} onValueChange={value => { if (value) select(() => props.onCount(Number(value))); }} className="round-segmented" aria-label="Songs in your set">{[5, 10, 15].map(number => <ToggleGroupItem key={number} value={String(number)}>{number} songs</ToggleGroupItem>)}</ToggleGroup><p>Artist sets use the songs available, up to your chosen length.</p></fieldset>
        <fieldset className="round-field"><legend>Answer style</legend><ToggleGroup type="single" value={props.playMode} onValueChange={value => { if (value) select(() => props.onPlayMode(value as PlayMode)); }} className="round-segmented" aria-label="Answer style"><ToggleGroupItem value="quiz-4choice">Four choices</ToggleGroupItem><ToggleGroupItem value="party-30s">Self-scored</ToggleGroupItem></ToggleGroup><p>Self-scored lets you reveal the answer and judge your guess.</p></fieldset>
      </div><div className="round-options-footer"><Button size="lg" className="w-full squircle" onClick={() => { audioEngine.playTabSwitch(false); props.onRulesOpen(false); }}>Ready to spin</Button></div>
    </StudioDialog>
  </section>;
}
