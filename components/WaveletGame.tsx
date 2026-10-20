'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { StudioSettings } from './StudioSettings';
import { StudioDialog } from './StudioDialog';
import { WaveletBrand } from './WaveletBrand';
import { DiscoveryDelight } from './DiscoveryDelight';

gsap.registerPlugin(useGSAP);

const SNIPPET_OPTIONS: SnippetDuration[] = [1, 3, 5, 10, 15, 30];
const SONG_COUNT_OPTIONS = [5, 10, 15];

const QUICK_VIBE_CRATES: Array<{
  id: string;
  label: string;
  mode: FilterMode;
  value: string;
}> = [
  { id: 'all', label: 'All Hits', mode: 'genre', value: 'All' },
  { id: 'pop', label: 'Pop', mode: 'genre', value: 'Pop' },
  { id: 'rnb', label: 'R&B / Soul', mode: 'genre', value: 'R&B/Soul' },
  { id: 'hiphop', label: 'Hip-Hop', mode: 'genre', value: 'Hip-Hop/Rap' },
  { id: 'afro', label: 'Afrobeats', mode: 'genre', value: 'Afrobeats' },
  { id: 'electro', label: 'Electronic', mode: 'genre', value: 'Electronic' },
  { id: '2020s', label: '2020s', mode: 'year', value: '2020s' },
  { id: '2000s', label: '2000s', mode: 'year', value: '2000s' },
  { id: '1990s', label: '1990s', mode: 'year', value: '1990s' },
];

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
          ? 'border-[#D1D1D1] bg-[#F1F1F1]/70 text-[#000000]'
          : 'border-white/12 bg-black/35 text-[#FFFFFF]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-[9px] border ${
              isLight ? 'border-[#D1D1D1] bg-[#FFFFFF]' : 'border-white/15 bg-white/5'
            }`}
          >
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full ${
                    i === 4 ? 'bg-[#12786C]' : isLight ? 'bg-[#000000]' : 'bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-sm font-bold tracking-tight">Rhythm Score</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-[#12786C] px-2.5 py-0.5 text-[11px] font-bold text-[#FFFFFF]">
            {gradeLabel}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isLight
                ? 'bg-[#FFFFFF] text-[#000000] border border-[#D1D1D1]'
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

            const x1 = cx + Math.cos(angleRad) * rInner;
            const y1 = cy + Math.sin(angleRad) * rInner;
            const x2 = cx + Math.cos(angleRad) * rOuter;
            const y2 = cy + Math.sin(angleRad) * rOuter;

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
              isLight ? 'text-[#000000]/55' : 'text-white/55'
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
          ? 'border-[#D1D1D1] bg-[#FFFFFF]/90'
          : 'border-white/12 bg-[#12161D]/90'
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
                ? 'bg-gradient-to-r from-[#12786C] to-[#EDFF8C] text-[#000000] shadow-xs'
                : isCompleted
                  ? pastItem?.correct
                    ? isLight
                      ? 'bg-[#EDFF8C]/75 text-[#000000]'
                      : 'bg-[#12786C]/40 text-[#EDFF8C]'
                    : isLight
                      ? 'bg-[#F1F1F1] text-[#000000]/45'
                      : 'bg-white/10 text-white/40'
                  : isLight
                    ? 'bg-[#F1F1F1]/80 text-[#000000]/40'
                    : 'bg-white/5 text-white/35'
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                isCurrent
                  ? 'bg-[#000000] text-[#FFFFFF]'
                  : isCompleted
                    ? pastItem?.correct
                      ? 'bg-[#12786C] text-[#FFFFFF]'
                      : 'bg-[#000000]/75 text-[#FFFFFF]'
                    : isLight
                      ? 'bg-[#FFFFFF]/75 text-[#000000]/45'
                      : 'bg-white/10 text-white/40'
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
  const { preferences, updatePreferences, reducedMotion } = useStudioPreferences();
  const themeMode = preferences.theme;
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

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();

  const isLight = themeMode === 'light';

  const activeCharacter = useMemo(() => {
    return MASCOT_CHARACTERS.find((c) => c.id === characterId) || MASCOT_CHARACTERS[0];
  }, [characterId]);

  const activeChallengeModeDef = useMemo(() => {
    const modeId = session.status === 'playing' ? session.config.challengeMode || challengeMode : challengeMode;
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

  // Sync document.body.dataset.state & dynamic theme-color meta tag for seamless browser chrome
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeBgHex = isLight ? currentMood.bgLightHex : currentMood.bgDarkHex;
    document.body.dataset.state = session.status;
    document.body.dataset.theme = themeMode;
    document.documentElement.style.backgroundColor = activeBgHex;
    document.body.style.backgroundColor = activeBgHex;

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', activeBgHex);
  }, [session.status, isLight, themeMode, currentMood.bgLightHex, currentMood.bgDarkHex]);

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

  // Fetch real songs from Apple Music / iTunes API when filter changes
  const fetchLiveCrate = useCallback(
    async (mode: FilterMode, value: string, customQuery?: string): Promise<SongTrack[]> => {
      if (mode === 'account' && connectedProfile && connectedProfile.customTracks.length >= 4) {
        setSongPool(connectedProfile.customTracks);
        return connectedProfile.customTracks;
      }

      let term = 'top hits pop dance r&b';
      if (customQuery && customQuery.trim().length > 1) {
        term = customQuery.trim();
      } else if (mode === 'genre') {
        const preset = GENRE_PRESETS.find((g) => g.id === value);
        term = preset ? preset.query : `${value} hits`;
      } else if (mode === 'artist') {
        term = value === 'All' ? 'Daft Punk The Weeknd SZA' : value;
      } else if (mode === 'year') {
        term = `${value} music hits`;
      }

      setIsLoadingSongs(true);
      try {
        const res = await fetch(`/api/songs?term=${encodeURIComponent(term)}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tracks) && data.tracks.length >= 4) {
            setSongPool(data.tracks);
            return data.tracks;
          }
        }
      } catch {
        // Fallback to curated songs seamlessly
      } finally {
        setIsLoadingSongs(false);
      }
      return CURATED_REAL_SONGS;
    },
    [connectedProfile]
  );

  // Initial live song fetch on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLiveCrate('genre', 'All');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLiveCrate]);

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
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      audioEngine.playUiTick(1.3, 'medium');

      let activePool = overridePool || songPool;
      if (customSearchTerm.trim().length > 1 && !overridePool) {
        activePool = await fetchLiveCrate(filterMode, filterValue, customSearchTerm);
      }

      const selectedPlaylist = activePool.slice(0, Math.max(1, songCount));
      const firstSong = selectedPlaylist[0] || CURATED_REAL_SONGS[0];

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
          songCount,
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
    },
    [
      songPool,
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
      if (isSettingsOpen || isAccountModalOpen || isPassModalOpen) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable="true"], dialog')) return;
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
          setSession(previous => ({ ...previous, status: 'playing' }));
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
  }, [session.status, isSettingsOpen, isAccountModalOpen, isPassModalOpen, startNewGame, toggleThemeMode, updatePreferences, discoverGroove]);

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
  const activeBgHex = isLight ? currentMood.bgLightHex : currentMood.bgDarkHex;

  // Circular Icon Button style matching IMG_5846 & IMG_5847
  const circleBtnClass = isLight
    ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000] hover:bg-[#F1F1F1]'
    : 'border-white/15 bg-[#12161D] text-[#FFFFFF] hover:bg-white/10';

  // Primary Action Button style matching IMG_5845 & IMG_5847 (#000000 in Light Mode, #EDFF8C in Dark Mode)
  const primaryBtnClasses = isLight
    ? 'bg-[#000000] text-[#FFFFFF] hover:bg-[#1A1A1A] shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
    : 'bg-[#EDFF8C] text-[#000000] hover:bg-[#F4FFAD] shadow-[0_10px_24px_rgba(237,255,140,0.2)]';

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'} transition={{ type: 'spring', stiffness: 360, damping: 32 }}>
    <main
      data-theme={themeMode}
      data-state={session.status}
      data-dock-collapsed={isDockCollapsed}
      data-reduced-motion={reducedMotion}
      className={`wavelet-app relative h-dvh w-full max-w-full overflow-x-hidden overflow-y-auto select-none transition-colors duration-500 ${
        isLight ? 'text-[#000000]' : 'text-[#FFFFFF]'
      }`}
      style={{
        background: isLight
          ? `radial-gradient(circle at 22% 12%, #EDFF8C45 0%, transparent 45%), radial-gradient(circle at 82% 18%, ${currentMood.primaryHex}18 0%, ${activeBgHex} 72%)`
          : `radial-gradient(circle at 50% 18%, ${currentMood.primaryHex}22 0%, ${activeBgHex} 74%)`,
      }}
    >
      {/* Full-Viewport 3D Isometric Three.js Vinyl & Smooth Mascot Stage */}
      <IsometricVinylStage
        mood={currentMood}
        mascotState={mascotState}
        characterId={characterId}
        themeMode={themeMode}
        isPlayingSnippet={isPlayingSnippet}
        gameState={session.status}
        reducedMotion={reducedMotion}
        onMascotInteract={() => {
          companionTaps.current += 1;
          if (companionTaps.current % 3 === 0) discoverGroove(`${activeCharacter.name} knows a secret dance.`);
          setMascotState('hyped');
          setMascotSpeech(
            `${progression.callsign} · Overall ${progression.overallScore} pts · ${overallWlStats.winRatePercent}% Win Rate`
          );
          setTimeout(() => setMascotState(isPlayingSnippet ? 'listening' : 'idle'), 1800);
        }}
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
            className="pointer-events-none fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#000000] px-4 py-2 text-xs font-bold text-[#EDFF8C] shadow-xl"
          >
            <Trophy weight="fill" className="h-4 w-4 shrink-0" />
            <span role="status">{lastXpToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline PWA Connectivity Toast */}
      {!isOnline && (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#000000] px-4 py-1.5 text-xs font-bold text-[#EDFF8C] shadow-lg">
          Offline Mode · Playing Cached Curated Crate
        </div>
      )}

      {/* Responsive Mobile-First Shell Container */}
      <div
        className={`wavelet-shell pointer-events-none relative z-20 mx-auto flex min-h-full w-full flex-col justify-between transition-all duration-300 ${
          isDesktopViewport && mobileFrameLocked
            ? isLight
              ? 'max-w-[430px] border-x border-[#D1D1D1]/80 shadow-[0_0_60px_rgba(0,0,0,0.06)]'
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

            {/* Bottom Minimal Card Dock (Distinct Game Modes + Difficulty Scaling + Crate Selector) */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Game Configuration Dock"
              data-testid="game-configuration"
              className={`studio-game-dock pointer-events-auto rounded-[28px] border p-3.5 transition-all duration-300 space-y-2.5 ${
                isLight
                  ? 'border-[#D1D1D1] bg-[#FFFFFF]/96 text-[#000000] shadow-[0_16px_40px_rgba(0,0,0,0.06)]'
                  : 'border-white/12 bg-[#12161D]/96 text-[#FFFFFF] shadow-2xl'
              }`}
            >
              {/* Row 0: 4 Distinct Game Modes (Track, Artist, Genre, Year) + Difficulty Scaling */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold tracking-tight ${
                      isLight ? 'text-[#000000]/70' : 'text-white/70'
                    }`}
                  >
                    Find your challenge
                  </span>

                  {/* Difficulty Tier Selector Pill (Chill 1.0x / Club 1.35x / Master 1.85x) */}
                  <div
                    className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${
                      isLight ? 'border-[#D1D1D1] bg-[#F1F1F1]' : 'border-white/15 bg-black/40'
                    }`}
                    role="group"
                    aria-label="Difficulty Scaling"
                  >
                    {DIFFICULTY_TIERS.map((tier) => {
                      const active = difficulty === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleSelectDifficulty(tier.id)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                            active
                              ? 'bg-[#12786C] text-[#FFFFFF]'
                              : isLight
                                ? 'text-[#000000]/65 hover:text-[#000000]'
                                : 'text-white/65 hover:text-white'
                          }`}
                        >
                          {tier.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Guessing Game Modes">
                  {GAME_CHALLENGE_MODES.map((m) => {
                    const isSelected = challengeMode === m.id;
                    return (
                      <motion.button
                        key={m.id}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        aria-pressed={isSelected}
                        aria-label={`Guess the ${m.id}`}
                        data-testid={`mode-${m.id}-btn`}
                        onClick={() => handleSelectChallengeMode(m.id)}
                        className={`flex flex-col justify-between rounded-[18px] border p-2 text-left transition-all min-w-0 ${
                          isSelected
                            ? isLight
                              ? 'border-[#000000] bg-[#EDFF8C] text-[#000000] shadow-xs'
                              : 'border-[#EDFF8C] bg-[#EDFF8C] text-[#000000]'
                            : isLight
                              ? 'border-[#D1D1D1] bg-[#F1F1F1]/75 text-[#000000] hover:bg-[#F1F1F1]'
                              : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-[13px] font-extrabold tracking-tight">{m.id.charAt(0).toUpperCase() + m.id.slice(1)}</span>
                        <span className="mt-1 text-[10px] opacity-65">{{ track: 'Name it', artist: 'Who sings?', genre: 'The vibe', year: 'Go back' }[m.id]}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Row 1: Horizontal Crate Selector Tabs + Progressive Disclosure "Tune Rules" Pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar flex-1 min-w-0">
                  {QUICK_VIBE_CRATES.map((crate) => {
                    const isSelected =
                      filterMode === crate.mode &&
                      filterValue === crate.value &&
                      !customSearchTerm;
                    return (
                      <motion.button
                        key={crate.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectFilterValue(crate.mode, crate.value)}
                        className={`min-h-[34px] shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                          isSelected
                            ? isLight
                              ? 'bg-[#000000] text-[#FFFFFF]'
                              : 'bg-[#EDFF8C] text-[#000000]'
                            : isLight
                              ? 'bg-[#F1F1F1] text-[#000000]/75 hover:bg-[#E5E5E5]'
                              : 'bg-white/8 text-white/80 hover:bg-white/15'
                        }`}
                      >
                        {crate.label}
                      </motion.button>
                    );
                  })}

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      audioEngine.playUiTick(1.1, 'light');
                      if (!connectedProfile) {
                        setIsAccountModalOpen(true);
                      } else {
                        handleSelectFilterValue('account', 'Synced');
                      }
                    }}
                    className={`min-h-[34px] shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                      filterMode === 'account'
                        ? 'bg-[#12786C] text-[#FFFFFF]'
                        : isLight
                          ? 'bg-[#F1F1F1] text-[#000000]/75 hover:bg-[#E5E5E5]'
                          : 'bg-white/8 text-white/80 hover:bg-white/15'
                    }`}
                  >
                    My Crate
                  </motion.button>
                </div>

                {/* Tune Rules Button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  data-testid="tune-rules-btn"
                  onClick={() => {
                    audioEngine.playTabSwitch(!isRulesDrawerOpen);
                    setIsRulesDrawerOpen((prev) => !prev);
                  }}
                  aria-expanded={isRulesDrawerOpen}
                  className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                    isRulesDrawerOpen
                      ? 'border-[#12786C] bg-[#12786C] text-[#FFFFFF]'
                      : isLight
                        ? 'border-[#D1D1D1] bg-[#F1F1F1] text-[#000000] hover:bg-[#E5E5E5]'
                        : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <SlidersHorizontal weight="bold" className="h-3.5 w-3.5" />
                  <span>{isRulesDrawerOpen ? 'Done' : `${snippetDuration}s · ${songCount}`}</span>
                </motion.button>
              </div>

              {/* Progressive Disclosure Studio Customizer Drawer */}
              <AnimatePresence>
                {isRulesDrawerOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="studio-rules-scroll overflow-hidden"
                  >
                    <div
                      className={`rounded-[22px] border p-3 space-y-3 ${
                        isLight
                          ? 'border-[#D1D1D1] bg-[#F1F1F1]/75'
                          : 'border-white/10 bg-black/40'
                      }`}
                    >
                      {/* Snippet Duration Selector (1s, 3s, 5s, 10s, 15s, 30s) */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span
                            className={`font-semibold ${
                              isLight ? 'text-[#000000]/65' : 'text-white/65'
                            }`}
                          >
                            Snippet Play Time
                          </span>
                          <span className="font-mono font-bold tabular-nums text-[#12786C]">
                            Up to +{potentialPoints} pts
                          </span>
                        </div>
                        <div
                          className={`grid grid-cols-6 gap-1 rounded-full p-1 ${
                            isLight ? 'bg-[#FFFFFF] border border-[#D1D1D1]' : 'bg-black/50'
                          }`}
                        >
                          {SNIPPET_OPTIONS.map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                audioEngine.playUiTick(1 + (30 - sec) * 0.01, 'selection');
                                setSnippetDuration(sec);
                              }}
                              className={`min-h-[32px] rounded-full text-xs font-mono font-bold tabular-nums transition-colors ${
                                snippetDuration === sec
                                  ? isLight
                                    ? 'bg-[#000000] text-[#FFFFFF]'
                                    : 'bg-[#EDFF8C] text-[#000000]'
                                  : isLight
                                    ? 'text-[#000000]/70 hover:text-[#000000]'
                                    : 'text-white/70 hover:text-white'
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Song Count & Judge Mode */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span
                            className={`block text-[11px] font-semibold mb-1 ${
                              isLight ? 'text-[#000000]/65' : 'text-white/65'
                            }`}
                          >
                            Songs (Rounds)
                          </span>
                          <div
                            className={`grid grid-cols-3 gap-1 rounded-full p-1 ${
                              isLight ? 'bg-[#FFFFFF] border border-[#D1D1D1]' : 'bg-black/50'
                            }`}
                          >
                            {SONG_COUNT_OPTIONS.map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiTick(1.05, 'selection');
                                  setSongCount(count);
                                }}
                                className={`min-h-[32px] rounded-full text-xs font-mono font-bold tabular-nums transition-colors ${
                                  songCount === count
                                    ? 'bg-[#12786C] text-[#FFFFFF]'
                                    : isLight
                                      ? 'text-[#000000]/70 hover:text-[#000000]'
                                      : 'text-white/70 hover:text-white'
                                }`}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span
                            className={`block text-[11px] font-semibold mb-1 ${
                              isLight ? 'text-[#000000]/65' : 'text-white/65'
                            }`}
                          >
                            Answer Format
                          </span>
                          <div
                            className={`grid grid-cols-2 gap-1 rounded-full p-1 ${
                              isLight ? 'bg-[#FFFFFF] border border-[#D1D1D1]' : 'bg-black/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiTick(1.05, 'selection');
                                setPlayMode('quiz-4choice');
                              }}
                              className={`min-h-[32px] rounded-full text-[11px] font-bold transition-colors whitespace-nowrap px-2 ${
                                playMode === 'quiz-4choice'
                                  ? isLight
                                    ? 'bg-[#000000] text-[#FFFFFF]'
                                    : 'bg-[#EDFF8C] text-[#000000]'
                                  : isLight
                                    ? 'text-[#000000]/70'
                                    : 'text-white/70'
                              }`}
                            >
                              4-Choice
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiTick(1.05, 'selection');
                                setPlayMode('party-30s');
                              }}
                              className={`min-h-[32px] rounded-full text-[11px] font-bold transition-colors whitespace-nowrap px-2 ${
                                playMode === 'party-30s'
                                  ? isLight
                                    ? 'bg-[#000000] text-[#FFFFFF]'
                                    : 'bg-[#EDFF8C] text-[#000000]'
                                  : isLight
                                    ? 'text-[#000000]/70'
                                    : 'text-white/70'
                              }`}
                            >
                              30s Judge
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Custom Artist / Era / Genre Search Input */}
                      <div className="relative flex items-center">
                        <MagnifyingGlass
                          weight="bold"
                          className={`pointer-events-none absolute left-3.5 h-4 w-4 ${
                            isLight ? 'text-[#000000]/45' : 'text-white/45'
                          }`}
                        />
                        <input
                          type="text"
                          value={customSearchTerm}
                          onChange={(e) => setCustomSearchTerm(e.target.value)}
                          placeholder="Search artist, genre, or year (e.g. Daft Punk, SZA, 1998)..."
                          aria-label="Custom artist, genre, or year search"
                          className={`w-full rounded-full border pl-9 pr-3.5 py-2 text-xs focus:outline-none ${
                            isLight
                              ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000] placeholder-[#000000]/40 focus:border-[#12786C]'
                              : 'border-white/15 bg-black/50 text-white placeholder-white/40 focus:border-[#12786C]'
                          }`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary CTA Button (with data-start="true") */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                data-start="true"
                onClick={() => startNewGame()}
                className={`flex min-h-[50px] w-full items-center justify-between rounded-full px-5 py-2.5 text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${primaryBtnClasses}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Play weight="fill" className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Let’s play
                  </span>
                </div>
                <span
                  className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums ${
                    isLight
                      ? 'bg-[#EDFF8C] text-[#000000]'
                      : 'bg-[#000000] text-[#EDFF8C]'
                  }`}
                >
                  {songCount} songs · {snippetDuration}s
                </span>
              </motion.button>
            </motion.section>
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
                    ? 'border-[#D1D1D1] bg-[#FFFFFF]/95 text-[#000000]'
                    : 'border-white/12 bg-[#12161D]/95 text-[#FFFFFF]'
                }`}
              >
                {/* Score, Streak, Mode & Round Readouts (Tabular Numerals) */}
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div
                      className={`text-[10px] font-semibold ${
                        isLight ? 'text-[#000000]/55' : 'text-white/55'
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
                        isLight ? 'text-[#000000]/55' : 'text-white/55'
                      }`}
                    >
                      <span>Streak</span>
                      {isFeverActive && (
                        <Fire weight="fill" className="h-3.5 w-3.5 text-[#E07A47]" />
                      )}
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#12786C]">
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
                        isLight ? 'text-[#000000]/55' : 'text-white/55'
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
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-[#EDFF8C] px-2.5 text-xs font-bold text-[#000000]"
                  >
                    <Coins weight="fill" className="h-3.5 w-3.5 text-[#12786C]" />
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
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  audioEngine.playUiTick(1.05, 'light');
                  setIsDockCollapsed((prev) => !prev);
                }}
                className={`mb-1.5 inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-bold transition-colors ${
                  isLight
                    ? 'border-[#D1D1D1] bg-[#FFFFFF]/92 text-[#000000]/75 hover:text-[#000000]'
                    : 'border-white/15 bg-[#12161D]/90 text-white/80 hover:text-white'
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

              <AnimatePresence>
                {!isDockCollapsed && (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    aria-label="Active Song Quiz Controls"
                    className={`w-full overflow-hidden rounded-[28px] border p-3.5 space-y-2.5 transition-colors ${
                      isLight
                        ? 'border-[#D1D1D1] bg-[#FFFFFF]/96 text-[#000000] shadow-[0_16px_40px_rgba(0,0,0,0.08)]'
                        : 'border-white/12 bg-[#12161D]/96 text-[#FFFFFF] shadow-2xl'
                    }`}
                  >
                    {/* Waveform & Cover Card (IMG_5813 + IMG_5847!) */}
                    <AppleMusicCoverCard
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
                                ? 'bg-[#F1F1F1] text-[#000000] hover:bg-[#E5E5E5]'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Play weight="fill" className="h-3.5 w-3.5 shrink-0 text-[#12786C]" />
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
                                ? 'opacity-45 cursor-not-allowed bg-[#F1F1F1] text-[#000000]'
                                : 'bg-[#EDFF8C] text-[#000000]'
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
                                ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]/80 hover:bg-[#F1F1F1]'
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
                            isLight ? 'bg-[#F1F1F1]' : 'bg-white/8'
                          }`}
                        >
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={Boolean(artistHintText)}
                            onClick={handleUseArtistHint}
                            className={`flex min-h-[32px] min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
                              artistHintText
                                ? 'bg-[#12786C] text-[#FFFFFF]'
                                : isLight
                                  ? 'bg-[#FFFFFF] text-[#000000] shadow-2xs hover:bg-[#EDFF8C]'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Lightbulb weight="fill" className="h-3.5 w-3.5 shrink-0 text-[#12786C]" />
                            <span className="truncate">{artistHintText ? 'Clue On' : 'Clue'}</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            disabled={eliminatedOptionIds.length > 0}
                            onClick={handleUseFiftyFifty}
                            className={`flex min-h-[32px] min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
                              eliminatedOptionIds.length > 0
                                ? 'bg-[#12786C] text-[#FFFFFF]'
                                : isLight
                                  ? 'bg-[#FFFFFF] text-[#000000] shadow-2xs hover:bg-[#EDFF8C]'
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
                                ? 'bg-[#EDFF8C] text-[#000000]'
                                : isLight
                                  ? 'bg-[#FFFFFF] text-[#000000] shadow-2xs hover:bg-[#EDFF8C]'
                                  : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            <Lightning weight="fill" className="h-3.5 w-3.5 shrink-0 text-[#12786C]" />
                            <span className="truncate">{doubleBoostActive ? '2x On' : '2x Boost'}</span>
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Active Mode Prompt Header */}
                    {!roundFeedback?.answered && (
                      <div className="flex items-center justify-between px-1 text-[11px]">
                        <span className="font-bold text-[#12786C] truncate">
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
                              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-[#000000] px-4 py-2 text-xs font-bold text-[#EDFF8C] shadow-md whitespace-nowrap"
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
                                  ? 'border-[#D1D1D1] bg-[#F1F1F1] text-[#000000]'
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

                    {/* MODE B: 4-CHOICE INTERACTIVE QUIZ (Adapts to Track, Artist, Genre, or Year!) */}
                    {playMode === 'quiz-4choice' && !roundFeedback?.answered && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {challengeOptions.map((option) => {
                          const isEliminated = eliminatedOptionIds.includes(option.id);
                          return (
                            <motion.button
                              key={option.id}
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              disabled={isEliminated}
                              onClick={() => handleJudgeAnswer(option.isCorrect, option.id)}
                              className={`flex min-h-[48px] min-w-0 flex-col justify-center rounded-[18px] border px-3 py-1.5 text-left transition-colors ${
                                isEliminated
                                  ? 'opacity-30 line-through cursor-not-allowed border-[#D1D1D1]'
                                  : isLight
                                    ? 'border-[#D1D1D1] bg-[#F1F1F1]/70 hover:bg-[#EDFF8C] hover:border-[#000000]/20'
                                    : 'border-white/12 bg-white/5 hover:bg-[#EDFF8C] hover:text-[#000000]'
                              }`}
                            >
                              <span className="truncate text-xs font-bold">
                                {option.primaryText}
                              </span>
                              <span className="truncate text-[10px] opacity-65">
                                {option.secondaryText}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Post-Guess Outcome Banner & Next Song Button */}
                    {roundFeedback?.answered && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between gap-2.5 rounded-[20px] border p-2.5 ${
                          isLight
                            ? 'border-[#D1D1D1] bg-[#F1F1F1]'
                            : 'border-white/15 bg-black/50'
                        }`}
                      >
                        <div className="min-w-0 pl-1">
                          <div className="text-xs font-bold text-[#12786C]">
                            {roundFeedback.correct
                              ? `Correct · +${roundFeedback.points} pts · +${roundFeedback.xpGained} XP`
                              : `Missed ${activeChallengeModeDef.shortLabel} · +${roundFeedback.xpGained} XP`}
                          </div>
                          <div className="truncate text-[11px] opacity-75">
                            {currentSong.title} — {currentSong.artist} ({currentSong.releaseYear} ·{' '}
                            {currentSong.genre})
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={handleNextRound}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 ${primaryBtnClasses}`}
                        >
                          <span>
                            {session.currentIndex + 1 >= session.playlist.length
                              ? 'Finish Set'
                              : 'Next Song'}
                          </span>
                          <ArrowRight weight="bold" className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
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
            className={`pointer-events-auto my-auto mx-auto w-full max-w-sm rounded-[28px] border p-6 text-center shadow-2xl space-y-4 ${
              isLight
                ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]'
                : 'border-white/15 bg-[#12161D] text-[#FFFFFF]'
            }`}
          >
            <h2 id="pause-modal-title" className="text-2xl font-bold tracking-tight">
              Session Paused
            </h2>
            <p className={`text-xs ${isLight ? 'text-[#000000]/60' : 'text-white/60'}`}>
              {activeChallengeModeDef.title} ({activeDifficultyDef.shortLabel}) · Round{' '}
              {session.currentIndex + 1} of {session.playlist.length}
            </p>

            <div
              className={`grid grid-cols-2 gap-3 rounded-[22px] p-3.5 ${
                isLight ? 'bg-[#F1F1F1]' : 'bg-black/40'
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
                <div className="text-2xl font-bold font-mono tabular-nums text-[#12786C]">
                  {session.streak}x
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  audioEngine.playUiTick(1.1, 'medium');
                  setSession((prev) => ({ ...prev, status: 'playing' }));
                }}
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
                    ? 'bg-[#F1F1F1] text-[#000000] hover:bg-[#E5E5E5]'
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
            className={`pointer-events-auto my-auto mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-[28px] border p-5 shadow-2xl ${
              isLight
                ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]'
                : 'border-white/15 bg-[#12161D] text-[#FFFFFF]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#12786C]">
                  {activeChallengeModeDef.title} · Level {tierInfo.level} {tierInfo.name}
                </div>
                <h2 id="gameover-modal-title" className="text-2xl font-bold tracking-tight">
                  Session Summary
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDFF8C] font-mono text-xs font-bold text-[#000000]">
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
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
              {session.history.map((item, idx) => {
                const links = buildStreamingLinks(item.song);
                return (
                  <div
                    key={`${item.song.id}-${idx}`}
                    className={`flex items-center justify-between gap-2.5 rounded-[20px] border p-3 ${
                      item.correct && isLight
                        ? 'border-[#000000]/10 bg-[#EDFF8C]/55'
                        : isLight
                          ? 'border-[#D1D1D1] bg-[#F1F1F1]/70'
                          : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#12786C]">
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
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#000000] text-[#1DB954]"
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
                            ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#FA243C]'
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

            {/* Play Again & Change Mode/Crate Actions */}
            <div
              className={`mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t ${
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
                    ? 'bg-[#F1F1F1] text-[#000000] hover:bg-[#E5E5E5]'
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
                  <span className="text-xs font-semibold text-[#12786C]">
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
                  isLight ? 'border-[#D1D1D1] bg-[#F1F1F1]' : 'border-white/12 bg-black/40'
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
                          ? 'bg-[#000000] text-[#FFFFFF]'
                          : 'bg-[#EDFF8C] text-[#000000]'
                        : isLight
                          ? 'text-[#000000]/65 hover:text-[#000000]'
                          : 'text-white/65 hover:text-white'
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
                        ? 'border-[#D1D1D1] bg-[#F1F1F1]/65'
                        : 'border-white/12 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={activeCharacter.avatarImg}
                          alt={activeCharacter.name}
                          className="h-12 w-12 rounded-2xl object-cover border border-[#12786C] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-base font-extrabold tracking-tight">
                            {progression.callsign}
                          </div>
                          <div className="truncate text-xs opacity-65">
                            {progression.tagline}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] font-bold text-[#12786C]">
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
                      <div className="space-y-2 pt-2 border-t border-[#D1D1D1]/60 dark:border-white/10">
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
                                ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]'
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
                                ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]'
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
                              ? 'border-[#D1D1D1] bg-[#FFFFFF] text-[#000000]'
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
                  <div className="grid grid-cols-2 gap-2.5 rounded-[22px] bg-[#EDFF8C] p-3.5 text-[#000000]">
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
                      <div className="font-mono text-2xl font-extrabold tabular-nums text-[#12786C]">
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
                        isLight ? 'border-[#D1D1D1] bg-[#F1F1F1]/60' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-60">Win / Loss</div>
                      <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums">
                        {progression.totalWins ?? progression.totalCorrect}W -{' '}
                        {progression.totalLosses ?? 0}L
                      </div>
                      <div className="font-mono text-[10px] font-bold text-[#12786C]">
                        {overallWlStats.ratioFormatted}
                      </div>
                    </div>

                    <div
                      className={`rounded-[18px] border p-3 ${
                        isLight ? 'border-[#D1D1D1] bg-[#F1F1F1]/60' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-60">Win Rate</div>
                      <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-[#12786C]">
                        {overallWlStats.winRatePercent}%
                      </div>
                      <div className="font-mono text-[10px] opacity-65">
                        {overallWlStats.totalRounds} Rounds
                      </div>
                    </div>

                    <div
                      className={`rounded-[18px] border p-3 ${
                        isLight ? 'border-[#D1D1D1] bg-[#F1F1F1]/60' : 'border-white/10 bg-white/5'
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
                    <ChartBar weight="bold" className="h-4 w-4 text-[#12786C]" />
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
                              ? 'border-[#D1D1D1] bg-[#F1F1F1]/65'
                              : 'border-white/12 bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-[#12786C]">
                                {m.badgeCode}
                              </span>
                              <h3 className="text-sm font-extrabold tracking-tight">
                                {m.title} ({m.shortLabel})
                              </h3>
                            </div>
                            <span className="rounded-full bg-[#EDFF8C] px-2.5 py-0.5 font-mono text-xs font-bold text-[#000000] tabular-nums">
                              {wl.winRatePercent}% Win
                            </span>
                          </div>

                          <div className="mt-2.5 grid grid-cols-4 gap-2 pt-2 border-t border-[#D1D1D1]/60 dark:border-white/10 font-mono">
                            <div>
                              <div className="text-[10px] opacity-60">W / L</div>
                              <div className="text-xs font-bold tabular-nums">
                                {stats.wins}W-{stats.losses}L
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] opacity-60">Ratio</div>
                              <div className="text-xs font-bold tabular-nums text-[#12786C]">
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
                            ? 'border-[#D1D1D1] bg-[#F1F1F1]/65'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle
                              weight={q.completed ? 'fill' : 'regular'}
                              className="h-4 w-4 text-[#12786C] shrink-0"
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
                              ? 'bg-[#12786C] text-[#FFFFFF]'
                              : 'bg-[#000000] text-[#EDFF8C]'
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
                                  ? 'border-[#12786C]/40 bg-[#12786C]/10'
                                  : 'border-[#12786C]/40 bg-[#12786C]/15'
                                : isLight
                                  ? 'border-[#D1D1D1] bg-[#F1F1F1]/40 opacity-55'
                                  : 'border-white/10 bg-white/[0.02] opacity-50'
                            }`}
                          >
                            {unlocked ? (
                              <Medal
                                weight="fill"
                                className="h-4 w-4 text-[#12786C] shrink-0 mt-0.5"
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
        onPreviewSound={() => audioEngine.playDiscovery()} />

      {/* Spotify & Apple Music Account Connect Modal */}
      <MusicAccountModal
        isOpen={isAccountModalOpen}
        themeMode={themeMode}
        reducedMotion={reducedMotion}
        onClose={() => setIsAccountModalOpen(false)}
        connectedProfile={connectedProfile}
        onConnectSuccess={(profile) => {
          setConnectedProfile(profile);
          setFilterMode('account');
          setFilterValue(profile.displayName);
          if (profile.customTracks.length >= 4) {
            setSongPool(profile.customTracks);
          }
        }}
        onDisconnect={() => {
          setConnectedProfile(null);
          setFilterMode('genre');
          setFilterValue('All');
        }}
      />
    </main>
    </MotionConfig>
  );
};
