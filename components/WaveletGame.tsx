'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { User } from 'firebase/auth';
import {
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  Check,
  X,
  SpotifyLogo,
  AppleLogo,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
  Timer,
  Eye,
  ArrowRight,
  MagnifyingGlass,
  SlidersHorizontal,
  GearSix,
  Trophy,
  Fire,
  Lightning,
  Lightbulb,
  Scissors,
  Medal,
  Coins,
  CheckCircle,
  LockSimple,
  ArrowUpRight,
  UserCircle,
  SignOut,
  PencilSimple,
  ChartBar,
  WifiSlash,
} from '@phosphor-icons/react';
import {
  type SnippetDuration,
  type FilterMode,
  type PlayMode,
  type GuessChallengeMode,
  type DifficultyTier,
  type MascotCharacterId,
  type SongTrack,
  type GameSessionState,
  type PlayerProgressionState,
  MASCOT_CHARACTERS,
  GAME_CHALLENGE_MODES,
  DIFFICULTY_TIERS,
  ALL_BADGES,
  deriveSongMood,
  calculateRoundPoints,
  getEffectiveDifficulty,
  buildModeChallengeOptions,
  advanceRoundState,
  buildStreamingLinks,
  calculateVinylTier,
  calculateWinLossRatio,
  createInitialProgression,
  updateProgressionAfterRound,
} from '@/lib/game-rules';
import {
  CURATED_REAL_SONGS,
  GENRE_PRESETS,
} from '@/lib/music-catalog';
import { audioEngine } from '@/lib/audio-engine';
import {
  signInWithGooglePopup,
  signOutUser,
  subscribeToAuthChanges,
  subscribeToUserProfile,
  syncOrInitializeUserProfile,
  persistUserProfileUpdate,
  sanitizeCallsign,
  sanitizeTagline,
} from '@/lib/firebase';
import { IsometricVinylStage, type MascotMoodState } from './IsometricVinylStage';
import { AppleMusicCoverCard } from './AppleMusicCoverCard';
import { MusicAccountModal, type ConnectedMusicProfile } from './MusicAccountModal';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useStudioPreferences } from '@/hooks/use-studio-preferences';
import { useOnboarding } from '@/hooks/use-onboarding';
import { StudioSettings } from './StudioSettings';
import { GameSetup } from './GameSetup';
import { ThreeTopographyBackground } from './ThreeTopographyBackground';
import { artistOnlyTracks, type ArtistChoice } from '@/lib/catalog-filters';
import { StudioDialog } from './StudioDialog';
import { WaveletBrand } from './WaveletBrand';
import { DiscoveryDelight } from './DiscoveryDelight';
import { RoundAnswerFeedback } from './RoundAnswerFeedback';
import { CompanionPortrait } from './CompanionPortrait';
import ClickSpark from './react-bits/ClickSpark';

gsap.registerPlugin(useGSAP);

const Onboarding = dynamic(() => import('./onboarding/Onboarding'), { ssr: false });


/**
 * Radial Segmented Tick-Mark Gauge (Inspired directly by IMG_5846 "Lead Score 90 · Grade A" card)
 */
