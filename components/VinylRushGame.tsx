'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  DeviceMobile,
  Desktop,
  ArrowsClockwise,
  Timer,
  DownloadSimple,
  Eye,
  ArrowRight,
  MagnifyingGlass,
  Sun,
  Moon,
  SlidersHorizontal,
  FilmStrip,
  VinylRecord,
  Trophy,
  Fire,
  Lightning,
  Lightbulb,
  Scissors,
  Medal,
  Coins,
  Sparkle,
  CheckCircle,
  LockSimple,
} from '@phosphor-icons/react';
import {
  type SnippetDuration,
  type FilterMode,
  type PlayMode,
  type ThemeMode,
  type MascotCharacterId,
  type SongTrack,
  type GameSessionState,
  type PlayerProgressionState,
  MASCOT_CHARACTERS,
  ALL_BADGES,
  deriveSongMood,
  calculateRoundPoints,
  buildQuizOptions,
  advanceRoundState,
  buildStreamingLinks,
  calculateVinylTier,
  createInitialProgression,
  updateProgressionAfterRound,
} from '@/lib/game-rules';
import {
  CURATED_REAL_SONGS,
  GENRE_PRESETS,
} from '@/lib/music-catalog';
import { audioEngine } from '@/lib/audio-engine';
import { IsometricVinylStage, type MascotMoodState } from './IsometricVinylStage';
import { AppleMusicCoverCard } from './AppleMusicCoverCard';
import { MusicAccountModal, type ConnectedMusicProfile } from './MusicAccountModal';
import { usePWAInstall } from '@/hooks/use-pwa-install';

const SNIPPET_OPTIONS: SnippetDuration[] = [1, 3, 5, 10, 15, 30];
const SONG_COUNT_OPTIONS = [5, 10, 15];

const QUICK_VIBE_CRATES: Array<{
  id: string;
  label: string;
  mode: FilterMode;
  value: string;
}> = [
  { id: 'all', label: 'All Hits', mode: 'genre', value: 'All' },
  { id: 'pop', label: 'Pop Glow', mode: 'genre', value: 'Pop' },
  { id: 'rnb', label: 'Velvet R&B', mode: 'genre', value: 'R&B/Soul' },
  { id: 'hiphop', label: 'Hip-Hop', mode: 'genre', value: 'Hip-Hop/Rap' },
  { id: 'afro', label: 'Afrobeats', mode: 'genre', value: 'Afrobeats' },
  { id: 'electro', label: 'Electronic', mode: 'genre', value: 'Electronic' },
  { id: '2020s', label: '2020s', mode: 'year', value: '2020s' },
  { id: '2000s', label: '2000s', mode: 'year', value: '2000s' },
  { id: '1990s', label: '90s Gold', mode: 'year', value: '1990s' },
];