const SegmentedTickArcGauge: React.FC<{
  value: number;
  gradeLabel: string;
  statusLabel: string;
  isLight: boolean;
}> = ({ value, gradeLabel, statusLabel, isLight }) => {
  const totalTicks = 29;
  const clampedVal = Math.max(0, Math.min(100, value));
  const activeTickCount = Math.round((clampedVal / 100) * totalTicks);

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border p-4 ${
        isLight
          ? 'border-border bg-muted/70 text-foreground'
          : 'border-white/12 bg-black/35 text-foreground'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-[9px] border ${
              isLight ? 'border-border bg-card' : 'border-white/15 bg-white/5'
            }`}
          >
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full ${
                    i === 4 ? 'bg-primary' : isLight ? 'bg-foreground' : 'bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-sm font-bold tracking-tight">Rhythm Score</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
            {gradeLabel}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isLight
                ? 'bg-card text-foreground border border-border'
                : 'bg-white/10 text-white'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Semi-Circular Radial Tick Arc SVG */}
      <div className="relative mt-2 flex flex-col items-center justify-center">
        <svg viewBox="0 0 240 125" className="w-full max-w-[230px] overflow-visible">
          {Array.from({ length: totalTicks }).map((_, i) => {
            const t = i / (totalTicks - 1);
            const angleDeg = -180 + t * 180;
            const angleRad = (angleDeg * Math.PI) / 180;
            const cx = 120;
            const cy = 110;
            const rInner = 76;
            const rOuter = i % 4 === 0 ? 96 : 90;

            const x1 = Number((cx + Math.cos(angleRad) * rInner).toFixed(4));
            const y1 = Number((cy + Math.sin(angleRad) * rInner).toFixed(4));
            const x2 = Number((cx + Math.cos(angleRad) * rOuter).toFixed(4));
            const y2 = Number((cy + Math.sin(angleRad) * rOuter).toFixed(4));

            const isLit = i < activeTickCount;
            const strokeColor = isLit
              ? i / totalTicks > 0.65
                ? '#12786C'
                : isLight
                  ? '#000000'
                  : '#EDFF8C'
              : isLight
                ? '#D1D1D1'
                : 'rgba(255,255,255,0.18)';

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={i % 4 === 0 ? 3.2 : 2.2}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="-mt-12 text-center">
          <div className="font-mono text-4xl font-extrabold tracking-tight tabular-nums">
            {clampedVal}
          </div>
          <div
            className={`text-[11px] font-medium ${
              isLight ? 'text-muted-foreground' : 'text-muted-foreground'
            }`}
          >
            Accuracy Index
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Horizontal Round Process Bar (Inspired directly by IMG_5847 01-02-03-04-05 step bar)
 */
const RoundStepProcessBar: React.FC<{
  totalRounds: number;
  currentIndex: number;
  history: GameSessionState['history'];
  isLight: boolean;
}> = ({ totalRounds, currentIndex, history, isLight }) => {
  const steps = Math.min(15, Math.max(1, totalRounds));
  return (
    <div
      className={`flex items-center gap-1 rounded-full border p-1 ${
        isLight
          ? 'border-border bg-card/90'
          : 'border-white/12 bg-card/90'
      }`}
      aria-label={`Round ${currentIndex + 1} of ${totalRounds}`}
    >
      {Array.from({ length: steps }).map((_, idx) => {
        const pastItem = history[idx];
        const isCurrent = idx === currentIndex;
        const isCompleted = idx < currentIndex;

        return (
          <div
            key={idx}
            className={`relative flex h-7 flex-1 items-center justify-center rounded-full text-[11px] font-mono font-bold tabular-nums transition-all ${
              isCurrent
                ? 'bg-gradient-to-r from-[#12786C] to-[#EDFF8C] text-foreground shadow-xs'
                : isCompleted
                  ? pastItem?.correct
                    ? isLight
                      ? 'bg-secondary/75 text-foreground'
                      : 'bg-primary/40 text-primary'
                    : isLight
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-white/10 text-muted-foreground'
                  : isLight
                    ? 'bg-muted/80 text-muted-foreground'
                    : 'bg-white/5 text-white/35'
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? pastItem?.correct
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/75 text-primary-foreground'
                    : isLight
                      ? 'bg-card/75 text-muted-foreground'
                      : 'bg-white/10 text-muted-foreground'
              }`}
            >
              {isCompleted ? (
                pastItem?.correct ? (
                  <Check weight="bold" className="h-3 w-3" />
                ) : (
                  <X weight="bold" className="h-3 w-3" />
                )
              ) : (
                idx + 1
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const WaveletGame: React.FC = () => {
  const { preferences, updatePreferences, reducedMotion, resolvedTheme, ready: preferencesReady } = useStudioPreferences();
  const onboarding = useOnboarding(preferencesReady);
  const themeMode = resolvedTheme;
  const mobileFrameLocked = preferences.compactCanvas;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [discovery, setDiscovery] = useState<{ id: number; label: string } | null>(null);
  const discoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companionTaps = useRef(0);
  const introRef = useRef<HTMLDivElement>(null);

  const discoverGroove = useCallback((label = 'A little secret. A lot of groove.') => {
    audioEngine.playDiscovery();
    setDiscovery({ id: performance.now(), label });
    if (discoveryTimer.current) clearTimeout(discoveryTimer.current);
    discoveryTimer.current = setTimeout(() => setDiscovery(null), 3200);
  }, []);

  useEffect(() => () => { if (discoveryTimer.current) clearTimeout(discoveryTimer.current); }, []);

  // Companion and profile state.
  const [characterId, setCharacterId] = useState<MascotCharacterId>('pebble');
  const [isRulesDrawerOpen, setIsRulesDrawerOpen] = useState<boolean>(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState<boolean>(false);
  const [passModalTab, setPassModalTab] = useState<'profile' | 'modes' | 'quests'>('profile');

  // Firebase Auth & Profile Editing State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [draftCallsign, setDraftCallsign] = useState<string>('Studio Selector');
  const [draftTagline, setDraftTagline] = useState<string>('Wavelet selector · Always listening');

  // Gamification & Player Progression State
  const [progression, setProgression] = useState<PlayerProgressionState>(() =>
    createInitialProgression()
  );
  const [progressionLoaded, setProgressionLoaded] = useState(false);
  const progressionRef = useRef<PlayerProgressionState>(progression);
  useEffect(() => {
    progressionRef.current = progression;
  }, [progression]);

  const [artistHintText, setArtistHintText] = useState<string | null>(null);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<string[]>([]);
  const [doubleBoostActive, setDoubleBoostActive] = useState<boolean>(false);
  const [lastXpToast, setLastXpToast] = useState<string | null>(null);

  // Game configuration state (including Distinct Challenge Modes & Difficulty Scaling)
  const [challengeMode, setChallengeMode] = useState<GuessChallengeMode>('track');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('club');
  const [filterMode, setFilterMode] = useState<FilterMode>('genre');
  const [filterValue, setFilterValue] = useState<string>('All');
  const [customSearchTerm, setCustomSearchTerm] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<ArtistChoice | null>(null);
  const [crateError, setCrateError] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const crateRequest = useRef(0);
  const crateController = useRef<AbortController | null>(null);
  const [snippetDuration, setSnippetDuration] = useState<SnippetDuration>(5);
  const [songCount, setSongCount] = useState<number>(5);
  const [playMode, setPlayMode] = useState<PlayMode>('quiz-4choice');

  // Song catalog & loading state
  const [songPool, setSongPool] = useState<SongTrack[]>(CURATED_REAL_SONGS);
  const [isLoadingSongs, setIsLoadingSongs] = useState<boolean>(false);

  // Active game session state
  const [session, setSession] = useState<GameSessionState>({
    status: 'title',
    config: {
      filterMode: 'genre',
      filterValue: 'All',
      snippetDuration: 5,
      songCount: 5,
      playMode: 'quiz-4choice',
      challengeMode: 'track',
      difficulty: 'club',
    },
    playlist: CURATED_REAL_SONGS.slice(0, 5),
    currentIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    history: [],
    isRevealed: false,
  });

  // Playback & UI micro-interaction states
  const [isPlayingSnippet, setIsPlayingSnippet] = useState<boolean>(false);
  const [snippetProgress, setSnippetProgress] = useState<number>(0);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [mascotState, setMascotState] = useState<MascotMoodState>('idle');
  const [mascotSpeech, setMascotSpeech] = useState<string>(
    'Pick a Game Mode (Track, Artist, Genre, or Year), set your difficulty, and drop the needle.'
  );
  const [roundFeedback, setRoundFeedback] = useState<{
    answered: boolean;
    correct: boolean;
    points: number;
    xpGained: number;
    coinsGained: number;
    selectedOptionId?: string;
  } | null>(null);

  // Compact canvas is optional on larger displays.
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);

  // Modals & Saved Crate
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [connectedProfile, setConnectedProfile] = useState<ConnectedMusicProfile | null>(null);

  const { isInstallable, isInstalled, isIOS, isOnline, install, offlineReady, updateAvailable, applyUpdate, isFullscreen, canFullscreen, toggleFullscreen, appStatus } = usePWAInstall();

  const isLight = themeMode === 'light';

  const activeCharacter = useMemo(() => {
    return MASCOT_CHARACTERS.find((c) => c.id === characterId) || MASCOT_CHARACTERS[0];
  }, [characterId]);

  const activeChallengeModeDef = useMemo(() => {
    const modeId = session.status !== 'title' ? session.config.challengeMode || challengeMode : challengeMode;
    return GAME_CHALLENGE_MODES.find((m) => m.id === modeId) || GAME_CHALLENGE_MODES[0];
  }, [session.status, session.config.challengeMode, challengeMode]);

  const effectiveDifficultyInfo = useMemo(() => {
    const baseDiff = session.status === 'playing' ? session.config.difficulty || difficulty : difficulty;
    return getEffectiveDifficulty(baseDiff, session.streak);
  }, [session.status, session.config.difficulty, difficulty, session.streak]);

  const activeDifficultyDef = useMemo(() => {
    return (
      DIFFICULTY_TIERS.find((d) => d.id === effectiveDifficultyInfo.effectiveTier) ||
      DIFFICULTY_TIERS[1]
    );
  }, [effectiveDifficultyInfo.effectiveTier]);

  const tierInfo = useMemo(() => {
    return calculateVinylTier(progression.xp);
  }, [progression.xp]);

  const overallWlStats = useMemo(() => {
    return calculateWinLossRatio(
      progression.totalWins ?? progression.totalCorrect,
      progression.totalLosses ?? 0
    );
  }, [progression.totalWins, progression.totalCorrect, progression.totalLosses]);

  const currentSong = useMemo(() => {
    return session.playlist[session.currentIndex] || CURATED_REAL_SONGS[0];
  }, [session.playlist, session.currentIndex]);

  const currentMood = useMemo(() => {
    return deriveSongMood(currentSong);
  }, [currentSong]);

  const challengeOptions = useMemo(() => {
    const activeMode =
      session.status === 'playing'
        ? session.config.challengeMode || challengeMode
        : challengeMode;
    const baseDiff =
      session.status === 'playing' ? session.config.difficulty || difficulty : difficulty;

    return buildModeChallengeOptions({
      target: currentSong,
      pool: songPool.length >= 4 ? songPool : CURATED_REAL_SONGS,
      challengeMode: activeMode,
      difficulty: baseDiff,
      streak: session.streak,
      seed: session.currentIndex + 1,
    });
  }, [
    currentSong,
    songPool,
    session.status,
    session.config.challengeMode,
    session.config.difficulty,
    session.streak,
    session.currentIndex,
    challengeMode,
    difficulty,
  ]);

  // Load saved gamification progression on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('vinyl_rush_progression_v2');
        if (raw) {
          const parsed = JSON.parse(raw) as PlayerProgressionState;
          if (typeof parsed.xp === 'number' && Array.isArray(parsed.quests)) {
            const initial = createInitialProgression();
            const merged: PlayerProgressionState = {
              ...initial,
              ...parsed,
              modeStats: {
                ...initial.modeStats,
                ...(parsed.modeStats || {}),
              },
            };
            setProgression(merged);
            setDraftCallsign(merged.callsign || 'Studio Selector');
            setDraftTagline(merged.tagline || 'Wavelet selector · Always listening');
            if (merged.mascotId) {
              setCharacterId(merged.mascotId);
            }
          }
        }
      } catch {
        // Ignore storage errors
      }
      setProgressionLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Subscribe to Firebase Auth & real-time Firestore user profile
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    const authUnsub = subscribeToAuthChanges((user) => {
      setAuthUser(user);
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (user) {
        void syncOrInitializeUserProfile(user, progressionRef.current)
          .then((synced) => {
            setProgression(synced);
            setDraftCallsign(synced.callsign);
            setDraftTagline(synced.tagline);
            if (synced.mascotId) setCharacterId(synced.mascotId);
          })
          .catch(() => {
            // Handled by handleFirestoreError
          });

        profileUnsub = subscribeToUserProfile(user.uid, progressionRef.current, (cloudMerged) => {
          setProgression(cloudMerged);
          setDraftCallsign(cloudMerged.callsign);
          setDraftTagline(cloudMerged.tagline);
        });
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // Retain the existing save key and wait for restoration before writing it.
  useEffect(() => {
    if (!progressionLoaded || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('vinyl_rush_progression_v2', JSON.stringify(progression));
    } catch {
      // Ignore storage errors
    }
  }, [progression, progressionLoaded]);

  useEffect(() => { document.body.dataset.state = session.status; }, [session.status]);

  // Detect desktop/tablet viewport for mobile-only disclaimer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkViewport = () => {
      setIsDesktopViewport(window.innerWidth >= 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const fetchLiveCrate = useCallback(
    async (mode: FilterMode, value: string, customQuery?: string, artist?: ArtistChoice): Promise<SongTrack[]> => {
      const request = ++crateRequest.current;
      crateController.current?.abort();
      const controller = new AbortController();
      crateController.current = controller;
      setIsLoadingSongs(true);
      setCrateError(null);
      if (mode === 'artist') setSongPool([]);
      let tracks: SongTrack[] = [];
      try {
        if (mode === 'account' && connectedProfile?.customTracks.length) tracks = connectedProfile.customTracks;
        else {
          const preset = GENRE_PRESETS.find(genre => genre.id === value);
          const term = customQuery?.trim() || (mode === 'genre' ? preset?.query || `${value} hits` : mode === 'year' ? `${value} music hits` : value);
          const query = new URLSearchParams({ term, limit: '50' });
          if (mode === 'artist') { query.set('artist', value); if (artist) query.set('artistId', artist.id); }
          const response = await fetch(`/api/songs?${query}`, { signal: controller.signal });
          if (!response.ok) throw new Error('Catalog unavailable');
          const data = await response.json();
          tracks = Array.isArray(data.tracks) ? data.tracks : [];
        }
      } catch {
        if (controller.signal.aborted) return [];
        tracks = mode === 'artist' ? artistOnlyTracks(CURATED_REAL_SONGS, value, artist?.id) : CURATED_REAL_SONGS;
      } finally {
        if (request === crateRequest.current) setIsLoadingSongs(false);
      }
      if (mode === 'artist') tracks = artistOnlyTracks(tracks, value, artist?.id);
      if (request === crateRequest.current) {
        setSongPool(tracks);
        if (!tracks.length) setCrateError(`No playable songs found for ${value}. Try another artist.`);
      }
      return tracks;
    }, [connectedProfile],
  );

  const initialCrateLoaded = useRef(false);
  const [crateRestored, setCrateRestored] = useState(false);
  useEffect(() => {
    if (initialCrateLoaded.current) return;
    const timer = setTimeout(() => {
      initialCrateLoaded.current = true;
      let mode: FilterMode = 'genre', value = 'All', search = '';
      let artist: ArtistChoice | undefined;
      try {
        const saved = JSON.parse(localStorage.getItem('wavelet_last_crate_v1') || 'null');
        if (saved && ['genre', 'year', 'artist'].includes(saved.mode) && typeof saved.value === 'string' && saved.value.trim().length > 0 && saved.value.length <= 100) {
          mode = saved.mode; value = saved.value;
          search = typeof saved.search === 'string' ? saved.search.slice(0, 100) : '';
          if (mode === 'artist') artist = { id: typeof saved.artist?.id === 'string' ? saved.artist.id.slice(0, 100) : `curated:${value}`, name: value };
        }
      } catch { /* Start with the public mix if storage is unavailable. */ }
      setFilterMode(mode); setFilterValue(value); setCustomSearchTerm(search); setSelectedArtist(artist || null);
      setCrateRestored(true);
      void fetchLiveCrate(mode, value, search || undefined, artist);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLiveCrate]);
  useEffect(() => {
    if (!crateRestored || filterMode === 'account') return;
    try { localStorage.setItem('wavelet_last_crate_v1', JSON.stringify({ mode: filterMode, value: filterValue, artist: selectedArtist, search: customSearchTerm })); } catch { /* Best effort. */ }
  }, [crateRestored, filterMode, filterValue, selectedArtist, customSearchTerm]);
  useEffect(() => () => crateController.current?.abort(), []);

  // Trigger playing the current song snippet
  const triggerSnippetPlay = useCallback(
    (song: SongTrack, durationSec: number, modeOverride?: GuessChallengeMode) => {
      const mood = deriveSongMood(song);
      const activeMode = modeOverride || challengeMode;
      const modeDef =
        GAME_CHALLENGE_MODES.find((m) => m.id === activeMode) || GAME_CHALLENGE_MODES[0];

      setSnippetProgress(0);
      setIsPlayingSnippet(true);
      setMascotState('listening');
      setMascotSpeech(`${modeDef.title} · Spinning ${durationSec}s cut · ${mood.bpm} BPM`);

      audioEngine.playSnippet({
        previewUrl: song.previewUrl,
        durationSec,
        mood,
        onEnded: () => {
          setIsPlayingSnippet(false);
          setSnippetProgress(0);
          setMascotState('idle');
          setMascotSpeech(`Needle lifted · ${modeDef.promptLabel}`);
        },
      });
    },
    [challengeMode]
  );

  // Track snippet elapsed progress bar
  useEffect(() => {
    if (!isPlayingSnippet) {
      return;
    }
    const start = performance.now();
    const durationMs = snippetDuration * 1000;
    const interval = setInterval(() => {
      const ratio = Math.min(1, (performance.now() - start) / durationMs);
      setSnippetProgress(ratio);
      if (ratio >= 1) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [isPlayingSnippet, snippetDuration]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && session.status === 'playing') {
        audioEngine.stopSnippet(false);
        setIsPlayingSnippet(false);
        setSession(previous => ({ ...previous, status: 'paused' }));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [session.status]);

  const resumeGame = useCallback(() => {
    audioEngine.playUiTick();
    setSession(previous => ({ ...previous, status: 'playing' }));
    if (!session.isRevealed) triggerSnippetPlay(currentSong, snippetDuration, session.config.challengeMode);
  }, [session.isRevealed, session.config.challengeMode, currentSong, snippetDuration, triggerSnippetPlay]);

  // Native headset / lock-screen controls keep answers hidden until revealed.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const media = navigator.mediaSession;
    if (session.status === 'title' || session.status === 'gameover') {
      media.metadata = null; media.playbackState = 'none';
      media.setActionHandler('play', null); media.setActionHandler('pause', null);
      return;
    }
    if ('MediaMetadata' in window) {
      media.metadata = new MediaMetadata({
        title: session.isRevealed ? currentSong.title : 'Trust your ears. Find your groove.',
        artist: session.isRevealed ? currentSong.artist : 'Wavelet · Music guessing game',
        artwork: [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
      });
    }
    media.playbackState = session.status === 'paused' || !isPlayingSnippet ? 'paused' : 'playing';
    media.setActionHandler('pause', () => { audioEngine.stopSnippet(false); setIsPlayingSnippet(false); setSession(previous => ({ ...previous, status: 'paused' })); });
    media.setActionHandler('play', resumeGame);
    return () => { media.setActionHandler('play', null); media.setActionHandler('pause', null); };
  }, [session.status, session.isRevealed, currentSong.title, currentSong.artist, isPlayingSnippet, resumeGame]);

  const resetRoundPowerUps = useCallback(() => {
    setArtistHintText(null);
    setEliminatedOptionIds([]);
    setDoubleBoostActive(false);
  }, []);

  // Select Challenge Mode (Track, Artist, Genre, Year)
  const handleSelectChallengeMode = useCallback((mode: GuessChallengeMode) => {
    audioEngine.playUiTick(1.18, 'selection');
    setChallengeMode(mode);
    const modeDef = GAME_CHALLENGE_MODES.find((m) => m.id === mode);
    if (modeDef) {
      setMascotState('hyped');
      setMascotSpeech(`${modeDef.title} selected · ${modeDef.subtitle}`);
    }
  }, []);

  // Select Difficulty Tier (Chill, Club, Master) and scale default snippet duration
  const handleSelectDifficulty = useCallback((tier: DifficultyTier) => {
    audioEngine.playUiTick(1.22, 'selection');
    setDifficulty(tier);
    const def = DIFFICULTY_TIERS.find((d) => d.id === tier);
    if (def) {
      setSnippetDuration(def.recommendedSnippet);
      setMascotState('hyped');
      setMascotSpeech(`${def.label} · ${def.description}`);
    }
  }, []);

  // Start a new game session
  const startNewGame = useCallback(
    async (overridePool?: SongTrack[]) => {
      if ((isLoadingSongs && !overridePool) || isStartingGame) return;
      setIsStartingGame(true);
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      audioEngine.playUiTick(1.3, 'medium');

      let activePool = overridePool || songPool;
      let request = crateRequest.current;
      if (customSearchTerm.trim().length > 1 && !overridePool) {
        const pending = fetchLiveCrate(filterMode, filterValue, customSearchTerm);
        request = crateRequest.current;
        activePool = await pending;
      }
      if (request !== crateRequest.current) { setIsStartingGame(false); return; }

      const selectedPlaylist = (filterMode === 'artist' ? artistOnlyTracks(activePool, filterValue, selectedArtist?.id) : activePool).slice(0, Math.max(1, songCount));
      if (!selectedPlaylist.length) { setCrateError('No songs in this crate yet. Choose another artist or mix.'); setIsStartingGame(false); return; }
      const firstSong = selectedPlaylist[0];

      setRoundFeedback(null);
      resetRoundPowerUps();
      setIsDockCollapsed(false);
      setIsRulesDrawerOpen(false);
      setSession({
        status: 'playing',
        config: {
          filterMode,
          filterValue: customSearchTerm.trim() || filterValue,
          snippetDuration,
          songCount: selectedPlaylist.length,
          playMode,
          challengeMode,
          difficulty,
        },
        playlist: selectedPlaylist,
        currentIndex: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        history: [],
        isRevealed: false,
      });

      triggerSnippetPlay(firstSong, snippetDuration, challengeMode);
      setIsStartingGame(false);
    },
    [
      songPool,
      selectedArtist, isLoadingSongs, isStartingGame,
      customSearchTerm,
      fetchLiveCrate,
      filterMode,
      filterValue,
      snippetDuration,
      songCount,
      playMode,
      challengeMode,
      difficulty,
      resetRoundPowerUps,
      triggerSnippetPlay,
    ]
  );

  // Support ?autostart=1 query param
  const autostartFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || autostartFiredRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      autostartFiredRef.current = true;
      const timer = window.setTimeout(() => {
        void startNewGame(CURATED_REAL_SONGS);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [startNewGame]);

  // Power-Up 1: Mode-Aware Studio Clue
  const handleUseArtistHint = useCallback(() => {
    if (artistHintText || roundFeedback?.answered) return;
    audioEngine.playUiTick(1.35, 'medium');
    const activeMode = session.config.challengeMode || challengeMode;

    let clue = '';
    if (activeMode === 'artist') {
      clue = `Clue: Track is "${currentSong.title}" (${currentSong.releaseYear})`;
    } else if (activeMode === 'genre') {
      clue = `Clue: ${currentSong.artist} · "${currentSong.title}" (${currentSong.decade})`;
    } else if (activeMode === 'year') {
      clue = `Clue: ${currentSong.decade} Era · "${currentSong.title}" by ${currentSong.artist}`;
    } else {
      const maskedArtist = currentSong.artist
        .split(' ')
        .map((w) => (w.length > 2 ? `${w[0]}${'·'.repeat(Math.min(4, w.length - 1))}` : w))
        .join(' ');
      clue = `Clue: ${maskedArtist} (${currentSong.releaseYear})`;
    }

    setArtistHintText(clue);
    setProgression((p) => {
      const updated = { ...p, coins: Math.max(0, p.coins - 15) };
      void persistUserProfileUpdate(authUser, updated);
      return updated;
    });
    setMascotState('hyped');
    setMascotSpeech(clue);
  }, [
    artistHintText,
    roundFeedback?.answered,
    session.config.challengeMode,
    challengeMode,
    currentSong,
    authUser,
  ]);

  // Power-Up 2: 50/50 Cut
  const handleUseFiftyFifty = useCallback(() => {
    if (eliminatedOptionIds.length > 0 || roundFeedback?.answered) return;
    audioEngine.playUiTick(1.4, 'medium');
    if (playMode !== 'quiz-4choice') {
      setPlayMode('quiz-4choice');
    }
    const wrongIds = challengeOptions
      .filter((o) => !o.isCorrect)
      .slice(0, 2)
      .map((o) => o.id);
    setEliminatedOptionIds(wrongIds);
    setProgression((p) => {
      const updated = { ...p, coins: Math.max(0, p.coins - 25) };
      void persistUserProfileUpdate(authUser, updated);
      return updated;
    });
    setMascotState('hyped');
    setMascotSpeech('50/50 Cut applied — 2 wrong choices removed.');
  }, [
    eliminatedOptionIds.length,
    roundFeedback?.answered,
    playMode,
    challengeOptions,
    authUser,
  ]);

  // Power-Up 3: 2x Double Drop Booster
  const handleUseDoubleBoost = useCallback(() => {
    if (doubleBoostActive || roundFeedback?.answered) return;
    audioEngine.playCorrectFanfare(1);
    setDoubleBoostActive(true);
    setProgression((p) => {
      const updated = { ...p, coins: Math.max(0, p.coins - 30) };
      void persistUserProfileUpdate(authUser, updated);
      return updated;
    });
    setMascotState('celebrating');
    setMascotSpeech('2x Score Booster active for this round.');
  }, [doubleBoostActive, roundFeedback?.answered, authUser]);

  // Handle player answering Right or Wrong
  const handleJudgeAnswer = useCallback(
    (correct: boolean, selectedOptionId?: string) => {
      if (roundFeedback?.answered) return;
      audioEngine.stopSnippet(false);
      setIsPlayingSnippet(false);

      const activeMode = session.config.challengeMode || challengeMode;
      const activeDiff = effectiveDifficultyInfo.effectiveTier;
      const remainingRatio = Math.max(0.15, 1 - snippetProgress);

      const { points, isFever } = calculateRoundPoints({
        correct,
        snippetSeconds: snippetDuration,
        streak: session.streak,
        timeRemainingRatio: remainingRatio,
        doubleBoost: doubleBoostActive,
        difficulty: activeDiff,
      });

      const newStreak = correct ? session.streak + 1 : 0;
      const isLastSong = session.currentIndex + 1 >= session.playlist.length;
      const setPerfect =
        isLastSong && session.correctCount + (correct ? 1 : 0) === session.playlist.length;
      const nextSetTotalScore = session.score + points;

      const { next: updatedProg, xpGained, coinsGained, newlyCompletedQuests } =
        updateProgressionAfterRound(progression, {
          correct,
          pointsEarned: points,
          snippetSeconds: snippetDuration,
          newStreak,
          isSetComplete: isLastSong,
          setPerfect,
          challengeMode: activeMode,
          setTotalScore: nextSetTotalScore,
        });

      setProgression(updatedProg);
      void persistUserProfileUpdate(authUser, updatedProg);

      if (newlyCompletedQuests.length > 0) {
        setLastXpToast(
          `Quest Complete · ${newlyCompletedQuests[0].title} (+${newlyCompletedQuests[0].rewardXp} XP)`
        );
        setTimeout(() => setLastXpToast(null), 3500);
      }

      if (correct) {
        audioEngine.playCorrectFanfare(newStreak);
        setMascotState('celebrating');
        setMascotSpeech(
          `${isFever ? 'Fever Streak · ' : ''}+${points} pts · "${currentSong.title}" by ${
            currentSong.artist
          } (${currentSong.releaseYear})`
        );
      } else {
        audioEngine.playWrongScratch();
        setMascotState('sympathy');
        setMascotSpeech(
          `Answer: "${currentSong.title}" · ${currentSong.artist} · ${currentSong.genre} (${currentSong.releaseYear})`
        );
      }

      setSession((prev) => ({ ...prev, isRevealed: true }));
      setRoundFeedback({
        answered: true,
        correct,
        points,
        xpGained,
        coinsGained,
        selectedOptionId,
      });
    },
    [
      roundFeedback?.answered,
      session.config.challengeMode,
      session.streak,
      session.currentIndex,
      session.playlist.length,
      session.correctCount,
      session.score,
      challengeMode,
      effectiveDifficultyInfo.effectiveTier,
      snippetProgress,
      snippetDuration,
      doubleBoostActive,
      progression,
      authUser,
      currentSong.title,
      currentSong.artist,
      currentSong.releaseYear,
      currentSong.genre,
    ]
  );

  // Advance to the next song round or finish session
  const handleNextRound = useCallback(() => {
    if (!roundFeedback) return;
    audioEngine.playUiTick(1.15, 'medium');

    const nextState = advanceRoundState(session, {
      correct: roundFeedback.correct,
      timeRemainingRatio: Math.max(0.2, 1 - snippetProgress),
      doubleBoost: doubleBoostActive,
    });

    setRoundFeedback(null);
    resetRoundPowerUps();
    setSession(nextState);

    if (nextState.status === 'gameover') {
      setMascotState('celebrating');
      audioEngine.playCorrectFanfare(4);
      setMascotSpeech(
        `Set complete · ${nextState.score} pts · Level ${tierInfo.level} ${tierInfo.name}`
      );
    } else {
      const nextSong = nextState.playlist[nextState.currentIndex];
      if (nextSong) {
        triggerSnippetPlay(
          nextSong,
          snippetDuration,
          nextState.config.challengeMode || challengeMode
        );
      }
    }
  }, [
    roundFeedback,
    session,
    snippetProgress,
    doubleBoostActive,
    resetRoundPowerUps,
    tierInfo.level,
    tierInfo.name,
    triggerSnippetPlay,
    snippetDuration,
    challengeMode,
  ]);

  // Toggle Light / Dark Theme
  const toggleThemeMode = useCallback(() => {
    audioEngine.playTabSwitch(themeMode === 'dark');
    updatePreferences({ theme: themeMode === 'light' ? 'dark' : 'light' });
  }, [themeMode, updatePreferences]);

  const selectCompanion = useCallback((id: MascotCharacterId) => {
    audioEngine.playDiscovery(true);
    setCharacterId(id);
    setMascotState('hyped');
    const companion = MASCOT_CHARACTERS.find(character => character.id === id)!;
    setMascotSpeech(`${companion.name} is in the groove.`);
    setProgression(previous => {
      const updated = { ...previous, mascotId: id };
      void persistUserProfileUpdate(authUser, updated);
      return updated;
    });
  }, [authUser]);

  // Save custom Callsign & Tagline in User Profile Modal
  const handleSaveProfileIdentity = useCallback(() => {
    audioEngine.playUiTick(1.25, 'medium');
    const cleanCallsign = sanitizeCallsign(draftCallsign);
    const cleanTagline = sanitizeTagline(draftTagline);
    setDraftCallsign(cleanCallsign);
    setDraftTagline(cleanTagline);
    setIsEditingProfile(false);
    setProgression((prev) => {
      const updated: PlayerProgressionState = {
        ...prev,
        callsign: cleanCallsign,
        tagline: cleanTagline,
        mascotId: characterId,
      };
      void persistUserProfileUpdate(authUser, updated);
      return updated;
    });
    setLastXpToast(`Profile Saved · ${cleanCallsign}`);
    setTimeout(() => setLastXpToast(null), 2600);
  }, [draftCallsign, draftTagline, characterId, authUser]);

  // Sign in with Google for Cloud Profile Sync
  const handleGoogleSignIn = useCallback(async () => {
    if (isAuthBusy) return;
    setIsAuthBusy(true);
    audioEngine.playUiTick(1.2, 'medium');
    try {
      const user = await signInWithGooglePopup();
      const synced = await syncOrInitializeUserProfile(user, progressionRef.current);
      setProgression(synced);
      setDraftCallsign(synced.callsign);
      setDraftTagline(synced.tagline);
      setLastXpToast(`Cloud Synced · Welcome ${synced.callsign}`);
      setTimeout(() => setLastXpToast(null), 3000);
    } catch {
      // Popup closed by user or restricted in preview
    } finally {
      setIsAuthBusy(false);
    }
  }, [isAuthBusy]);

  const handleGoogleSignOut = useCallback(async () => {
    audioEngine.playUiTick(0.95, 'light');
    await signOutUser();
    setLastXpToast('Signed out of Cloud Profile');
    setTimeout(() => setLastXpToast(null), 2400);
  }, []);

  // Game shortcuts never intercept focused controls or an open modal.
  useEffect(() => {
    let secretKeys = '';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (onboarding.open || isSettingsOpen || isAccountModalOpen || isPassModalOpen || isRulesDrawerOpen) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable="true"], dialog, [role="dialog"], [cmdk-root]')) return;
      if (session.status === 'title' && event.key.length === 1) {
        secretKeys = (secretKeys + event.key.toLowerCase()).slice(-6);
        if (secretKeys === 'groove') discoverGroove('Secret selector. Welcome to the B-side.');
      }
      if (session.status === 'title' && (event.code === 'Enter' || event.code === 'Space')) {
        event.preventDefault();
        void startNewGame();
      } else if (event.code === 'KeyP' || event.code === 'Escape') {
        if (session.status === 'playing') {
          event.preventDefault();
          audioEngine.stopSnippet(false);
          setIsPlayingSnippet(false);
          setSession(previous => ({ ...previous, status: 'paused' }));
        } else if (session.status === 'paused') {
          event.preventDefault();
          resumeGame();
        }
      } else if (event.code === 'KeyM') {
        event.preventDefault();
        const muted = !audioEngine.getMuted();
        audioEngine.setMuted(muted);
        updatePreferences({ muted });
      } else if (event.code === 'KeyT') {
        event.preventDefault();
        toggleThemeMode();
      } else if (event.code === 'KeyH' && session.status === 'playing') {
        event.preventDefault();
        setIsDockCollapsed(previous => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.status, onboarding.open, isSettingsOpen, isAccountModalOpen, isPassModalOpen, isRulesDrawerOpen, startNewGame, toggleThemeMode, updatePreferences, discoverGroove, resumeGame]);

  useGSAP(() => {
    if (session.status !== 'title' || reducedMotion) return;
    gsap.fromTo('.studio-intro-word', { y: 14, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.75, stagger: 0.08, ease: 'power3.out' });
    gsap.fromTo('.studio-intro-copy', { opacity: 0.2 }, { opacity: 1, duration: 0.8, delay: 0.25 });
  }, { dependencies: [session.status, reducedMotion], scope: introRef, revertOnUpdate: true });

  const handleSelectFilterValue = async (mode: FilterMode, val: string) => {
    audioEngine.playUiTick(1.08, 'selection');
    setFilterMode(mode);
    setFilterValue(val);
    setCustomSearchTerm('');
    setSelectedArtist(null);
    await fetchLiveCrate(mode, val);
  };

  const potentialPoints = useMemo(() => {
    return calculateRoundPoints({
      correct: true,
      snippetSeconds: snippetDuration,
      streak: session.streak,
      timeRemainingRatio: 0.8,
      doubleBoost: doubleBoostActive,
      difficulty: effectiveDifficultyInfo.effectiveTier,
    }).points;
  }, [
    snippetDuration,
    session.streak,
    doubleBoostActive,
    effectiveDifficultyInfo.effectiveTier,
  ]);

  const isFeverActive = session.streak >= 2;

  // Circular Icon Button style matching IMG_5846 & IMG_5847
  const circleBtnClass = isLight
    ? 'border-border bg-card text-foreground hover:bg-muted'
    : 'border-white/15 bg-card text-foreground hover:bg-white/10';

  const primaryBtnClasses = 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_24px_rgba(16,39,33,0.12)]';

  const interactWithCompanion = () => {
    companionTaps.current += 1;
    if (companionTaps.current % 3 === 0) discoverGroove(`${activeCharacter.name} knows a secret dance.`);
    setMascotState('hyped');
    setMascotSpeech(
      `${progression.callsign} · Overall ${progression.overallScore} pts · ${overallWlStats.winRatePercent}% Win Rate`
    );
    setTimeout(() => setMascotState(isPlayingSnippet ? 'listening' : 'idle'), 1800);
  };

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'} transition={{ type: 'spring', stiffness: 360, damping: 32 }}>
    <ClickSpark sparkColor={['#16735d', '#b8d97f']} sparkCount={6} sparkRadius={22} duration={350} disabled={reducedMotion} shape="dot" triggerSelector="[data-spark]" className="wavelet-click-sparks">
    <main
      data-theme={themeMode}
      data-state={session.status}
      data-offline={!isOnline}
      data-dock-collapsed={isDockCollapsed}
      data-reduced-motion={reducedMotion}
      className={`wavelet-app relative h-dvh w-full max-w-full overflow-x-hidden overflow-y-auto select-none transition-colors duration-500 ${
        isLight ? 'text-foreground' : 'text-foreground'
      }`}
    >
      <ThreeTopographyBackground theme={themeMode} reducedMotion={reducedMotion} enabled={preferences.animatedBackground && !onboarding.open} />
      {/* Full-Viewport 3D Isometric Three.js Vinyl & Smooth Mascot Stage */}
      <IsometricVinylStage
        mood={currentMood}
        mascotState={mascotState}
        characterId={characterId}
        themeMode={themeMode}
        isPlayingSnippet={isPlayingSnippet}
        gameState={session.status}
        reducedMotion={reducedMotion}
        obscured={onboarding.open}
        onMascotInteract={interactWithCompanion}
        onTurntableInteract={() => {
          setMascotSpeech(
            `Turntable scratch · ${currentMood.label} · ${currentMood.bpm} BPM`
          );
        }}
      />

      {session.status !== 'title' && <h1 className="sr-only">Wavelet music guessing game</h1>}
      {session.status !== 'title' && session.status !== 'playing' && <button type="button" className="studio-icon-button studio-floating-settings" aria-label="Open settings" onClick={() => setIsSettingsOpen(true)}><GearSix size={20} /></button>}
      <DiscoveryDelight discovery={discovery} reducedMotion={reducedMotion} />

      {/* Quest / XP / Profile Achievement Toast */}
      <AnimatePresence>
        {lastXpToast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="pointer-events-none fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xl"
          >
            <Trophy weight="fill" className="h-4 w-4 shrink-0" />
            <span role="status">{lastXpToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOnline && <div role="status" className="connectivity-banner"><WifiSlash size={15} /> Offline · Cached clips & practice grooves</div>}

      {/* Responsive Mobile-First Shell Container */}
      <div
        className={`wavelet-shell pointer-events-none relative z-20 mx-auto flex min-h-full w-full flex-col justify-between transition-all duration-300 ${
          isDesktopViewport && mobileFrameLocked
            ? isLight
              ? 'max-w-[430px] border-x border-border/80 shadow-[0_0_60px_rgba(0,0,0,0.06)]'
              : 'max-w-[430px] border-x border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.75)]'
            : 'max-w-5xl'
        } pt-3.5 pb-3.5 px-3.5`}
      >
        {/* =====================================================================
            STATE 1: TITLE SCREEN STAGE (MINIMAL BAUHAUS / URBANIST MOBILE UI)
           ===================================================================== */}
        {session.status === 'title' && (
          <>
            <div className="pointer-events-auto studio-title-top">
              <header className="studio-header">
                <WaveletBrand reducedMotion={reducedMotion} onDiscover={() => discoverGroove()} />
                <nav aria-label="Studio utilities" className="studio-header-actions">
                  <button type="button" className="studio-icon-button" data-testid="vinyl-pass-btn" aria-label="Open player profile" title="Your profile & progress" onClick={() => { audioEngine.playTabSwitch(); setIsPassModalOpen(true); }}><UserCircle size={22} /></button>
                  <button type="button" className="studio-icon-button" data-testid="settings-btn" aria-label="Open settings" aria-haspopup="dialog" aria-expanded={isSettingsOpen} onClick={() => { audioEngine.playTabSwitch(); setIsSettingsOpen(true); }}><GearSix size={21} /></button>
                </nav>
              </header>
              <div ref={introRef} className="studio-intro">
                <p className="studio-eyebrow studio-intro-copy">The music guessing game</p>
                <h1 className="max-w-md"><span className="studio-intro-word">Little clips.</span><br /><span className="studio-intro-word studio-intro-accent">Big music energy.</span></h1>
                <p className="studio-intro-copy">Listen. Trust your ears. Find your groove.</p>
              </div>
              {preferences.danceVideo && !reducedMotion && <video src="/assets/aistudio/gemini_generated_video_7AE59D01_39556c31.mp4" autoPlay loop muted playsInline aria-label="Your companion dancing" className="studio-cameo" />}
            </div>

            {/* Unobstructed 3D Center Stage */}
            <div className="pointer-events-none flex-1" />

            <GameSetup challenge={challengeMode} onChallenge={handleSelectChallengeMode}
              difficulty={difficulty} onDifficulty={handleSelectDifficulty}
              duration={snippetDuration} onDuration={setSnippetDuration} count={songCount} onCount={setSongCount}
              playMode={playMode} onPlayMode={setPlayMode} rulesOpen={isRulesDrawerOpen} onRulesOpen={setIsRulesDrawerOpen}
              reducedMotion={reducedMotion} loading={isLoadingSongs || isStartingGame} availableTracks={songPool.length} error={crateError}
              onStart={() => { void startNewGame(); }} mode={filterMode} value={filterValue} artist={selectedArtist} customSearch={customSearchTerm}
              onSelect={(mode, value) => { void handleSelectFilterValue(mode, value); }}
              onArtist={artist => { audioEngine.playUiTick(1.1); setSelectedArtist(artist); setFilterMode('artist'); setFilterValue(artist.name); setCustomSearchTerm(''); void fetchLiveCrate('artist', artist.name, undefined, artist); }}
              onSearch={term => { setCustomSearchTerm(term); setSelectedArtist(null); setFilterMode('genre'); setFilterValue('All'); void fetchLiveCrate('genre', 'All', term); }}
              onAccount={() => { if (connectedProfile?.customTracks.length) { setSelectedArtist(null); setCustomSearchTerm(''); setFilterMode('account'); setFilterValue(connectedProfile.displayName); void fetchLiveCrate('account', connectedProfile.displayName); } else setIsAccountModalOpen(true); }} />
          </>
        )}

        {/* =====================================================================
            STATE 2: PLAYING HUD & COLLAPSIBLE BOTTOM CONTROL DOCK
           ===================================================================== */}
        {session.status === 'playing' && (
          <>
            {/* Top Perimeter HUD + Horizontal Round Process Capsule (IMG_5847!) */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto flex flex-col gap-2"
            >
              <div
                className={`flex items-center justify-between gap-2 rounded-[24px] border px-3.5 py-2.5 shadow-sm transition-colors ${
                  isLight
                    ? 'border-border bg-card/95 text-foreground'
                    : 'border-white/12 bg-card/95 text-foreground'
                }`}
              >
                {/* Score, Streak, Mode & Round Readouts (Tabular Numerals) */}
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div
                      className={`text-[10px] font-semibold ${
                        isLight ? 'text-muted-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Score
                    </div>
                    <div
                      data-testid="hud-score"
                      className="text-lg font-bold font-mono tabular-nums"
                    >
                      {Math.round(session.score + (roundFeedback?.points || 0))}
                    </div>
                  </div>

                  <div>
                    <div
                      className={`flex items-center gap-1 text-[10px] font-semibold ${
                        isLight ? 'text-muted-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <span>Streak</span>
                      {isFeverActive && (
                        <Fire weight="fill" className="h-3.5 w-3.5 text-[#E07A47]" />
                      )}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-primary">
                      {roundFeedback?.answered
                        ? roundFeedback.correct
                          ? session.streak + 1
                          : 0
                        : session.streak}
                      x
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div
                      className={`text-[10px] font-semibold truncate ${
                        isLight ? 'text-muted-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {activeChallengeModeDef.shortLabel} · {activeDifficultyDef.shortLabel}
                      {effectiveDifficultyInfo.isScaledUp ? '+' : ''}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums">
                      {session.currentIndex + 1}/{session.playlist.length}
                    </div>
                  </div>
                </div>

                {/* Right Circular Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      audioEngine.playTabSwitch(true);
                      setIsPassModalOpen(true);
                    }}
                    aria-label="Open User Profile and Vinyl Pass"
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-secondary px-2.5 text-xs font-bold text-foreground"
                  >
                    <Coins weight="fill" className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono tabular-nums">{progression.coins}</span>
                  </motion.button>

                  <button type="button" className="studio-icon-button" aria-label="Open settings" aria-haspopup="dialog" aria-expanded={isSettingsOpen} onClick={() => { audioEngine.playTabSwitch(); setIsSettingsOpen(true); }}><GearSix size={20} /></button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      audioEngine.playUiTick(0.95, 'light');
                      audioEngine.stopSnippet(false);
                      setIsPlayingSnippet(false);
                      setSession((prev) => ({ ...prev, status: 'paused' }));
                    }}
                    aria-label="Pause game"
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${circleBtnClass}`}
                  >
                    <Pause weight="bold" className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {/* Horizontal Step Process Bar (Inspired directly by IMG_5847!) */}
              <RoundStepProcessBar
                totalRounds={session.playlist.length}
                currentIndex={session.currentIndex}
                history={session.history}
                isLight={isLight}
              />
            </motion.div>

            {/* Unobstructed 3D Center Playfield */}
            <div className="pointer-events-none flex-1" />

            {/* Unified Collapsible Bottom Control Dock */}
            <div className="pointer-events-auto flex flex-col items-center">
              <motion.button
                type="button"
                aria-expanded={!isDockCollapsed}
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                onClick={() => {
                  audioEngine.playUiTick(1.05, 'light');
                  setIsDockCollapsed((prev) => !prev);
                }}
                className={`mb-1.5 inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-bold transition-colors ${
                  isLight
                    ? 'border-border bg-card/92 text-foreground/75 hover:text-foreground'
                    : 'border-white/15 bg-card/90 text-white/80 hover:text-white'
                }`}
              >
                {isDockCollapsed ? (
                  <>
                    <CaretUp weight="bold" className="h-3.5 w-3.5" />
                    <span>Show Controls [H]</span>
                  </>
                ) : (
                  <>
                    <CaretDown weight="bold" className="h-3.5 w-3.5" />
                    <span>Zen 3D View [H]</span>
                  </>
                )}
              </motion.button>

              <AnimatePresence initial={false}>
                {!isDockCollapsed && (
                  <motion.section
                    id="wavelet-round-controls"
                    initial={reducedMotion ? false : { opacity: 0, y: 12, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={reducedMotion ? { height: 0, opacity: 0 } : { opacity: 0, y: 12, height: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                    aria-label="Active Song Quiz Controls"
                    className={`w-full overflow-hidden squircle border p-3.5 space-y-2.5 transition-colors ${
                      isLight
                        ? 'border-border bg-card/96 text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.08)]'
                        : 'border-white/12 bg-card/96 text-foreground shadow-2xl'
                    }`}
                  >
                    {/* Waveform & Cover Card (IMG_5813 + IMG_5847!) */}
                    <AppleMusicCoverCard
                      key={session.currentIndex}
                      song={currentSong}
                      mood={currentMood}
                      themeMode={themeMode}
                      isRevealed={session.isRevealed}
                      isPlaying={isPlayingSnippet}
                      snippetProgress={snippetProgress}
                      snippetDuration={snippetDuration}
                      compact
                      artistHintText={artistHintText}
                      onReplaySnippet={() =>
                        triggerSnippetPlay(
                          currentSong,
                          snippetDuration,
                          session.config.challengeMode || challengeMode
                        )
                      }
                      onSaveTrack={() => {
                        setProgression((p) => {
                          const updated: PlayerProgressionState = {
                            ...p,
                            xp: p.xp + 50,
                            coins: p.coins + 15,
                            unlockedBadges: Array.from(
                              new Set([...p.unlockedBadges, 'crate-curator'])
                            ).slice(0, 20),
                          };
                          void persistUserProfileUpdate(authUser, updated);
                          return updated;
                        });
                        setLastXpToast('Saved to Library · +50 XP · +15 Coins');
                        setTimeout(() => setLastXpToast(null), 2600);
                      }}
                    />

                    {/* Zero-Overflow 2-Row Transport + Power-Up Grid (Fixes IMG_5849 horizontal clipping!) */}
                    {!roundFeedback?.answered && (
                      <div className="space-y-1.5">
                        {/* Row 1: Playback, +Time & Answer Format Switch (3 equal columns, never overflows) */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                              triggerSnippetPlay(
                                currentSong,
                                snippetDuration,
                                session.config.challengeMode || challengeMode
                              )
                            }
                            className={`flex min-h-[36px] min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                              isLight
                                ? 'bg-muted text-foreground hover:bg-[#E5E5E5]'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Play weight="fill" className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">
                              {isPlayingSnippet ? `${snippetDuration}s` : 'Replay'}
                            </span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={snippetDuration >= 30}
                            onClick={() => {
                              const nextDur: SnippetDuration =
                                snippetDuration < 5 ? 5 : snippetDuration < 15 ? 15 : 30;
                              setSnippetDuration(nextDur);
                              triggerSnippetPlay(
                                currentSong,
                                nextDur,
                                session.config.challengeMode || challengeMode
                              );
                            }}
                            className={`flex min-h-[36px] min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                              snippetDuration >= 30
                                ? 'opacity-45 cursor-not-allowed bg-muted text-foreground'
                                : 'bg-secondary text-foreground'
                            }`}
                          >
                            <Timer weight="bold" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {snippetDuration >= 30 ? '30s Max' : '+Time'}
                            </span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              audioEngine.playUiTick(1.05, 'selection');
                              setPlayMode((m) =>
                                m === 'party-30s' ? 'quiz-4choice' : 'party-30s'
                              );
                            }}
                            className={`flex min-h-[36px] min-w-0 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                              isLight
                                ? 'border-border bg-card text-foreground/80 hover:bg-muted'
                                : 'border-white/15 bg-white/5 text-white/85 hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate">
                              {playMode === 'party-30s' ? '4-Choice' : '30s Judge'}
                            </span>
                          </motion.button>
                        </div>

                        {/* Row 2: Studio Power-Up Boosters (3 equal columns inside a pill container) */}
                        <div
                          className={`grid grid-cols-3 gap-1.5 rounded-full p-1 ${
                            isLight ? 'bg-muted' : 'bg-white/8'
                          }`}
                        >
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={Boolean(artistHintText)}
                            onClick={handleUseArtistHint}
                            className={`flex min-h-[32px] min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
                              artistHintText
                                ? 'bg-primary text-primary-foreground'
                                : isLight
                                  ? 'bg-card text-foreground shadow-2xs hover:bg-secondary'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Lightbulb weight="fill" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{artistHintText ? 'Clue On' : 'Clue'}</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={eliminatedOptionIds.length > 0}
                            onClick={handleUseFiftyFifty}
                            className={`flex min-h-[32px] min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
                              eliminatedOptionIds.length > 0
                                ? 'bg-primary text-primary-foreground'
                                : isLight
                                  ? 'bg-card text-foreground shadow-2xs hover:bg-secondary'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Scissors weight="bold" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">50/50</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={doubleBoostActive}
                            onClick={handleUseDoubleBoost}
                            className={`flex min-h-[32px] min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
                              doubleBoostActive
                                ? 'bg-secondary text-foreground'
                                : isLight
                                  ? 'bg-card text-foreground shadow-2xs hover:bg-secondary'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Lightning weight="fill" className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">{doubleBoostActive ? '2x On' : '2x Boost'}</span>
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Active Mode Prompt Header */}
                    {!roundFeedback?.answered && (
                      <div className="flex items-center justify-between px-1 text-[11px]">
                        <span className="font-bold text-primary truncate">
                          {activeChallengeModeDef.badgeCode} · {activeChallengeModeDef.promptLabel}
                        </span>
                        <span className="font-mono font-bold tabular-nums opacity-65 shrink-0 ml-2">
                          +{potentialPoints} pts
                        </span>
                      </div>
                    )}

                    {/* MODE A: 30-SECONDS PARTY SELF-SCORING ("Right or Wrong") */}
                    {playMode === 'party-30s' && !roundFeedback?.answered && (
                      <div>
                        {!session.isRevealed ? (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              audioEngine.playUiTick(1.15, 'medium');
                              setSession((prev) => ({ ...prev, isRevealed: true }));
                              setMascotSpeech(
                                `"${currentSong.title}" · ${currentSong.artist} · ${currentSong.genre} (${currentSong.releaseYear})`
                              );
                            }}
                            className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${primaryBtnClasses}`}
                          >
                            <Eye weight="bold" className="h-4 w-4" />
                            <span>Reveal {activeChallengeModeDef.shortLabel} &amp; Score Round</span>
                          </motion.button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleJudgeAnswer(true)}
                              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md whitespace-nowrap"
                            >
                              <Check weight="bold" className="h-4 w-4 shrink-0" />
                              <span>Right (+{potentialPoints})</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleJudgeAnswer(false)}
                              className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold whitespace-nowrap ${
                                isLight
                                  ? 'border-border bg-muted text-foreground'
                                  : 'border-white/15 bg-white/10 text-white'
                              }`}
                            >
                              <X weight="bold" className="h-4 w-4 shrink-0" />
                              <span>Missed (0)</span>
                            </motion.button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Keep choices visible after answering so players can see their pick and the correct answer. */}
                    {playMode === 'quiz-4choice' && (
                      <div className="grid grid-cols-2 gap-1.5" aria-label="Answer choices">
                        {challengeOptions.map((option, optionIndex) => {
                          const isEliminated = eliminatedOptionIds.includes(option.id);
                          const answered = Boolean(roundFeedback?.answered);
                          const isCorrectAnswer = answered && option.isCorrect;
                          const isWrongPick = answered && roundFeedback?.selectedOptionId === option.id && !option.isCorrect;
                          return (
                            <motion.button
                              key={`${session.currentIndex}-${option.id}`}
                              type="button"
                              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                              whileHover={!answered && !isEliminated && !reducedMotion ? { y: -2 } : undefined}
                              whileTap={!answered && !reducedMotion ? { scale: 0.97 } : undefined}
                              animate={isCorrectAnswer && !reducedMotion ? { opacity: 1, y: 0, scale: [1, 1.035, 1] } : { opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: reducedMotion ? 0 : 0.34, delay: answered || reducedMotion ? 0 : optionIndex * 0.045 }}
                              disabled={isEliminated}
                              aria-disabled={answered || isEliminated}
                              aria-label={
                                option.primaryText +
                                (isCorrectAnswer ? ', correct answer' : isWrongPick ? ', your incorrect choice' : '')
                              }
                              onClick={() => {
                                if (!answered && !isEliminated) handleJudgeAnswer(option.isCorrect, option.id);
                              }}
                              className={'relative flex min-h-[52px] min-w-0 flex-col justify-center rounded-[18px] border-2 px-3 py-2 text-left transition-colors ' +
                                (isCorrectAnswer
                                  ? 'border-[#179366] bg-[#dff8e9] text-[#164e38] shadow-[0_0_0_2px_rgba(23,147,102,0.1)]'
                                  : isWrongPick
                                    ? 'border-[#ca5c4c] bg-[#fff0e9] text-[#863d31] shadow-[0_0_0_2px_rgba(202,92,76,0.1)]'
                                    : isEliminated
                                      ? 'cursor-not-allowed border-border opacity-30 line-through'
                                      : answered
                                        ? 'cursor-default border-border/70 bg-muted/30 opacity-65'
                                        : isLight
                                          ? 'border-border bg-muted/70 hover:border-[#17775c] hover:bg-secondary'
                                          : 'border-white/12 bg-white/5 hover:border-primary hover:bg-secondary hover:text-foreground')}
                            >
                              <span className="flex w-full min-w-0 items-center justify-between gap-1">
                                <span className="truncate text-xs font-bold">{option.primaryText}</span>
                                {isCorrectAnswer && <Check weight="bold" className="h-4 w-4 shrink-0" aria-hidden="true" />}
                                {isWrongPick && <X weight="bold" className="h-4 w-4 shrink-0" aria-hidden="true" />}
                              </span>
                              <span className="truncate text-[10px] opacity-75">{option.secondaryText}</span>
                              {(isCorrectAnswer || isWrongPick) && (
                                <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wide">
                                  {isCorrectAnswer ? 'Correct answer' : 'Your pick'}
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* High-contrast animated outcome with an explicit answer and a full-width next action. */}
                    {roundFeedback?.answered && (
                      <RoundAnswerFeedback
                        correct={roundFeedback.correct}
                        points={roundFeedback.points}
                        xpGained={roundFeedback.xpGained}
                        coinsGained={roundFeedback.coinsGained}
                        correctAnswer={challengeOptions.find(option => option.isCorrect)?.primaryText || currentSong.title}
                        songLabel={currentSong.title + ' — ' + currentSong.artist + ' (' + currentSong.releaseYear + ')'}
                        selectedAnswer={challengeOptions.find(option => option.id === roundFeedback.selectedOptionId)?.primaryText}
                        challengeLabel={activeChallengeModeDef.shortLabel}
                        roundIndex={session.currentIndex}
                        isFinalRound={session.currentIndex + 1 >= session.playlist.length}
                        isLight={isLight}
                        reducedMotion={reducedMotion}
                        onNext={handleNextRound}
                      />
                    )}
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* =====================================================================
            STATE 3: PAUSED MODAL
           ===================================================================== */}
        {session.status === 'paused' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-modal-title"
            className={`pointer-events-auto my-auto mx-auto w-full max-w-sm squircle border p-6 text-center shadow-2xl space-y-4 ${
              isLight
                ? 'border-border bg-card text-foreground'
                : 'border-white/15 bg-card text-foreground'
            }`}
          >
            <h2 id="pause-modal-title" className="text-2xl font-bold tracking-tight">
              Session Paused
            </h2>
            <p className={`text-xs ${isLight ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {activeChallengeModeDef.title} ({activeDifficultyDef.shortLabel}) · Round{' '}
              {session.currentIndex + 1} of {session.playlist.length}
            </p>

            <div
              className={`grid grid-cols-2 gap-3 rounded-[22px] p-3.5 ${
                isLight ? 'bg-muted' : 'bg-black/40'
              }`}
            >
              <div>
                <div className="text-[11px] font-semibold opacity-60">Score</div>
                <div className="text-2xl font-bold font-mono tabular-nums">
                  {session.score}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold opacity-60">Streak</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-primary">
                  {session.streak}x
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={resumeGame}
                className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${primaryBtnClasses}`}
              >
                <Play weight="fill" className="h-4 w-4" />
                <span>Resume Turntable</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => startNewGame()}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  isLight
                    ? 'bg-muted text-foreground hover:bg-[#E5E5E5]'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <ArrowsClockwise weight="bold" className="h-4 w-4" />
                <span>Restart Session</span>
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSnippet(false);
                  setSession((prev) => ({ ...prev, status: 'title' }));
                }}
                className="flex min-h-[40px] w-full items-center justify-center rounded-full text-xs font-semibold opacity-65 hover:opacity-100"
              >
                Back to Mode &amp; Crate Setup
              </button>
            </div>
          </motion.div>
        )}

        {/* =====================================================================
            STATE 4: GAME OVER / SESSION SUMMARY WITH RADIAL TICK GAUGE (IMG_5846!)
           ===================================================================== */}
        {session.status === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameover-modal-title"
            className={`pointer-events-auto my-auto mx-auto flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden squircle border p-5 shadow-2xl ${
              isLight
                ? 'border-border bg-card text-foreground'
                : 'border-white/15 bg-card text-foreground'
            }`}
          >
            {/* Keep the action buttons reachable while the entire results content can scroll. */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pr-1" role="region" aria-label="Session results and played tracks" tabIndex={0}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-primary">
                  {activeChallengeModeDef.title} · Level {tierInfo.level} {tierInfo.name}
                </div>
                <h2 id="gameover-modal-title" className="text-2xl font-bold tracking-tight">
                  Session Summary
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-mono text-xs font-bold text-foreground">
                {session.bestStreak}x
              </div>
            </div>

            {/* Radial Tick-Mark Accuracy Gauge (IMG_5846 Lead Score 90 Gauge!) */}
            <div className="mt-3">
              <SegmentedTickArcGauge
                value={
                  session.history.length > 0
                    ? Math.round((session.correctCount / session.history.length) * 100)
                    : 0
                }
                gradeLabel={tierInfo.grade}
                statusLabel={`${Math.round(session.score)} pts`}
                isLight={isLight}
              />
            </div>

            {/* Played Tracks List with Direct Add to Spotify & Apple Music Links */}
            <div className="space-y-2">
              {session.history.map((item, idx) => {
                const links = buildStreamingLinks(item.song);
                return (
                  <div
                    key={`${item.song.id}-${idx}`}
                    className={`flex items-center justify-between gap-2.5 rounded-[20px] border p-3 ${
                      item.correct && isLight
                        ? 'border-[#000000]/10 bg-secondary/55'
                        : isLight
                          ? 'border-border bg-muted/70'
                          : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.correct ? `+${item.pointsEarned}` : '0'}
                        </span>
                        <span aria-hidden="true" className="opacity-40">
                          ·
                        </span>
                        <span className="truncate text-xs font-bold">
                          {item.song.title}
                        </span>
                      </div>
                      <div className="truncate text-[11px] opacity-65">
                        {item.song.artist} · {item.song.genre} · {item.song.releaseYear}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={links.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Add ${item.song.title} to Spotify`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-[#1DB954]"
                      >
                        <SpotifyLogo weight="fill" className="h-4 w-4" />
                      </a>
                      <a
                        href={links.appleMusicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.song.title} in Apple Music`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                          isLight
                            ? 'border-border bg-card text-[#FA243C]'
                            : 'border-white/15 bg-white/10 text-[#FA243C]'
                        }`}
                      >
                        <AppleLogo weight="fill" className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            </div>

            {/* Play Again & Change Mode/Crate Actions */}
            <div
              className={`mt-4 grid shrink-0 grid-cols-2 gap-2.5 pt-3 border-t ${
                isLight ? 'border-[#F1F1F1]' : 'border-white/10'
              }`}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                data-start="true"
                onClick={() => startNewGame()}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${primaryBtnClasses}`}
              >
                <ArrowsClockwise weight="bold" className="h-4 w-4" />
                <span>Play Again</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  audioEngine.playUiTick(1.05, 'light');
                  setSession((prev) => ({ ...prev, status: 'title' }));
                }}
                className={`flex min-h-[48px] items-center justify-center rounded-full px-4 py-2.5 text-sm font-bold ${
                  isLight
                    ? 'bg-muted text-foreground hover:bg-[#E5E5E5]'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                Change Mode
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* =====================================================================
          USER PROFILE, PER-MODE WIN/LOSS RATIOS & GAMIFICATION PASS MODAL
         ===================================================================== */}
      <StudioDialog open={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} labelledBy="vinyl-pass-title" reducedMotion={reducedMotion}>
        <div className="overflow-y-auto p-5 space-y-4">
              <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-[#D1D1D1] dark:bg-white/20 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-primary">
                    Level {tierInfo.level} · {tierInfo.name}
                  </span>
                  <h2 id="vinyl-pass-title" className="text-xl font-bold tracking-tight">
                    Selector Profile &amp; Pass
                  </h2>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    audioEngine.playUiTick(0.9, 'light');
                    setIsPassModalOpen(false);
                  }}
                  autoFocus
                  aria-label="Close Selector Profile modal"
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${circleBtnClass}`}
                >
                  <X weight="bold" className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Sub-Navigation Pill Switcher: Profile | Mode Stats | Quests & Badges */}
              <div
                className={`grid grid-cols-3 gap-1 rounded-full border p-1 ${
                  isLight ? 'border-border bg-muted' : 'border-white/12 bg-black/40'
                }`}
              >
                {(
                  [
                    { id: 'profile', label: 'Account & PB' },
                    { id: 'modes', label: 'Mode W/L' },
                    { id: 'quests', label: 'Quests & Pass' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick(1.1, 'selection');
                      setPassModalTab(tab.id);
                    }}
                    className={`min-h-[34px] rounded-full text-xs font-bold transition-colors ${
                      passModalTab === tab.id
                        ? isLight
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground'
                        : isLight
                          ? 'text-muted-foreground hover:text-foreground'
                          : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: ACCOUNT IDENTITY, OVERALL SCORES & PERSONAL BESTS */}
              {passModalTab === 'profile' && (
                <div className="space-y-3.5">
                  {/* Account Identity Card + Cloud Sync */}
                  <div
                    className={`rounded-[24px] border p-4 space-y-3 ${
                      isLight
                        ? 'border-border bg-muted/65'
                        : 'border-white/12 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button type="button" onClick={interactWithCompanion} aria-label={`Pet ${activeCharacter.name}`} className="shrink-0 rounded-2xl border border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                          <CompanionPortrait character={activeCharacter} size={48} reducedMotion={reducedMotion} className="rounded-2xl" alt="" />
                        </button>
                        <div className="min-w-0">
                          <div className="truncate text-base font-extrabold tracking-tight">
                            {progression.callsign}
                          </div>
                          <div className="truncate text-xs opacity-65">
                            {progression.tagline}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] font-bold text-primary">
                            {authUser
                              ? 'Cloud Account Synced'
                              : 'Local Studio Profile · Sign in to sync'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playUiTick(1.1, 'light');
                          setIsEditingProfile((prev) => !prev);
                        }}
                        aria-label="Edit Callsign and Tagline"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${circleBtnClass}`}
                      >
                        <PencilSimple weight="bold" className="h-4 w-4" />
                      </button>
                    </div>

                    {isEditingProfile && (
                      <div className="space-y-2 pt-2 border-t border-border/60 dark:border-white/10">
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">
                            Selector Callsign (Max 40 chars)
                          </label>
                          <input
                            type="text"
                            maxLength={40}
                            value={draftCallsign}
                            onChange={(e) => setDraftCallsign(e.target.value)}
                            className={`w-full rounded-full border px-3.5 py-2 text-xs font-bold focus:outline-none ${
                              isLight
                                ? 'border-border bg-card text-foreground'
                                : 'border-white/15 bg-black/50 text-white'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase opacity-60 mb-1">
                            Studio Tagline (Max 80 chars)
                          </label>
                          <input
                            type="text"
                            maxLength={80}
                            value={draftTagline}
                            onChange={(e) => setDraftTagline(e.target.value)}
                            className={`w-full rounded-full border px-3.5 py-2 text-xs focus:outline-none ${
                              isLight
                                ? 'border-border bg-card text-foreground'
                                : 'border-white/15 bg-black/50 text-white'
                            }`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveProfileIdentity}
                          className={`w-full rounded-full py-2 text-xs font-bold ${primaryBtnClasses}`}
                        >
                          Save Studio Profile
                        </button>
                      </div>
                    )}

                    {/* Firebase Cloud Auth Sign-In / Sign-Out Action */}
                    <div className="pt-1">
                      {authUser ? (
                        <button
                          type="button"
                          onClick={handleGoogleSignOut}
                          className={`flex min-h-[38px] w-full items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${
                            isLight
                              ? 'border-border bg-card text-foreground'
                              : 'border-white/15 bg-white/10 text-white'
                          }`}
                        >
                          <SignOut weight="bold" className="h-4 w-4" />
                          <span>Sign Out of Cloud Account</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isAuthBusy}
                          onClick={handleGoogleSignIn}
                          className={`flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${primaryBtnClasses}`}
                        >
                          <UserCircle weight="bold" className="h-4 w-4" />
                          <span>
                            {isAuthBusy
                              ? 'Connecting Account...'
                              : 'Create / Sync Cloud Account (Google)'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acid-Lime Overall Score & Personal Best Banner */}
                  <div className="grid grid-cols-2 gap-2.5 rounded-[22px] bg-secondary p-3.5 text-foreground">
                    <div>
                      <div className="text-[11px] font-semibold opacity-70">Overall Score</div>
                      <div className="font-mono text-2xl font-extrabold tabular-nums">
                        {progression.overallScore}
                      </div>
                      <div className="text-[10px] font-semibold opacity-75">
                        {progression.totalGamesPlayed} Sets Completed
                      </div>
                    </div>
                    <div className="border-l border-[#000000]/15 pl-3">
                      <div className="text-[11px] font-semibold opacity-70">Personal Best Set</div>
                      <div className="font-mono text-2xl font-extrabold tabular-nums text-primary">
                        {progression.bestSetScore}
                      </div>
                      <div className="text-[10px] font-semibold opacity-75">
                        Best Streak: {progression.highestStreakEver}x
                      </div>
                    </div>
                  </div>

                  {/* Career Win/Loss Ratio & Personal Bests Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      className={`rounded-[18px] border p-3 ${
                        isLight ? 'border-border bg-muted/60' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-60">Win / Loss</div>
                      <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums">
                        {progression.totalWins ?? progression.totalCorrect}W -{' '}
                        {progression.totalLosses ?? 0}L
                      </div>
                      <div className="font-mono text-[10px] font-bold text-primary">
                        {overallWlStats.ratioFormatted}
                      </div>
                    </div>

                    <div
                      className={`rounded-[18px] border p-3 ${
                        isLight ? 'border-border bg-muted/60' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-60">Win Rate</div>
                      <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-primary">
                        {overallWlStats.winRatePercent}%
                      </div>
                      <div className="font-mono text-[10px] opacity-65">
                        {overallWlStats.totalRounds} Rounds
                      </div>
                    </div>

                    <div
                      className={`rounded-[18px] border p-3 ${
                        isLight ? 'border-border bg-muted/60' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-60">Fastest Ear</div>
                      <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums">
                        {progression.fastestSnippetGuessed}s
                      </div>
                      <div className="font-mono text-[10px] opacity-65">Personal Best</div>
                    </div>
                  </div>

                  {/* Radial Tick-Mark Gauge */}
                  <SegmentedTickArcGauge
                    value={overallWlStats.totalRounds > 0 ? overallWlStats.winRatePercent : 90}
                    gradeLabel={tierInfo.grade}
                    statusLabel={`${progression.xp} XP`}
                    isLight={isLight}
                  />
                </div>
              )}

              {/* TAB 2: PER-MODE WIN/LOSS RATIOS & PERSONAL BESTS */}
              {passModalTab === 'modes' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold opacity-70">
                    <span>Performance by Game Mode</span>
                    <ChartBar weight="bold" className="h-4 w-4 text-primary" />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {GAME_CHALLENGE_MODES.map((m) => {
                      const stats = progression.modeStats?.[m.id] || {
                        wins: 0,
                        losses: 0,
                        gamesPlayed: 0,
                        bestScore: 0,
                        bestStreak: 0,
                      };
                      const wl = calculateWinLossRatio(stats.wins, stats.losses);

                      return (
                        <div
                          key={m.id}
                          className={`rounded-[22px] border p-3.5 transition-colors ${
                            isLight
                              ? 'border-border bg-muted/65'
                              : 'border-white/12 bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-primary">
                                {m.badgeCode}
                              </span>
                              <h3 className="text-sm font-extrabold tracking-tight">
                                {m.title} ({m.shortLabel})
                              </h3>
                            </div>
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs font-bold text-foreground tabular-nums">
                              {wl.winRatePercent}% Win
                            </span>
                          </div>

                          <div className="mt-2.5 grid grid-cols-4 gap-2 pt-2 border-t border-border/60 dark:border-white/10 font-mono">
                            <div>
                              <div className="text-[10px] opacity-60">W / L</div>
                              <div className="text-xs font-bold tabular-nums">
                                {stats.wins}W-{stats.losses}L
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] opacity-60">Ratio</div>
                              <div className="text-xs font-bold tabular-nums text-primary">
                                {wl.ratioFormatted}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] opacity-60">Best Score</div>
                              <div className="text-xs font-bold tabular-nums">
                                {stats.bestScore}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] opacity-60">Best Streak</div>
                              <div className="text-xs font-bold tabular-nums">
                                {stats.bestStreak}x
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: DAILY GROOVE QUESTS & COLLECTIBLE BADGES */}
              {passModalTab === 'quests' && (
                <div className="space-y-4">
                  {/* Daily Groove Quests */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold opacity-65">Daily Groove Quests</div>
                    {progression.quests.map((q) => (
                      <div
                        key={q.id}
                        className={`flex items-center justify-between gap-3 rounded-[20px] border p-3 ${
                          isLight
                            ? 'border-border bg-muted/65'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle
                              weight={q.completed ? 'fill' : 'regular'}
                              className="h-4 w-4 text-primary shrink-0"
                            />
                            <span className="truncate text-xs font-bold">{q.title}</span>
                          </div>
                          <p className="truncate text-[11px] opacity-65 mt-0.5">
                            {q.description} · {q.progress}/{q.target}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                            q.completed
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-foreground text-primary'
                          }`}
                        >
                          {q.completed ? 'Done' : `+${q.rewardXp}pt`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Collectible Vinyl Badges */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold opacity-65">
                      Milestones · {progression.unlockedBadges.length}/{ALL_BADGES.length}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_BADGES.map((badge) => {
                        const unlocked = progression.unlockedBadges.includes(badge.id);
                        return (
                          <div
                            key={badge.id}
                            className={`flex items-start gap-2 rounded-[18px] border p-2.5 ${
                              unlocked
                                ? isLight
                                  ? 'border-primary/40 bg-primary/10'
                                  : 'border-primary/40 bg-primary/15'
                                : isLight
                                  ? 'border-border bg-muted/40 opacity-55'
                                  : 'border-white/10 bg-white/[0.02] opacity-50'
                            }`}
                          >
                            {unlocked ? (
                              <Medal
                                weight="fill"
                                className="h-4 w-4 text-primary shrink-0 mt-0.5"
                              />
                            ) : (
                              <LockSimple
                                weight="bold"
                                className="h-4 w-4 opacity-50 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold">{badge.title}</div>
                              <div className="line-clamp-2 text-[10px] opacity-75">
                                {badge.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
        </div>
      </StudioDialog>

      <StudioSettings open={isSettingsOpen} onClose={() => { audioEngine.playTabSwitch(false); setIsSettingsOpen(false); }}
        preferences={preferences} onChange={updatePreferences} reducedMotion={reducedMotion}
        characterId={characterId} onCharacterChange={selectCompanion}
        onOpenMusic={() => setIsAccountModalOpen(true)} musicConnected={Boolean(connectedProfile)}
        isInstalled={isInstalled} isInstallable={isInstallable} isIOS={isIOS} onInstall={install}
        onReplayIntro={() => {
          setIsSettingsOpen(false);
          if (session.status === 'playing') {
            audioEngine.stopSnippet(false); setIsPlayingSnippet(false);
            setSession(previous => ({ ...previous, status: 'paused' }));
          }
          onboarding.replay();
        }}
        onPreviewSound={() => audioEngine.playDiscovery()} offlineReady={offlineReady}
        updateAvailable={updateAvailable} canUpdate={session.status !== 'playing' && session.status !== 'paused'} onUpdate={applyUpdate}
        isFullscreen={isFullscreen} onFullscreen={canFullscreen ? () => { void toggleFullscreen(); } : undefined} appStatus={appStatus} />

      {onboarding.run > 0 && <Onboarding key={onboarding.run} open={onboarding.open} replaying={onboarding.replaying}
        reducedMotion={reducedMotion} theme={themeMode} appearance={preferences.theme}
        onAppearance={theme => updatePreferences({ theme })} challenge={challengeMode} onChallenge={handleSelectChallengeMode}
        onDismiss={completed => { onboarding.dismiss(completed); if (onboarding.replaying) setIsSettingsOpen(true); }}
        onAfterClose={() => {
          const selector = onboarding.replaying ? '[aria-label="Replay the Wavelet intro"]' : '[data-start]';
          document.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true });
        }} />}

      {/* Spotify & Apple Music Account Connect Modal */}
      <MusicAccountModal
        isOpen={isAccountModalOpen}
        themeMode={themeMode}
        reducedMotion={reducedMotion}
        onClose={() => setIsAccountModalOpen(false)}
        connectedProfile={connectedProfile}
        onConnectSuccess={(profile) => {
          crateController.current?.abort();
          crateRequest.current += 1;
          setIsLoadingSongs(false);
          setCrateError(profile.customTracks.length ? null : 'This music crate has no playable songs yet. Choose another mix.');
          setConnectedProfile(profile);
          setSelectedArtist(null);
          setCustomSearchTerm('');
          setFilterMode('account');
          setFilterValue(profile.displayName);
          setSongPool(profile.customTracks);
        }}
        onDisconnect={() => {
          setConnectedProfile(null);
          setSelectedArtist(null);
          setCustomSearchTerm('');
          setFilterMode('genre');
          setFilterValue('All');
          void fetchLiveCrate('genre', 'All');
        }}
      />
    </main>
    </ClickSpark>
    </MotionConfig>
  );
};