export const VinylRushGame: React.FC = () => {
  // Light ("Matcha & Oat Studio") / Dark ("Infinite Skies Aero-Glass") Theme & Companion State
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [characterId, setCharacterId] = useState<MascotCharacterId>('pebble');
  const [showCameoVideo, setShowCameoVideo] = useState<boolean>(false);
  const [isRulesDrawerOpen, setIsRulesDrawerOpen] = useState<boolean>(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState<boolean>(false);

  // Gamification & Player Progression State
  const [progression, setProgression] = useState<PlayerProgressionState>(() =>
    createInitialProgression()
  );
  const [artistHintText, setArtistHintText] = useState<string | null>(null);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<string[]>([]);
  const [doubleBoostActive, setDoubleBoostActive] = useState<boolean>(false);
  const [lastXpToast, setLastXpToast] = useState<string | null>(null);

  // Game configuration state
  const [filterMode, setFilterMode] = useState<FilterMode>('genre');
  const [filterValue, setFilterValue] = useState<string>('All');
  const [customSearchTerm, setCustomSearchTerm] = useState<string>('');
  const [snippetDuration, setSnippetDuration] = useState<SnippetDuration>(5);
  const [songCount, setSongCount] = useState<number>(5);
  const [playMode, setPlayMode] = useState<PlayMode>('party-30s');

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
      playMode: 'party-30s',
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
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [mascotState, setMascotState] = useState<MascotMoodState>('idle');
  const [mascotSpeech, setMascotSpeech] = useState<string>(
    'Tap me to dance or spin the vinyl! Earn XP & climb the Vinyl Pass tiers!'
  );
  const [roundFeedback, setRoundFeedback] = useState<{
    answered: boolean;
    correct: boolean;
    points: number;
    xpGained: number;
    coinsGained: number;
    selectedSongId?: string;
  } | null>(null);

  // Desktop / Tablet Mobile-Only Disclaimer & Mobile Viewport Frame simulator
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);
  const [mobileFrameLocked, setMobileFrameLocked] = useState<boolean>(true);
  const [showDesktopBanner, setShowDesktopBanner] = useState<boolean>(true);

  // Modals & Saved Crate
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [connectedProfile, setConnectedProfile] = useState<ConnectedMusicProfile | null>(null);

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  const [showIOSInstallTip, setShowIOSInstallTip] = useState<boolean>(false);

  const isLight = themeMode === 'light';

  const activeCharacter = useMemo(() => {
    return MASCOT_CHARACTERS.find((c) => c.id === characterId) || MASCOT_CHARACTERS[0];
  }, [characterId]);

  const tierInfo = useMemo(() => {
    return calculateVinylTier(progression.xp);
  }, [progression.xp]);

  const currentSong = useMemo(() => {
    return session.playlist[session.currentIndex] || CURATED_REAL_SONGS[0];
  }, [session.playlist, session.currentIndex]);

  const currentMood = useMemo(() => {
    return deriveSongMood(currentSong);
  }, [currentSong]);

  const quizOptions = useMemo(() => {
    return buildQuizOptions(
      currentSong,
      songPool.length >= 4 ? songPool : CURATED_REAL_SONGS,
      session.currentIndex + 1
    );
  }, [currentSong, songPool, session.currentIndex]);

  // Load saved gamification progression on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('vinyl_rush_progression_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as PlayerProgressionState;
          if (typeof parsed.xp === 'number' && Array.isArray(parsed.quests)) {
            setProgression(parsed);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Persist progression whenever it updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('vinyl_rush_progression_v1', JSON.stringify(progression));
    } catch {
      // Ignore storage errors
    }
  }, [progression]);

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
  const triggerSnippetPlay = useCallback((song: SongTrack, durationSec: number) => {
    const mood = deriveSongMood(song);
    setSnippetProgress(0);
    setIsPlayingSnippet(true);
    setMascotState('listening');
    setMascotSpeech(
      `Dancing to a ${durationSec}s cut (${mood.bpm} BPM)... Feel that ${song.genre} groove!`
    );

    audioEngine.playSnippet({
      previewUrl: song.previewUrl,
      durationSec,
      mood,
      onEnded: () => {
        setIsPlayingSnippet(false);
        setSnippetProgress(0);
        setMascotState('idle');
        setMascotSpeech(
          `Needle lifted! Did you recognize that ${song.decade} ${song.genre} track?`
        );
      },
    });
  }, []);

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

  // Reset per-round power-ups
  const resetRoundPowerUps = useCallback(() => {
    setArtistHintText(null);
    setEliminatedOptionIds([]);
    setDoubleBoostActive(false);
  }, []);

  // Start a new game session
  const startNewGame = useCallback(
    async (overridePool?: SongTrack[]) => {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      audioEngine.playUiTick(1.3);

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

      triggerSnippetPlay(firstSong, snippetDuration);
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

  // Gamified Power-Up 1: Artist Clue
  const handleUseArtistHint = useCallback(() => {
    if (artistHintText || roundFeedback?.answered) return;
    audioEngine.playUiTick(1.35);
    const maskedArtist = currentSong.artist
      .split(' ')
      .map((w) => (w.length > 2 ? `${w[0]}${'·'.repeat(Math.min(4, w.length - 1))}` : w))
      .join(' ');
    const clue = `Clue: ${maskedArtist} (${currentSong.releaseYear})`;
    setArtistHintText(clue);
    setProgression((p) => ({ ...p, coins: Math.max(0, p.coins - 15) }));
    setMascotState('hyped');
    setMascotSpeech(`Psst! ${clue} — dropped on "${currentSong.album}"!`);
  }, [artistHintText, roundFeedback?.answered, currentSong]);

  // Gamified Power-Up 2: 50/50 Cut (switches to 4-Choice if needed and removes 2 wrong answers)
  const handleUseFiftyFifty = useCallback(() => {
    if (eliminatedOptionIds.length > 0 || roundFeedback?.answered) return;
    audioEngine.playUiTick(1.4);
    if (playMode !== 'quiz-4choice') {
      setPlayMode('quiz-4choice');
    }
    const wrongIds = quizOptions
      .filter((o) => o.id !== currentSong.id)
      .slice(0, 2)
      .map((o) => o.id);
    setEliminatedOptionIds(wrongIds);
    setProgression((p) => ({ ...p, coins: Math.max(0, p.coins - 25) }));
    setMascotState('hyped');
    setMascotSpeech(`50/50 Cut! Scratching 2 wrong records off the deck!`);
  }, [eliminatedOptionIds.length, roundFeedback?.answered, playMode, quizOptions, currentSong.id]);

  // Gamified Power-Up 3: 2x Double Drop Booster
  const handleUseDoubleBoost = useCallback(() => {
    if (doubleBoostActive || roundFeedback?.answered) return;
    audioEngine.playCorrectFanfare(1);
    setDoubleBoostActive(true);
    setProgression((p) => ({ ...p, coins: Math.max(0, p.coins - 30) }));
    setMascotState('celebrating');
    setMascotSpeech(`2x Double Drop Activated! Nail this track for double points & XP!`);
  }, [doubleBoostActive, roundFeedback?.answered]);

  // Handle player answering Right or Wrong
  const handleJudgeAnswer = useCallback(
    (correct: boolean, selectedSongId?: string) => {
      if (roundFeedback?.answered) return;
      audioEngine.stopSnippet(false);
      setIsPlayingSnippet(false);

      const remainingRatio = Math.max(0.15, 1 - snippetProgress);
      const { points, isFever } = calculateRoundPoints({
        correct,
        snippetSeconds: snippetDuration,
        streak: session.streak,
        timeRemainingRatio: remainingRatio,
        doubleBoost: doubleBoostActive,
      });

      const newStreak = correct ? session.streak + 1 : 0;
      const isLastSong = session.currentIndex + 1 >= session.playlist.length;
      const setPerfect =
        isLastSong && session.correctCount + (correct ? 1 : 0) === session.playlist.length;

      const { next: updatedProg, xpGained, coinsGained, newlyCompletedQuests } =
        updateProgressionAfterRound(progression, {
          correct,
          pointsEarned: points,
          snippetSeconds: snippetDuration,
          newStreak,
          isSetComplete: isLastSong,
          setPerfect,
        });

      setProgression(updatedProg);

      if (newlyCompletedQuests.length > 0) {
        setLastXpToast(
          `Quest Complete: ${newlyCompletedQuests[0].title} (+${newlyCompletedQuests[0].rewardXp} XP!)`
        );
        setTimeout(() => setLastXpToast(null), 3500);
      }

      if (correct) {
        audioEngine.playCorrectFanfare(newStreak);
        setMascotState('celebrating');
        setMascotSpeech(
          `${isFever ? 'FEVER COMBO! ' : ''}+${points} pts & +${xpGained} XP! "${
            currentSong.title
          }" by ${currentSong.artist}!`
        );
      } else {
        audioEngine.playWrongScratch();
        setMascotState('sympathy');
        setMascotSpeech(
          `Aww, close one! That was "${currentSong.title}" by ${currentSong.artist} (+${xpGained} XP).`
        );
      }

      setSession((prev) => ({ ...prev, isRevealed: true }));
      setRoundFeedback({
        answered: true,
        correct,
        points,
        xpGained,
        coinsGained,
        selectedSongId,
      });
    },
    [
      roundFeedback?.answered,
      snippetProgress,
      snippetDuration,
      session.streak,
      session.currentIndex,
      session.playlist.length,
      session.correctCount,
      doubleBoostActive,
      progression,
      currentSong.title,
      currentSong.artist,
    ]
  );

  // Advance to the next song round or finish session
  const handleNextRound = useCallback(() => {
    if (!roundFeedback) return;
    audioEngine.playUiTick(1.15);

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
        `Encore complete! ${nextState.score} pts · Level ${tierInfo.level} (${tierInfo.name})!`
      );
    } else {
      const nextSong = nextState.playlist[nextState.currentIndex];
      if (nextSong) {
        triggerSnippetPlay(nextSong, snippetDuration);
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
  ]);

  // Toggle Light / Dark Theme
  const toggleThemeMode = useCallback(() => {
    audioEngine.playUiTick(1.22);
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Cycle Mascot Character ('pebble' -> 'bobacat' -> 'sprout')
  const cycleMascotCharacter = useCallback(() => {
    audioEngine.playUiTick(1.32);
    setCharacterId((prev) => {
      const idx = MASCOT_CHARACTERS.findIndex((c) => c.id === prev);
      const next = MASCOT_CHARACTERS[(idx + 1) % MASCOT_CHARACTERS.length];
      setMascotState('hyped');
      setMascotSpeech(`Hi! I'm ${next.name} (${next.tagline})! Let's spin some tracks!`);
      setTimeout(() => setMascotState(isPlayingSnippet ? 'listening' : 'idle'), 1600);
      return next.id;
    });
  }, [isPlayingSnippet]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (session.status === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        if (!isAccountModalOpen && !isPassModalOpen) {
          e.preventDefault();
          void startNewGame();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (isPassModalOpen) {
          setIsPassModalOpen(false);
          return;
        }
        if (session.status === 'playing') {
          e.preventDefault();
          audioEngine.stopSnippet(false);
          setIsPlayingSnippet(false);
          setSession((prev) => ({ ...prev, status: 'paused' }));
        } else if (session.status === 'paused') {
          e.preventDefault();
          setSession((prev) => ({ ...prev, status: 'playing' }));
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMuted((prev) => {
          const next = !prev;
          audioEngine.setMuted(next);
          return next;
        });
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        toggleThemeMode();
      } else if (e.code === 'KeyH' && session.status === 'playing') {
        e.preventDefault();
        setIsDockCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.status, isAccountModalOpen, isPassModalOpen, startNewGame, toggleThemeMode]);

  // Select Filter Category Handler
  const handleSelectFilterValue = async (mode: FilterMode, val: string) => {
    audioEngine.playUiTick(1.08);
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
    }).points;
  }, [snippetDuration, session.streak, doubleBoostActive]);

  const emotionBadgeText = useMemo(() => {
    if (mascotState === 'listening') return 'Dancing';
    if (mascotState === 'celebrating') return 'Beaming!';
    if (mascotState === 'sympathy') return 'Pouting';
    if (mascotState === 'hyped') return 'Grooving!';
    return 'Smiling';
  }, [mascotState]);

  const isFeverActive = session.streak >= 2;
  const activeBgHex = isLight ? currentMood.bgLightHex : currentMood.bgDarkHex;
  const primaryBtnClasses = isLight
    ? 'border-b-4 border-[#2E6F4E] bg-[#468E68] hover:bg-[#529E76] text-white shadow-[0_8px_22px_rgba(70,142,104,0.32)]'
    : 'border-b-4 border-[#0369A1] bg-[#0EA5E9] hover:bg-[#38BDF8] text-slate-950 shadow-[0_8px_24px_rgba(14,165,233,0.35)]';

  return (
    <main
      className={`relative h-dvh w-screen overflow-hidden select-none transition-colors duration-500 ${
        isLight ? 'text-[#231C18]' : 'text-[#F0F9FF]'
      }`}
      style={{
        background: isLight
          ? `radial-gradient(circle at 50% 18%, ${currentMood.primaryHex}1C 0%, ${activeBgHex} 72%)`
          : `radial-gradient(circle at 50% 18%, ${currentMood.accentHex}24 0%, ${activeBgHex} 74%)`,
      }}
    >
      {/* Full-Viewport 3D Isometric Three.js Vinyl & Smooth Kawaii Toy Mascot World */}
      <IsometricVinylStage
        mood={currentMood}
        mascotState={mascotState}
        characterId={characterId}
        themeMode={themeMode}
        isPlayingSnippet={isPlayingSnippet}
        gameState={session.status}
        onMascotInteract={() => {
          setMascotState('hyped');
          setMascotSpeech(
            `Wheee! Complete Daily Groove Quests in your Vinyl Pass for bonus XP!`
          );
          setTimeout(() => setMascotState(isPlayingSnippet ? 'listening' : 'idle'), 1800);
        }}
        onTurntableInteract={() => {
          setMascotSpeech(
            `Wicka-wicka scratch! Tuned to ${currentMood.label} (${currentMood.bpm} BPM).`
          );
        }}
      />

      {/* Quest / XP Achievement Toast */}
      {lastXpToast && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-400/50 bg-[#1B1610]/95 px-4 py-2 text-xs font-extrabold text-amber-300 shadow-2xl">
          <Trophy weight="fill" className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{lastXpToast}</span>
        </div>
      )}

      {/* Offline PWA Connectivity Toast */}
      {!isOnline && (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-amber-400/50 bg-amber-950/95 px-4 py-1.5 text-xs font-bold text-amber-200 shadow-lg">
          Offline Mode Active — Playing Cached Curated Crate
        </div>
      )}

      {/* Desktop / Tablet Mobile-Only Disclaimer Bar */}
      {isDesktopViewport && showDesktopBanner && (
        <div
          role="region"
          aria-label="Mobile-only experience notice"
          className={`pointer-events-auto fixed top-2.5 left-1/2 z-40 flex w-[min(94vw,760px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-xs shadow-xl transition-colors ${
            isLight
              ? 'border-[#E2DBD0] bg-[#FCF9F2]/95 text-[#574C44]'
              : 'border-[#38BDF8]/22 bg-[#091826]/95 text-sky-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <DeviceMobile
              weight="duotone"
              className="h-5 w-5 shrink-0"
              style={{ color: currentMood.primaryHex }}
            />
            <p className="truncate">
              <strong className={isLight ? 'text-[#231C18]' : 'text-white'}>
                Mobile-First 3D Party Game:
              </strong>{' '}
              Crafted for handheld thumb gestures. Previewing in Mobile Frame mode.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiTick();
                setMobileFrameLocked((prev) => !prev);
              }}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-xl px-3 py-1 font-bold transition-colors whitespace-nowrap ${
                isLight
                  ? 'bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                  : 'bg-[#38BDF8]/15 text-sky-100 hover:bg-[#38BDF8]/25'
              }`}
            >
              <Desktop weight="bold" className="h-3.5 w-3.5" />
              <span>{mobileFrameLocked ? 'Expand Full Width' : 'Mobile Frame (430px)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiTick(0.9);
                setShowDesktopBanner(false);
              }}
              aria-label="Dismiss desktop disclaimer"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                isLight
                  ? 'bg-[#EDE6DA] text-[#6E6259] hover:bg-[#E2D9C8] hover:text-[#231C18]'
                  : 'bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white'
              }`}
            >
              <X weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Responsive Game Shell Container */}
      <div
        className={`pointer-events-none relative mx-auto flex h-full w-full flex-col justify-between transition-all duration-300 ${
          isDesktopViewport && mobileFrameLocked
            ? isLight
              ? 'max-w-[430px] border-x border-[#DFD8CA] shadow-[0_0_80px_rgba(35,28,24,0.1)]'
              : 'max-w-[430px] border-x border-[#38BDF8]/15 shadow-[0_0_90px_rgba(0,0,0,0.85)]'
            : 'max-w-5xl'
        } ${isDesktopViewport && showDesktopBanner ? 'pt-15' : 'pt-3'} pb-3 px-3`}
      >
        {/* =====================================================================
            STATE 1: TITLE SCREEN STAGE (CLEAN NINTENDO 3D CAPSULE UI)
           ===================================================================== */}
        {session.status === 'title' && (
          <>
            {/* Top Header Bar: Phosphor Brand Badge + Gamified Vinyl Pass Pill + Theme Switch + Sync + Mute */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1.5">
                {/* Brand Lockup using 100% Phosphor Icons */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border shadow-xs ${
                      isLight
                        ? 'border-[#DFD7C8] bg-[#FCF9F2]'
                        : 'border-[#38BDF8]/30 bg-[#091826]'
                    }`}
                  >
                    <VinylRecord
                      weight="duotone"
                      className="h-5 w-5"
                      style={{ color: currentMood.primaryHex }}
                    />
                  </div>
                  <div className="leading-tight whitespace-nowrap">
                    <div className="text-sm font-black tracking-tight">
                      VINYL RUSH
                    </div>
                    <div
                      className="font-mono text-[9.5px] font-extrabold tracking-wider uppercase"
                      style={{ color: currentMood.primaryHex }}
                    >
                      3D BEAT PARTY
                    </div>
                  </div>
                </div>

                {/* Top Right Tactile Utility Buttons: Vinyl Pass Gamification Pill, Theme Switch, Sync, Mute */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Gamification Tier & XP Pass Button */}
                  <button
                    type="button"
                    data-testid="vinyl-pass-btn"
                    onClick={() => {
                      audioEngine.playUiTick(1.18);
                      setIsPassModalOpen(true);
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1 rounded-2xl border px-2 py-1 text-xs font-extrabold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                      isLight
                        ? 'border-[#DFD7C8] bg-[#FCF9F2] text-[#231C18] shadow-xs hover:bg-[#F2ECE0]'
                        : 'border-[#38BDF8]/25 bg-[#091826]/90 text-sky-100 shadow-md hover:bg-[#0F2438]'
                    }`}
                  >
                    <Trophy weight="fill" className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-mono text-[11px] tabular-nums">Lv.{tierInfo.level}</span>
                    <span
                      className={`rounded-md px-1 py-0.5 font-mono text-[10px] tabular-nums ${
                        isLight
                          ? 'bg-[#4E946B]/15 text-[#2E6F4E]'
                          : 'bg-[#38BDF8]/20 text-[#38BDF8]'
                      }`}
                    >
                      {progression.xp}pt
                    </span>
                  </button>

                  {/* Light / Dark Mode Theme Switcher */}
                  <button
                    type="button"
                    data-testid="theme-toggle-btn"
                    onClick={toggleThemeMode}
                    aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    title={isLight ? 'Switch to Dark Mode [T]' : 'Switch to Light Mode [T]'}
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded-2xl border transition-all active:scale-95 shrink-0 ${
                      isLight
                        ? 'border-[#DFD7C8] bg-[#FCF9F2] text-amber-500 shadow-xs hover:bg-[#F2ECE0]'
                        : 'border-[#38BDF8]/25 bg-[#091826]/90 text-[#38BDF8] shadow-md hover:bg-[#0F2438]'
                    }`}
                  >
                    {isLight ? (
                      <Sun weight="fill" className="h-4 w-4" />
                    ) : (
                      <Moon weight="fill" className="h-4 w-4" />
                    )}
                  </button>

                  {/* Spotify & Apple Music Sync Button */}
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick(1.1);
                      setIsAccountModalOpen(true);
                    }}
                    aria-label="Sync Spotify or Apple Music"
                    className={`inline-flex min-h-[38px] items-center gap-1 rounded-2xl border px-2 py-1.5 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                      isLight
                        ? 'border-[#DFD7C8] bg-[#FCF9F2] text-[#231C18] shadow-xs hover:bg-[#F2ECE0]'
                        : 'border-[#38BDF8]/25 bg-[#091826]/90 text-white shadow-md hover:bg-[#0F2438]'
                    }`}
                  >
                    <SpotifyLogo weight="fill" className="h-4 w-4 text-[#1DB954]" />
                    <AppleLogo weight="fill" className="h-4 w-4 text-[#FA243C]" />
                  </button>

                  {!isInstalled && (isInstallable || isIOS) && (
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playUiTick(1.15);
                        if (isInstallable) {
                          install();
                        } else {
                          setShowIOSInstallTip((prev) => !prev);
                        }
                      }}
                      aria-label="Install Vinyl Rush PWA"
                      className={`flex h-[38px] w-[38px] items-center justify-center rounded-2xl border transition-all shrink-0 ${
                        isLight
                          ? 'border-[#DFD7C8] bg-[#FCF9F2] text-[#231C18] shadow-xs hover:bg-[#F2ECE0]'
                          : 'border-[#38BDF8]/25 bg-[#091826]/90 text-[#38BDF8] hover:bg-[#0F2438]'
                      }`}
                    >
                      <DownloadSimple weight="bold" className="h-4 w-4" />
                    </button>
                  )}

                  {/* Mute Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      audioEngine.setMuted(next);
                    }}
                    aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded-2xl border transition-all shrink-0 ${
                      isLight
                        ? 'border-[#DFD7C8] bg-[#FCF9F2] text-[#574C44] shadow-xs hover:bg-[#F2ECE0]'
                        : 'border-[#38BDF8]/25 bg-[#091826]/90 text-sky-100 hover:bg-[#0F2438]'
                    }`}
                  >
                    {isMuted ? (
                      <SpeakerSlash weight="bold" className="h-4 w-4 text-rose-500" />
                    ) : (
                      <SpeakerHigh
                        weight="bold"
                        className="h-4 w-4"
                        style={{ color: currentMood.primaryHex }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {showIOSInstallTip && (
                <div
                  className={`rounded-2xl border p-3 text-xs font-medium ${
                    isLight
                      ? 'border-[#DFD7C8] bg-[#FCF9F2] text-[#574C44]'
                      : 'border-[#38BDF8]/25 bg-[#091826]/95 text-sky-100'
                  }`}
                >
                  To install on iOS: tap <strong>Share</strong> in Safari and choose{' '}
                  <strong>Add to Home Screen</strong>.
                </div>
              )}

              {/* Expressive Mascot Companion Bar with Character Switcher & Emotion Pill */}
              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border px-2.5 py-1.5 text-xs shadow-xs transition-colors ${
                  isLight
                    ? 'border-[#E2DBD0] bg-[#FCF9F2]/92 text-[#574C44]'
                    : 'border-[#38BDF8]/20 bg-[#091826]/88 text-sky-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={cycleMascotCharacter}
                    title="Tap to switch vinyl character"
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#4E946B]/40 bg-stone-100 shadow-xs active:scale-95 transition-transform"
                  >
                    <img
                      src={activeCharacter.avatarImg}
                      alt={activeCharacter.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={cycleMascotCharacter}
                        className={`font-extrabold hover:underline ${
                          isLight ? 'text-[#231C18]' : 'text-white'
                        }`}
                      >
                        {activeCharacter.name}
                      </button>
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: activeCharacter.accentColor }}
                      >
                        <Sparkle weight="fill" className="h-2.5 w-2.5" />
                        <span>{emotionBadgeText}</span>
                      </span>
                    </div>
                    <p className="truncate text-[11px] opacity-90">{mascotSpeech}</p>
                  </div>
                </div>

                {/* Toggle Cameo Dance Video Preview */}
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playUiTick();
                    setShowCameoVideo((v) => !v);
                  }}
                  aria-label="Toggle 3D Mascot Dance Video"
                  className={`inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold transition-colors ${
                    showCameoVideo
                      ? 'bg-[#4E946B] text-white'
                      : isLight
                      ? 'bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                      : 'bg-[#38BDF8]/15 text-sky-100 hover:bg-[#38BDF8]/25'
                  }`}
                >
                  <FilmStrip weight="bold" className="h-3.5 w-3.5" />
                  <span>Dance Cam</span>
                </button>
              </div>

              {/* Optional Floating Cameo Dance Video Card */}
              {showCameoVideo && (
                <div
                  className={`self-end overflow-hidden rounded-2xl border p-1.5 shadow-xl ${
                    isLight
                      ? 'border-[#E2DBD0] bg-[#FCF9F2]'
                      : 'border-[#38BDF8]/25 bg-[#091826]'
                  }`}
                >
                  <video
                    src="/assets/aistudio/gemini_generated_video_7AE59D01_39556c31.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-28 w-28 rounded-xl object-cover"
                  />
                </div>
              )}
            </div>

            {/* Center Viewport left 100% unobstructed for the 3D Isometric Turntable & Kawaii Mascot */}
            <div className="pointer-events-none flex-1" />

            {/* Bottom Uncluttered Nintendo-Style Capsule Dock */}
            <section
              aria-label="Game Configuration Dock"
              className={`pointer-events-auto rounded-[28px] border p-3 shadow-2xl transition-all duration-300 space-y-2.5 ${
                isLight
                  ? 'border-[#DFD7C8] bg-[#FCF9F2]/96 text-[#231C18] shadow-[0_16px_40px_rgba(35,28,24,0.09)]'
                  : 'border-[#38BDF8]/22 bg-[#091826]/95 text-[#F0F9FF] shadow-2xl'
              }`}
            >
              {/* Row 1: Quick Vibe Pills + "Tune Rules" Progressive Disclosure Toggle */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar flex-1 min-w-0">
                  {QUICK_VIBE_CRATES.map((crate) => {
                    const isSelected =
                      filterMode === crate.mode &&
                      filterValue === crate.value &&
                      !customSearchTerm;
                    return (
                      <button
                        key={crate.id}
                        type="button"
                        onClick={() => handleSelectFilterValue(crate.mode, crate.value)}
                        className={`min-h-[34px] shrink-0 rounded-xl px-3 py-1 text-xs font-extrabold transition-all whitespace-nowrap ${
                          isSelected
                            ? isLight
                              ? 'bg-[#468E68] text-white shadow-xs'
                              : 'bg-[#0EA5E9] text-slate-950 shadow-xs'
                            : isLight
                            ? 'bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                            : 'bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                        }`}
                      >
                        {crate.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick();
                      if (!connectedProfile) {
                        setIsAccountModalOpen(true);
                      } else {
                        handleSelectFilterValue('account', 'Synced');
                      }
                    }}
                    className={`min-h-[34px] shrink-0 rounded-xl px-3 py-1 text-xs font-extrabold transition-all whitespace-nowrap ${
                      filterMode === 'account'
                        ? 'bg-[#1DB954] text-slate-950'
                        : isLight
                        ? 'bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                        : 'bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                    }`}
                  >
                    My Crate
                  </button>
                </div>

                {/* Tune Rules Button (Progressive Disclosure) */}
                <button
                  type="button"
                  data-testid="tune-rules-btn"
                  onClick={() => {
                    audioEngine.playUiTick(1.12);
                    setIsRulesDrawerOpen((prev) => !prev);
                  }}
                  aria-expanded={isRulesDrawerOpen}
                  className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-extrabold transition-colors whitespace-nowrap ${
                    isRulesDrawerOpen
                      ? isLight
                        ? 'border-[#468E68] bg-[#468E68]/15 text-[#2E6F4E]'
                        : 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#38BDF8]'
                      : isLight
                      ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                      : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                  }`}
                >
                  <SlidersHorizontal weight="bold" className="h-3.5 w-3.5" />
                  <span>{isRulesDrawerOpen ? 'Done' : `${snippetDuration}s · ${songCount}`}</span>
                </button>
              </div>

              {/* Progressive Disclosure Studio Customizer Drawer */}
              {isRulesDrawerOpen && (
                <div
                  className={`rounded-2xl border p-3 space-y-2.5 transition-all ${
                    isLight
                      ? 'border-[#E2DBD0] bg-[#F5F0E6]'
                      : 'border-[#38BDF8]/15 bg-[#06101A]/80'
                  }`}
                >
                  {/* Mascot Character Selector Row */}
                  <div>
                    <span
                      className={`block text-[11px] font-bold mb-1 ${
                        isLight ? 'text-[#5C5046]' : 'text-sky-200/80'
                      }`}
                    >
                      3D Vinyl Companion
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MASCOT_CHARACTERS.map((char) => (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => {
                            audioEngine.playUiTick(1.25);
                            setCharacterId(char.id);
                            setMascotState('hyped');
                            setMascotSpeech(`Picked ${char.name}! Ready to dance!`);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[11px] font-extrabold transition-all whitespace-nowrap ${
                            characterId === char.id
                              ? isLight
                                ? 'border-[#468E68] bg-[#468E68]/15 text-[#231C18]'
                                : 'border-[#38BDF8] bg-[#38BDF8]/20 text-white'
                              : isLight
                              ? 'border-[#DCD4C6] bg-white hover:bg-[#EDE6DA]'
                              : 'border-[#38BDF8]/15 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <img
                            src={char.avatarImg}
                            alt={char.name}
                            className="h-5 w-5 rounded-md object-cover shrink-0"
                          />
                          <span>{char.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Snippet Duration Selector (1s, 3s, 5s, 10s, 15s, 30s) */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span
                        className={`font-bold ${
                          isLight ? 'text-[#5C5046]' : 'text-sky-200/80'
                        }`}
                      >
                        Snippet Play Time
                      </span>
                      <span
                        className="font-mono font-bold tabular-nums"
                        style={{ color: currentMood.primaryHex }}
                      >
                        Up to +{potentialPoints} pts/song
                      </span>
                    </div>
                    <div
                      className={`grid grid-cols-6 gap-1 rounded-xl p-1 ${
                        isLight ? 'bg-[#E5DECFE6]' : 'bg-black/40'
                      }`}
                    >
                      {SNIPPET_OPTIONS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            audioEngine.playUiTick(1 + (30 - sec) * 0.01);
                            setSnippetDuration(sec);
                          }}
                          className={`min-h-[32px] rounded-lg text-xs font-mono font-extrabold tabular-nums transition-colors ${
                            snippetDuration === sec
                              ? isLight
                                ? 'bg-[#468E68] text-white shadow-xs'
                                : 'bg-[#0EA5E9] text-slate-950 shadow-xs'
                              : isLight
                              ? 'text-[#574C44] hover:text-[#231C18]'
                              : 'text-sky-200/75 hover:text-white'
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
                        className={`block text-[11px] font-bold mb-1 ${
                          isLight ? 'text-[#5C5046]' : 'text-sky-200/80'
                        }`}
                      >
                        Songs (Rounds)
                      </span>
                      <div
                        className={`grid grid-cols-3 gap-1 rounded-xl p-1 ${
                          isLight ? 'bg-[#E5DECFE6]' : 'bg-black/40'
                        }`}
                      >
                        {SONG_COUNT_OPTIONS.map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => {
                              audioEngine.playUiTick();
                              setSongCount(count);
                            }}
                            className={`min-h-[32px] rounded-lg text-xs font-mono font-extrabold tabular-nums transition-colors ${
                              songCount === count
                                ? isLight
                                  ? 'bg-[#D98A3C] text-white'
                                  : 'bg-[#2DD4BF] text-slate-950'
                                : isLight
                                ? 'text-[#574C44] hover:text-[#231C18]'
                                : 'text-sky-200/75 hover:text-white'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`block text-[11px] font-bold mb-1 ${
                          isLight ? 'text-[#5C5046]' : 'text-sky-200/80'
                        }`}
                      >
                        Judge Mode
                      </span>
                      <div
                        className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${
                          isLight ? 'bg-[#E5DECFE6]' : 'bg-black/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playUiTick();
                            setPlayMode('party-30s');
                          }}
                          className={`min-h-[32px] rounded-lg text-[11px] font-extrabold transition-colors whitespace-nowrap px-1.5 ${
                            playMode === 'party-30s'
                              ? isLight
                                ? 'bg-[#468E68] text-white'
                                : 'bg-[#0EA5E9] text-slate-950'
                              : isLight
                              ? 'text-[#574C44] hover:text-[#231C18]'
                              : 'text-sky-200/75 hover:text-white'
                          }`}
                        >
                          30s Judge
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playUiTick();
                            setPlayMode('quiz-4choice');
                          }}
                          className={`min-h-[32px] rounded-lg text-[11px] font-extrabold transition-colors whitespace-nowrap px-1.5 ${
                            playMode === 'quiz-4choice'
                              ? isLight
                                ? 'bg-[#468E68] text-white'
                                : 'bg-[#0EA5E9] text-slate-950'
                              : isLight
                              ? 'text-[#574C44] hover:text-[#231C18]'
                              : 'text-sky-200/75 hover:text-white'
                          }`}
                        >
                          4-Choice
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Custom Artist / Era / Genre Search Input */}
                  <div className="relative flex items-center">
                    <MagnifyingGlass
                      weight="bold"
                      className={`pointer-events-none absolute left-3 h-4 w-4 ${
                        isLight ? 'text-[#85776C]' : 'text-sky-300/60'
                      }`}
                    />
                    <input
                      type="text"
                      value={customSearchTerm}
                      onChange={(e) => setCustomSearchTerm(e.target.value)}
                      placeholder="Search any artist, genre, or year (e.g. Daft Punk, SZA, 1998)..."
                      aria-label="Custom artist, genre, or year search"
                      className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none ${
                        isLight
                          ? 'border-[#DCD4C6] bg-white text-[#231C18] placeholder-[#9A8E82] focus:border-[#468E68]'
                          : 'border-[#38BDF8]/20 bg-black/40 text-white placeholder-slate-400 focus:border-[#38BDF8]'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Tactile Nintendo-Style 3D Primary Start Button (with data-start="true") */}
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black tracking-tight active:translate-y-0.5 active:border-b-2 transition-all whitespace-nowrap ${primaryBtnClasses}`}
              >
                <Play weight="fill" className="h-5 w-5 shrink-0" />
                <span>
                  {isLoadingSongs
                    ? `Drop the Needle · Play ${songCount} Songs (${snippetDuration}s)`
                    : `Drop the Needle · Play ${songCount} Songs (${snippetDuration}s)`}
                </span>
              </button>
            </section>
          </>
        )}

        {/* =====================================================================
            STATE 2: PLAYING HUD & COLLAPSIBLE BOTTOM CONTROL DOCK
           ===================================================================== */}
        {session.status === 'playing' && (
          <>
            {/* Top Perimeter Nintendo Status Cluster */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2 shadow-lg transition-colors ${
                  isLight
                    ? 'border-[#DFD7C8] bg-[#FCF9F2]/94 text-[#231C18]'
                    : 'border-[#38BDF8]/22 bg-[#091826]/92 text-[#F0F9FF]'
                }`}
              >
                {/* Score, Streak & Round Readouts (Tabular Numerals) */}
                <div className="flex items-center gap-3.5">
                  <div>
                    <div
                      className={`text-[10px] font-extrabold tracking-wider uppercase ${
                        isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                      }`}
                    >
                      SCORE
                    </div>
                    <div
                      data-testid="hud-score"
                      className="text-xl font-black font-mono tabular-nums"
                    >
                      {Math.round(session.score + (roundFeedback?.points || 0))}
                    </div>
                  </div>

                  <div>
                    <div
                      className={`flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase ${
                        isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                      }`}
                    >
                      <span>STREAK</span>
                      {isFeverActive && (
                        <Fire weight="fill" className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
                      )}
                    </div>
                    <div
                      className="text-xl font-black font-mono tabular-nums"
                      style={{ color: isFeverActive ? '#F59E0B' : currentMood.primaryHex }}
                    >
                      {roundFeedback?.answered
                        ? roundFeedback.correct
                          ? session.streak + 1
                          : 0
                        : session.streak}
                      x
                    </div>
                  </div>

                  <div>
                    <div
                      className={`text-[10px] font-extrabold tracking-wider uppercase ${
                        isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                      }`}
                    >
                      SONG
                    </div>
                    <div
                      className={`text-xl font-black font-mono tabular-nums ${
                        isLight ? 'text-[#574C44]' : 'text-sky-100'
                      }`}
                    >
                      {session.currentIndex + 1}/{session.playlist.length}
                    </div>
                  </div>
                </div>

                {/* Right Utility Controls: Vinyl Pass, Theme Switch [T], Mute [M], Pause [P] */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      audioEngine.playUiTick();
                      setIsPassModalOpen(true);
                    }}
                    aria-label="Open Vinyl Pass and Quests"
                    className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2 text-xs font-extrabold transition-colors ${
                      isLight
                        ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                        : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-amber-300 hover:bg-[#38BDF8]/20'
                    }`}
                  >
                    <Coins weight="fill" className="h-4 w-4 text-amber-500" />
                    <span className="font-mono tabular-nums">{progression.coins}</span>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      toggleThemeMode();
                    }}
                    aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                      isLight
                        ? 'border-[#DCD4C6] bg-[#EDE6DA] text-amber-500 hover:bg-[#E2D9C8]'
                        : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/20'
                    }`}
                  >
                    {isLight ? (
                      <Sun weight="fill" className="h-4 w-4" />
                    ) : (
                      <Moon weight="fill" className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      const next = !isMuted;
                      setIsMuted(next);
                      audioEngine.setMuted(next);
                    }}
                    aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                      isLight
                        ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                        : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                    }`}
                  >
                    {isMuted ? (
                      <SpeakerSlash weight="bold" className="h-4 w-4 text-rose-500" />
                    ) : (
                      <SpeakerHigh
                        weight="bold"
                        className="h-4 w-4"
                        style={{ color: currentMood.primaryHex }}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      audioEngine.stopSnippet(false);
                      setIsPlayingSnippet(false);
                      setSession((prev) => ({ ...prev, status: 'paused' }));
                    }}
                    aria-label="Pause game"
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                      isLight
                        ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                        : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                    }`}
                  >
                    <Pause weight="bold" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mascot Live Reaction Pill */}
              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 text-xs transition-colors ${
                  isLight
                    ? 'border-[#DFD7C8] bg-[#FCF9F2]/90 text-[#574C44]'
                    : 'border-[#38BDF8]/18 bg-[#091826]/88 text-sky-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={cycleMascotCharacter}
                    className="h-6 w-6 shrink-0 overflow-hidden rounded-lg border border-[#4E946B]/40"
                  >
                    <img
                      src={activeCharacter.avatarImg}
                      alt={activeCharacter.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <span className="truncate">
                    <strong className={isLight ? 'text-[#231C18]' : 'text-white'}>
                      {activeCharacter.name}:
                    </strong>{' '}
                    {mascotSpeech}
                  </span>
                </div>
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
                  style={{ backgroundColor: activeCharacter.accentColor }}
                >
                  {emotionBadgeText}
                </span>
              </div>
            </div>

            {/* Unobstructed 3D Center Playfield */}
            <div className="pointer-events-none flex-1" />

            {/* Unified Collapsible Bottom Control Dock */}
            <div className="pointer-events-auto flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiTick();
                  setIsDockCollapsed((prev) => !prev);
                }}
                className={`mb-1.5 inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-bold transition-colors ${
                  isLight
                    ? 'border-[#DFD7C8] bg-[#FCF9F2]/92 text-[#574C44] hover:text-[#231C18]'
                    : 'border-[#38BDF8]/20 bg-[#091826]/90 text-sky-200 hover:text-white'
                }`}
              >
                {isDockCollapsed ? (
                  <>
                    <CaretUp weight="bold" className="h-3.5 w-3.5" />
                    <span>Show Deck Controls [H]</span>
                  </>
                ) : (
                  <>
                    <CaretDown weight="bold" className="h-3.5 w-3.5" />
                    <span>Zen 3D View [H]</span>
                  </>
                )}
              </button>

              {!isDockCollapsed && (
                <section
                  aria-label="Active Song Quiz Controls"
                  className={`w-full rounded-[28px] border p-3 shadow-2xl space-y-2 transition-colors ${
                    isLight
                      ? 'border-[#DFD7C8] bg-[#FCF9F2]/96 text-[#231C18] shadow-[0_16px_40px_rgba(35,28,24,0.1)]'
                      : 'border-[#38BDF8]/22 bg-[#091826]/95 text-[#F0F9FF]'
                  }`}
                >
                  {/* Apple Music-style Animated Cover Art & Mood Card */}
                  <AppleMusicCoverCard
                    song={currentSong}
                    mood={currentMood}
                    themeMode={themeMode}
                    isRevealed={session.isRevealed}
                    isPlaying={isPlayingSnippet}
                    compact
                    artistHintText={artistHintText}
                    onSaveTrack={() => {
                      setProgression((p) => ({
                        ...p,
                        unlockedBadges: Array.from(new Set([...p.unlockedBadges, 'crate-curator'])),
                      }));
                    }}
                  />

                  {/* Gamified In-Round Power-Up Boosters Row */}
                  {!roundFeedback?.answered && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        disabled={Boolean(artistHintText)}
                        onClick={handleUseArtistHint}
                        className={`flex min-h-[34px] items-center justify-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-extrabold transition-all whitespace-nowrap ${
                          artistHintText
                            ? 'opacity-50 cursor-default border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                            : isLight
                            ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                            : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                        }`}
                      >
                        <Lightbulb weight="fill" className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{artistHintText ? 'Clue Active' : 'Artist Clue'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={eliminatedOptionIds.length > 0}
                        onClick={handleUseFiftyFifty}
                        className={`flex min-h-[34px] items-center justify-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-extrabold transition-all whitespace-nowrap ${
                          eliminatedOptionIds.length > 0
                            ? 'opacity-50 cursor-default border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                            : isLight
                            ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                            : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                        }`}
                      >
                        <Scissors weight="bold" className="h-3.5 w-3.5 text-[#5C8EC2] shrink-0" />
                        <span>{eliminatedOptionIds.length > 0 ? '50/50 Cut' : '50/50 Cut'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={doubleBoostActive}
                        onClick={handleUseDoubleBoost}
                        className={`flex min-h-[34px] items-center justify-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-extrabold transition-all whitespace-nowrap ${
                          doubleBoostActive
                            ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                            : isLight
                            ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                            : 'border-[#38BDF8]/20 bg-[#38BDF8]/10 text-sky-100 hover:bg-[#38BDF8]/20'
                        }`}
                      >
                        <Lightning weight="fill" className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{doubleBoostActive ? '2x Active!' : '2x Boost'}</span>
                      </button>
                    </div>
                  )}

                  {/* Snippet Playback Controls & Live Progress Bar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerSnippetPlay(currentSong, snippetDuration)}
                      className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-extrabold active:scale-[0.98] transition-all whitespace-nowrap min-w-0 ${
                        isLight
                          ? 'bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                          : 'bg-[#38BDF8]/15 text-white hover:bg-[#38BDF8]/25'
                      }`}
                    >
                      <Play
                        weight="fill"
                        className="h-4 w-4 shrink-0"
                        style={{ color: currentMood.primaryHex }}
                      />
                      <span className="truncate">
                        {isPlayingSnippet
                          ? `Playing ${snippetDuration}s...`
                          : `Replay ${snippetDuration}s`}
                      </span>
                    </button>

                    {/* Extend Play Time on the fly */}
                    {snippetDuration < 30 && !roundFeedback?.answered && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextDur: SnippetDuration =
                            snippetDuration < 5
                              ? 5
                              : snippetDuration < 15
                              ? 15
                              : 30;
                          setSnippetDuration(nextDur);
                          triggerSnippetPlay(currentSong, nextDur);
                        }}
                        className={`inline-flex min-h-[38px] items-center gap-1 rounded-2xl border px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap shrink-0 ${
                          isLight
                            ? 'border-[#468E68]/40 bg-[#468E68]/12 text-[#2E6F4E] hover:bg-[#468E68]/20'
                            : 'border-[#2DD4BF]/35 bg-[#2DD4BF]/12 text-[#2DD4BF] hover:bg-[#2DD4BF]/22'
                        }`}
                      >
                        <Timer weight="bold" className="h-3.5 w-3.5" />
                        <span>+Time</span>
                      </button>
                    )}

                    {/* Toggle Party 30s Judge vs 4-Choice */}
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playUiTick();
                        setPlayMode((m) =>
                          m === 'party-30s' ? 'quiz-4choice' : 'party-30s'
                        );
                      }}
                      className={`inline-flex min-h-[38px] items-center gap-1 rounded-2xl border px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 ${
                        isLight
                          ? 'border-[#DCD4C6] bg-[#EDE6DA] text-[#574C44] hover:bg-[#E2D9C8]'
                          : 'border-[#38BDF8]/20 bg-white/5 text-sky-100 hover:bg-white/10'
                      }`}
                    >
                      <span>{playMode === 'party-30s' ? '4-Choice' : '30s Judge'}</span>
                    </button>
                  </div>

                  {/* Snippet Progress Bar */}
                  <div
                    className={`h-1.5 w-full overflow-hidden rounded-full ${
                      isLight ? 'bg-[#E5DECF]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className="h-full transition-all duration-75"
                      style={{
                        width: `${Math.round(snippetProgress * 100)}%`,
                        backgroundColor: currentMood.primaryHex,
                      }}
                    />
                  </div>

                  {/* MODE A: 30-SECONDS PARTY SELF-SCORING ("Right or Wrong") */}
                  {playMode === 'party-30s' && !roundFeedback?.answered && (
                    <div className="space-y-2">
                      {!session.isRevealed ? (
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playUiTick(1.15);
                            setSession((prev) => ({ ...prev, isRevealed: true }));
                            setMascotSpeech(
                              `It's "${currentSong.title}" by ${currentSong.artist}! Did you guess it?`
                            );
                          }}
                          className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black active:translate-y-0.5 transition-all ${primaryBtnClasses}`}
                        >
                          <Eye weight="bold" className="h-5 w-5" />
                          <span>Reveal Song &amp; Score Round</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleJudgeAnswer(true)}
                            className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border-b-4 border-[#2E6F4E] bg-[#468E68] px-3 py-2 text-xs font-black text-white shadow-md hover:bg-[#529E76] active:translate-y-0.5 transition-all whitespace-nowrap"
                          >
                            <Check weight="bold" className="h-4 w-4 shrink-0" />
                            <span>Right (+{potentialPoints})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleJudgeAnswer(false)}
                            className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-extrabold active:scale-[0.98] transition-all whitespace-nowrap ${
                              isLight
                                ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'border-rose-500/50 bg-rose-500/25 text-rose-200 hover:bg-rose-500/35'
                            }`}
                          >
                            <X weight="bold" className="h-4 w-4 shrink-0" />
                            <span>Wrong (0)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODE B: 4-CHOICE INTERACTIVE QUIZ */}
                  {playMode === 'quiz-4choice' && !roundFeedback?.answered && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {quizOptions.map((option) => {
                        const isEliminated = eliminatedOptionIds.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={isEliminated}
                            onClick={() =>
                              handleJudgeAnswer(option.id === currentSong.id, option.id)
                            }
                            className={`flex min-h-[44px] flex-col justify-center rounded-2xl border px-3 py-1.5 text-left transition-all ${
                              isEliminated
                                ? 'opacity-30 line-through cursor-not-allowed border-stone-300/40'
                                : isLight
                                ? 'border-[#DCD4C6] bg-[#F5F0E6] hover:border-[#468E68] hover:bg-[#EDE6DA] active:scale-[0.99]'
                                : 'border-[#38BDF8]/18 bg-[#06101A]/70 hover:border-[#38BDF8] hover:bg-[#38BDF8]/15 active:scale-[0.99]'
                            }`}
                          >
                            <span
                              className={`truncate text-xs font-extrabold ${
                                isLight ? 'text-[#231C18]' : 'text-white'
                              }`}
                            >
                              {option.title}
                            </span>
                            <span
                              className={`truncate text-[11px] ${
                                isLight ? 'text-[#6E6259]' : 'text-sky-200/75'
                              }`}
                            >
                              {option.artist} · {option.releaseYear}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Post-Guess Outcome Banner & Next Song Button */}
                  {roundFeedback?.answered && (
                    <div
                      className={`flex items-center justify-between gap-2.5 rounded-2xl border p-2.5 ${
                        isLight
                          ? 'border-[#DCD4C6] bg-[#F5F0E6]'
                          : 'border-[#38BDF8]/20 bg-[#06101A]/85'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-black ${
                            roundFeedback.correct
                              ? isLight
                                ? 'text-[#2E6F4E]'
                                : 'text-[#2DD4BF]'
                              : isLight
                              ? 'text-rose-600'
                              : 'text-rose-300'
                          }`}
                        >
                          {roundFeedback.correct
                            ? `Correct! +${roundFeedback.points} pts · +${roundFeedback.xpGained} XP`
                            : `Missed Track · +${roundFeedback.xpGained} XP`}
                        </div>
                        <div
                          className={`truncate text-[11px] font-medium ${
                            isLight ? 'text-[#5C5046]' : 'text-sky-200/80'
                          }`}
                        >
                          {currentSong.title} — {currentSong.artist}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextRound}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black active:scale-[0.98] transition-all whitespace-nowrap shrink-0 ${primaryBtnClasses}`}
                      >
                        <span>
                          {session.currentIndex + 1 >= session.playlist.length
                            ? 'Finish Set'
                            : 'Next Song'}
                        </span>
                        <ArrowRight weight="bold" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
          </>
        )}

        {/* =====================================================================
            STATE 3: PAUSED MODAL
           ===================================================================== */}
        {session.status === 'paused' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-modal-title"
            className={`pointer-events-auto my-auto mx-auto w-full max-w-sm rounded-[30px] border p-6 text-center shadow-2xl space-y-4 ${
              isLight
                ? 'border-[#DFD7C8] bg-[#FCF9F2]/96 text-[#231C18]'
                : 'border-[#38BDF8]/25 bg-[#091826]/95 text-[#F0F9FF]'
            }`}
          >
            <h2 id="pause-modal-title" className="text-2xl font-black tracking-tight">
              Turntable Paused
            </h2>
            <p className={`text-xs ${isLight ? 'text-[#6E6259]' : 'text-sky-200/75'}`}>
              Round {session.currentIndex + 1} of {session.playlist.length} ·{' '}
              {session.config.snippetDuration}s Snippet Mode
            </p>

            <div
              className={`grid grid-cols-2 gap-3 rounded-2xl p-3 ${
                isLight ? 'bg-[#EDE6DA]' : 'bg-[#06101A]/80'
              }`}
            >
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                  }`}
                >
                  SCORE
                </div>
                <div className="text-xl font-black font-mono tabular-nums">
                  {session.score}
                </div>
              </div>
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                  }`}
                >
                  STREAK
                </div>
                <div
                  className="text-xl font-black font-mono tabular-nums"
                  style={{ color: currentMood.primaryHex }}
                >
                  {session.streak}x
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiTick(1.1);
                  setSession((prev) => ({ ...prev, status: 'playing' }));
                }}
                className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black ${primaryBtnClasses}`}
              >
                <Play weight="fill" className="h-4 w-4" />
                <span>Resume Turntable</span>
              </button>

              <button
                type="button"
                onClick={() => startNewGame()}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
                  isLight
                    ? 'bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                    : 'bg-[#38BDF8]/15 text-white hover:bg-[#38BDF8]/25'
                }`}
              >
                <ArrowsClockwise weight="bold" className="h-4 w-4" />
                <span>Restart Session</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSnippet(false);
                  setSession((prev) => ({ ...prev, status: 'title' }));
                }}
                className={`flex min-h-[42px] w-full items-center justify-center rounded-2xl text-xs font-bold ${
                  isLight
                    ? 'text-[#6E6259] hover:text-[#231C18]'
                    : 'text-sky-200/75 hover:text-white'
                }`}
              >
                Back to Crate Setup
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STATE 4: GAME OVER / SESSION SUMMARY MODAL WITH XP LEVEL & STREAMING LINKS
           ===================================================================== */}
        {session.status === 'gameover' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameover-modal-title"
            className={`pointer-events-auto my-auto mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-[30px] border p-5 shadow-2xl ${
              isLight
                ? 'border-[#DFD7C8] bg-[#FCF9F2]/96 text-[#231C18]'
                : 'border-[#38BDF8]/25 bg-[#091826]/95 text-[#F0F9FF]'
            }`}
          >
            <div className="text-center">
              <div className="mx-auto mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-500">
                <Trophy weight="fill" className="h-4 w-4" />
                <span>
                  Level {tierInfo.level} · {tierInfo.name} ({progression.xp} XP)
                </span>
              </div>
              <h2 id="gameover-modal-title" className="text-2xl font-black tracking-tight">
                Session Complete!
              </h2>
              <p className={`mt-0.5 text-xs ${isLight ? 'text-[#6E6259]' : 'text-sky-200/75'}`}>
                {activeCharacter.name} loved your rhythm! Save your favorite tracks to Spotify or
                Apple Music.
              </p>
            </div>

            {/* 3 Mastery Stat Tiles (Tabular Numerals) */}
            <div
              className={`mt-3.5 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center ${
                isLight ? 'bg-[#EDE6DA]' : 'bg-[#06101A]/80'
              }`}
            >
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                  }`}
                >
                  FINAL SCORE
                </div>
                <div className="text-xl font-black font-mono tabular-nums">
                  {Math.round(session.score)}
                </div>
              </div>
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                  }`}
                >
                  ACCURACY
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-[#468E68]">
                  {session.history.length > 0
                    ? Math.round((session.correctCount / session.history.length) * 100)
                    : 0}
                  %
                </div>
              </div>
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-[#85776C]' : 'text-sky-200/60'
                  }`}
                >
                  BEST STREAK
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-[#D98A3C]">
                  {session.bestStreak}x
                </div>
              </div>
            </div>

            {/* Played Tracks List with Direct Add to Spotify & Apple Music Links */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
              {session.history.map((item, idx) => {
                const links = buildStreamingLinks(item.song);
                return (
                  <div
                    key={`${item.song.id}-${idx}`}
                    className={`flex items-center justify-between gap-2.5 rounded-2xl border p-2.5 ${
                      isLight
                        ? 'border-[#E2DBD0] bg-[#F5F0E6]'
                        : 'border-[#38BDF8]/15 bg-[#06101A]/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold ${
                            item.correct ? 'text-[#468E68]' : 'text-rose-500'
                          }`}
                        >
                          {item.correct ? `+${item.pointsEarned}` : '0'} pts
                        </span>
                        <span aria-hidden="true" className="opacity-40">
                          ·
                        </span>
                        <span className="truncate text-xs font-extrabold">
                          {item.song.title}
                        </span>
                      </div>
                      <div
                        className={`truncate text-[11px] ${
                          isLight ? 'text-[#6E6259]' : 'text-sky-200/75'
                        }`}
                      >
                        {item.song.artist} · {item.song.releaseYear}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={links.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Add ${item.song.title} to Spotify`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/35"
                      >
                        <SpotifyLogo weight="fill" className="h-4 w-4" />
                      </a>
                      <a
                        href={links.appleMusicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.song.title} in Apple Music`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FA243C]/20 text-[#FA243C] hover:bg-[#FA243C]/35"
                      >
                        <AppleLogo weight="fill" className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Play Again & Back to Title Actions */}
            <div
              className={`mt-4 grid grid-cols-2 gap-2.5 pt-2 border-t ${
                isLight ? 'border-[#E2DBD0]' : 'border-[#38BDF8]/15'
              }`}
            >
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black ${primaryBtnClasses}`}
              >
                <ArrowsClockwise weight="bold" className="h-4 w-4" />
                <span>Play Again</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiTick();
                  setSession((prev) => ({ ...prev, status: 'title' }));
                }}
                className={`flex min-h-[48px] items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold ${
                  isLight
                    ? 'bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                    : 'bg-[#38BDF8]/15 text-white hover:bg-[#38BDF8]/25'
                }`}
              >
                Change Crate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          GAMIFICATION MODAL: VINYL PASS, PRESTIGE TIER, DAILY QUESTS & BADGES
          (Inspired directly by IMG_5843 "Blue Tier / Total points / Quests" UI!)
         ===================================================================== */}
      {isPassModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vinyl-pass-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 pointer-events-auto"
        >
          <div
            className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] border p-5 shadow-2xl space-y-4 ${
              isLight
                ? 'border-[#DFD7C8] bg-[#FCF9F2] text-[#231C18]'
                : 'border-[#38BDF8]/28 bg-[#081624] text-[#F0F9FF]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy weight="fill" className="h-5 w-5 text-amber-500" />
                <h2 id="vinyl-pass-title" className="text-lg font-black tracking-tight">
                  Vinyl Pass &amp; Groove Quests
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiTick(0.9);
                  setIsPassModalOpen(false);
                }}
                aria-label="Close Vinyl Pass modal"
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isLight
                    ? 'bg-[#EDE6DA] text-[#231C18] hover:bg-[#E2D9C8]'
                    : 'bg-[#38BDF8]/15 text-sky-100 hover:bg-[#38BDF8]/25'
                }`}
              >
                <X weight="bold" className="h-5 w-5" />
              </button>
            </div>

            {/* Prestige Tier Loyalty Card (Inspired by IMG_5843 Blue Tier Card!) */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                isLight
                  ? 'border-[#DCD4C6] bg-gradient-to-br from-[#F4EFE4] to-[#E8E0D0]'
                  : 'border-[#38BDF8]/30 bg-gradient-to-br from-[#0D253A] to-[#071522]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      isLight ? 'text-[#6E6259]' : 'text-sky-300/80'
                    }`}
                  >
                    LEVEL {tierInfo.level} DJ RANK
                  </span>
                  <div className="text-xl font-black tracking-tight">{tierInfo.name}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-1.5 text-xs font-extrabold text-amber-500">
                  <Coins weight="fill" className="h-4 w-4" />
                  <span className="font-mono tabular-nums">{progression.coins} Coins</span>
                </div>
              </div>

              <div className="flex items-end justify-between text-xs">
                <div>
                  <div className={isLight ? 'text-[#6E6259]' : 'text-sky-200/70'}>Total points</div>
                  <div className="font-mono text-lg font-black tabular-nums">
                    {progression.xp} pt
                  </div>
                </div>
                <div className="text-right">
                  <div className={isLight ? 'text-[#6E6259]' : 'text-sky-200/70'}>To next tier</div>
                  <div className="font-mono text-sm font-bold tabular-nums">
                    {tierInfo.xpToNext} points
                  </div>
                </div>
              </div>

              {/* Tier Progress Bar */}
              <div
                className={`h-2 w-full overflow-hidden rounded-full ${
                  isLight ? 'bg-[#D6CDBE]' : 'bg-black/50'
                }`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(tierInfo.progressRatio * 100)}%`,
                    backgroundColor: tierInfo.badgeHex,
                  }}
                />
              </div>
            </div>

            {/* Daily Groove Quests (+250pt / +350pt / +500pt cards) */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider opacity-75">
                Daily Groove Quests
              </div>
              {progression.quests.map((q) => (
                <div
                  key={q.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                    isLight
                      ? 'border-[#E2DBD0] bg-white/85'
                      : 'border-[#38BDF8]/18 bg-[#0B1E30]/80'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {q.completed ? (
                        <CheckCircle weight="fill" className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Sparkle weight="fill" className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className="truncate text-xs font-extrabold">{q.title}</span>
                    </div>
                    <p
                      className={`truncate text-[11px] ${
                        isLight ? 'text-[#6E6259]' : 'text-sky-200/70'
                      }`}
                    >
                      {q.description} ({q.progress}/{q.target})
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-xl px-2.5 py-1 font-mono text-xs font-extrabold tabular-nums ${
                      q.completed
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : isLight
                        ? 'bg-[#468E68]/15 text-[#2E6F4E]'
                        : 'bg-[#38BDF8]/20 text-[#38BDF8]'
                    }`}
                  >
                    {q.completed ? 'Claimed' : `+${q.rewardXp}pt`}
                  </span>
                </div>
              ))}
            </div>

            {/* Collectible Achievement Badges Grid */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider opacity-75">
                Collectible Vinyl Badges ({progression.unlockedBadges.length}/{ALL_BADGES.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALL_BADGES.map((badge) => {
                  const unlocked = progression.unlockedBadges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`flex items-start gap-2 rounded-2xl border p-2.5 ${
                        unlocked
                          ? isLight
                            ? 'border-[#468E68]/40 bg-[#468E68]/10'
                            : 'border-[#38BDF8]/35 bg-[#38BDF8]/12'
                          : isLight
                          ? 'border-[#E6DFD3] bg-[#F4EFE6]/60 opacity-60'
                          : 'border-white/10 bg-white/[0.03] opacity-55'
                      }`}
                    >
                      {unlocked ? (
                        <Medal weight="fill" className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <LockSimple weight="bold" className="h-4 w-4 opacity-60 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-extrabold">{badge.title}</div>
                        <div className="line-clamp-2 text-[10px] opacity-80">
                          {badge.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spotify & Apple Music Account Connect Modal */}
      <MusicAccountModal
        isOpen={isAccountModalOpen}
        themeMode={themeMode}
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
  );
};
