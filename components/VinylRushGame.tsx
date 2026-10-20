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
} from '@phosphor-icons/react';
import {
  type SnippetDuration,
  type FilterMode,
  type PlayMode,
  type ThemeMode,
  type MascotCharacterId,
  type SongTrack,
  type GameSessionState,
  MASCOT_CHARACTERS,
  deriveSongMood,
  calculateRoundPoints,
  buildQuizOptions,
  advanceRoundState,
  buildStreamingLinks,
} from '@/lib/game-rules';
import {
  CURATED_REAL_SONGS,
  GENRE_PRESETS,
  ARTIST_PRESETS,
  YEAR_PRESETS,
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
  // Light / Dark Mode Theme & Nintendo 3D Vinyl Toy Character State
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [characterId, setCharacterId] = useState<MascotCharacterId>('pebble');
  const [showCameoVideo, setShowCameoVideo] = useState<boolean>(false);
  const [isRulesDrawerOpen, setIsRulesDrawerOpen] = useState<boolean>(false);

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
    'Tap me to dance or spin the vinyl! Pick a vibe and drop the needle.'
  );
  const [roundFeedback, setRoundFeedback] = useState<{
    answered: boolean;
    correct: boolean;
    points: number;
    selectedSongId?: string;
  } | null>(null);

  // Desktop / Tablet Mobile-Only Disclaimer & Mobile Viewport Frame simulator
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);
  const [mobileFrameLocked, setMobileFrameLocked] = useState<boolean>(true);
  const [showDesktopBanner, setShowDesktopBanner] = useState<boolean>(true);

  // Modals & Saved Crate
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [connectedProfile, setConnectedProfile] = useState<ConnectedMusicProfile | null>(null);
  const [, setSavedCrateCount] = useState<number>(0);

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  const [showIOSInstallTip, setShowIOSInstallTip] = useState<boolean>(false);

  const isLight = themeMode === 'light';

  const activeCharacter = useMemo(() => {
    return MASCOT_CHARACTERS.find((c) => c.id === characterId) || MASCOT_CHARACTERS[0];
  }, [characterId]);

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

  // Sync document.body.dataset.state & dynamic theme-color meta tag for seamless browser chrome in Light & Dark Mode
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
        const preset = YEAR_PRESETS.find((y) => y.id === value);
        term = preset ? preset.query : `${value} music hits`;
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
    (song: SongTrack, durationSec: number) => {
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
    },
    []
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

  // Handle player answering Right or Wrong
  const handleJudgeAnswer = useCallback(
    (correct: boolean, selectedSongId?: string) => {
      if (roundFeedback?.answered) return;
      audioEngine.stopSnippet(false);
      setIsPlayingSnippet(false);

      const remainingRatio = Math.max(0.15, 1 - snippetProgress);
      const { points } = calculateRoundPoints({
        correct,
        snippetSeconds: snippetDuration,
        streak: session.streak,
        timeRemainingRatio: remainingRatio,
      });

      if (correct) {
        audioEngine.playCorrectFanfare(session.streak + 1);
        setMascotState('celebrating');
        setMascotSpeech(
          `Yay!! +${points} pts! "${currentSong.title}" by ${currentSong.artist}!`
        );
      } else {
        audioEngine.playWrongScratch();
        setMascotState('sympathy');
        setMascotSpeech(
          `Aww, close one! That was "${currentSong.title}" by ${currentSong.artist}.`
        );
      }

      setSession((prev) => ({ ...prev, isRevealed: true }));
      setRoundFeedback({
        answered: true,
        correct,
        points,
        selectedSongId,
      });
    },
    [
      roundFeedback?.answered,
      snippetProgress,
      snippetDuration,
      session.streak,
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
    });

    setRoundFeedback(null);
    setSession(nextState);

    if (nextState.status === 'gameover') {
      setMascotState('celebrating');
      audioEngine.playCorrectFanfare(4);
      setMascotSpeech(
        `Encore complete! You scored ${nextState.score} pts with a ${nextState.bestStreak}x streak!`
      );
    } else {
      const nextSong = nextState.playlist[nextState.currentIndex];
      if (nextSong) {
        triggerSnippetPlay(nextSong, snippetDuration);
      }
    }
  }, [roundFeedback, session, snippetProgress, snippetDuration, triggerSnippetPlay]);

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

  // Global keyboard shortcuts (Enter/Space on Title, P/Escape for Pause, M for Mute, T for Theme, H for Collapse HUD)
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
        if (!isAccountModalOpen) {
          e.preventDefault();
          startNewGame();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
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
  }, [session.status, isAccountModalOpen, startNewGame, toggleThemeMode]);

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
    }).points;
  }, [snippetDuration, session.streak]);

  const emotionBadgeText = useMemo(() => {
    if (mascotState === 'listening') return 'Dancing';
    if (mascotState === 'celebrating') return 'Beaming!';
    if (mascotState === 'sympathy') return 'Pouting';
    if (mascotState === 'hyped') return 'Grooving!';
    return 'Smiling';
  }, [mascotState]);

  const activeBgHex = isLight ? currentMood.bgLightHex : currentMood.bgDarkHex;

  return (
    <main
      className={`relative h-dvh w-screen overflow-hidden select-none transition-colors duration-500 ${
        isLight ? 'text-stone-900' : 'text-white'
      }`}
      style={{
        background: isLight
          ? `radial-gradient(circle at 50% 18%, ${currentMood.primaryHex}1F 0%, ${activeBgHex} 70%)`
          : `radial-gradient(circle at 50% 18%, ${currentMood.primaryHex}2E 0%, ${activeBgHex} 72%)`,
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
            `Wheee! Shorter snippet times give up to +500 base points per song!`
          );
          setTimeout(() => setMascotState(isPlayingSnippet ? 'listening' : 'idle'), 1800);
        }}
        onTurntableInteract={() => {
          setMascotSpeech(
            `Scratch that groove! Tuned to ${currentMood.label} (${currentMood.bpm} BPM).`
          );
        }}
      />

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
              ? 'border-stone-200/90 bg-white/95 text-stone-700'
              : 'border-white/15 bg-[#0e1626]/95 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <DeviceMobile
              weight="duotone"
              className="h-5 w-5 shrink-0"
              style={{ color: currentMood.primaryHex }}
            />
            <p className="truncate">
              <strong className={isLight ? 'text-stone-900' : 'text-white'}>
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
                  ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                  : 'bg-white/10 text-white hover:bg-white/20'
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
                  ? 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'
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
              ? 'max-w-[430px] border-x border-stone-300/70 shadow-[0_0_80px_rgba(28,25,23,0.12)]'
              : 'max-w-[430px] border-x border-white/10 shadow-[0_0_90px_rgba(0,0,0,0.85)]'
            : 'max-w-5xl'
        } ${isDesktopViewport && showDesktopBanner ? 'pt-15' : 'pt-3'} pb-3 px-3`}
      >
        {/* =====================================================================
            STATE 1: TITLE SCREEN STAGE (CLEAN NINTENDO 3D CAPSULE UI)
           ===================================================================== */}
        {session.status === 'title' && (
          <>
            {/* Top Header Bar: Brand Emblem + Theme Switch + Spotify/Apple Sync + Mute */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1.5">
                {/* Custom Inline SVG Emblem Lockup (Adapts to Light & Dark Mode) */}
                <div className="flex items-center min-w-0 shrink">
                  <svg
                    viewBox="0 0 235 50"
                    className="h-9 w-auto max-w-[172px]"
                    role="img"
                    aria-label="Vinyl Rush 30s"
                  >
                    <rect
                      x="2"
                      y="3"
                      width="44"
                      height="44"
                      rx="14"
                      fill={isLight ? '#FFFFFF' : '#111A2E'}
                      stroke={currentMood.primaryHex}
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="24"
                      cy="25"
                      r="14"
                      fill="#14121D"
                      stroke={currentMood.accentHex}
                      strokeWidth="2"
                    />
                    <circle cx="24" cy="25" r="4.5" fill={currentMood.primaryHex} />
                    <text
                      x="54"
                      y="24"
                      fill={isLight ? '#1C1917' : '#FFFFFF'}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontWeight="900"
                      fontSize="19"
                      letterSpacing="-0.5"
                    >
                      VINYL RUSH
                    </text>
                    <text
                      x="54"
                      y="40"
                      fill={currentMood.primaryHex}
                      fontFamily="monospace"
                      fontWeight="800"
                      fontSize="10.5"
                      letterSpacing="1.1"
                    >
                      3D BEAT PARTY
                    </text>
                  </svg>
                </div>

                {/* Top Right Tactile Utility Buttons: Theme Switch, Account Sync, App Install, Mute */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Light / Dark Mode Theme Switcher */}
                  <button
                    type="button"
                    data-testid="theme-toggle-btn"
                    onClick={toggleThemeMode}
                    aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-xs font-extrabold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                      isLight
                        ? 'border-stone-200/90 bg-white/95 text-stone-800 shadow-sm hover:bg-stone-100'
                        : 'border-white/15 bg-[#101929]/90 text-amber-300 shadow-md hover:bg-white/15'
                    }`}
                  >
                    {isLight ? (
                      <>
                        <Sun weight="fill" className="h-4 w-4 text-amber-500" />
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <Moon weight="fill" className="h-4 w-4 text-sky-300" />
                        <span>Dark</span>
                      </>
                    )}
                  </button>

                  {/* Spotify & Apple Music Sync Button */}
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick(1.1);
                      setIsAccountModalOpen(true);
                    }}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                      isLight
                        ? 'border-stone-200/90 bg-white/95 text-stone-800 shadow-sm hover:bg-stone-100'
                        : 'border-white/15 bg-[#101929]/90 text-white shadow-md hover:bg-white/15'
                    }`}
                  >
                    <SpotifyLogo weight="fill" className="h-4 w-4 text-[#1DB954]" />
                    <AppleLogo weight="fill" className="h-4 w-4 text-[#FA243C]" />
                    <span>{connectedProfile ? 'Synced' : 'Sync'}</span>
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
                          ? 'border-stone-200/90 bg-white/95 text-stone-800 shadow-sm hover:bg-stone-100'
                          : 'border-white/15 bg-[#101929]/90 text-[#00D2B8] hover:bg-white/15'
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
                        ? 'border-stone-200/90 bg-white/95 text-stone-700 shadow-sm hover:bg-stone-100'
                        : 'border-white/15 bg-[#101929]/90 text-slate-200 hover:bg-white/15'
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
                      ? 'border-stone-200 bg-white/95 text-stone-700'
                      : 'border-white/15 bg-[#101929]/95 text-slate-200'
                  }`}
                >
                  To install on iOS: tap <strong>Share</strong> in Safari and choose{' '}
                  <strong>Add to Home Screen</strong>.
                </div>
              )}

              {/* Expressive Mascot Companion Bar with Character Switcher & Emotion Pill */}
              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border px-2.5 py-1.5 text-xs shadow-sm transition-colors ${
                  isLight
                    ? 'border-stone-200/90 bg-white/90 text-stone-700'
                    : 'border-white/12 bg-[#101929]/85 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={cycleMascotCharacter}
                    title="Tap to switch vinyl character"
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-pink-400/50 bg-stone-100 shadow-xs active:scale-95 transition-transform"
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
                          isLight ? 'text-stone-900' : 'text-white'
                        }`}
                      >
                        {activeCharacter.name}
                      </button>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: activeCharacter.accentColor }}
                      >
                        {emotionBadgeText}
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
                      ? 'bg-[#FF4791] text-white'
                      : isLight
                      ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <FilmStrip weight="bold" className="h-3.5 w-3.5" />
                  <span>Dance Cam</span>
                </button>
              </div>

              {/* Optional Floating Cameo Dance Video Card (uses attached gemini_generated_video_7AE59D01_39556c31.mp4) */}
              {showCameoVideo && (
                <div
                  className={`self-end overflow-hidden rounded-2xl border p-1.5 shadow-xl ${
                    isLight
                      ? 'border-stone-200 bg-white/95'
                      : 'border-white/15 bg-[#101929]/95'
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

            {/* Bottom Uncluttered Nintendo-Style Capsule Dock (Simple by default, Powerful when expanded) */}
            <section
              aria-label="Game Configuration Dock"
              className={`pointer-events-auto rounded-[28px] border p-3 shadow-2xl transition-all duration-300 space-y-2.5 ${
                isLight
                  ? 'border-stone-200/95 bg-white/95 text-stone-900 shadow-[0_16px_40px_rgba(28,25,23,0.1)]'
                  : 'border-white/15 bg-[#0e1626]/95 text-white shadow-2xl'
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
                            ? 'bg-[#FF4791] text-white shadow-xs'
                            : isLight
                            ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            : 'bg-white/8 text-slate-200 hover:bg-white/15'
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
                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'bg-white/8 text-slate-200 hover:bg-white/15'
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
                      ? 'border-[#FF4791] bg-[#FF4791]/15 text-[#FF4791]'
                      : isLight
                      ? 'border-stone-200 bg-stone-100 text-stone-800 hover:bg-stone-200'
                      : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <SlidersHorizontal weight="bold" className="h-3.5 w-3.5" />
                  <span>{isRulesDrawerOpen ? 'Done' : `${snippetDuration}s · ${songCount}`}</span>
                </button>
              </div>

              {/* Progressive Disclosure Studio Customizer Drawer (Powerful when you need it!) */}
              {isRulesDrawerOpen && (
                <div
                  className={`rounded-2xl border p-3 space-y-2.5 transition-all ${
                    isLight
                      ? 'border-stone-200 bg-stone-50/90'
                      : 'border-white/10 bg-black/35'
                  }`}
                >
                  {/* Mascot Character Selector Row */}
                  <div>
                    <span
                      className={`block text-[11px] font-bold mb-1 ${
                        isLight ? 'text-stone-600' : 'text-slate-300'
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
                              ? 'border-[#FF4791] bg-[#FF4791]/15'
                              : isLight
                              ? 'border-stone-200 bg-white hover:bg-stone-100'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
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
                          isLight ? 'text-stone-600' : 'text-slate-300'
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
                        isLight ? 'bg-stone-200/70' : 'bg-black/40'
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
                              ? 'bg-[#FF4791] text-white shadow-xs'
                              : isLight
                              ? 'text-stone-700 hover:text-stone-950'
                              : 'text-slate-300 hover:text-white'
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
                          isLight ? 'text-stone-600' : 'text-slate-300'
                        }`}
                      >
                        Songs (Rounds)
                      </span>
                      <div
                        className={`grid grid-cols-3 gap-1 rounded-xl p-1 ${
                          isLight ? 'bg-stone-200/70' : 'bg-black/40'
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
                                ? 'bg-[#00D2B8] text-slate-950'
                                : isLight
                                ? 'text-stone-700 hover:text-stone-950'
                                : 'text-slate-300 hover:text-white'
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
                          isLight ? 'text-stone-600' : 'text-slate-300'
                        }`}
                      >
                        Judge Mode
                      </span>
                      <div
                        className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${
                          isLight ? 'bg-stone-200/70' : 'bg-black/40'
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
                              ? 'bg-[#FF4791] text-white'
                              : isLight
                              ? 'text-stone-700 hover:text-stone-950'
                              : 'text-slate-300 hover:text-white'
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
                              ? 'bg-[#FF4791] text-white'
                              : isLight
                              ? 'text-stone-700 hover:text-stone-950'
                              : 'text-slate-300 hover:text-white'
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
                        isLight ? 'text-stone-400' : 'text-slate-400'
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
                          ? 'border-stone-300 bg-white text-stone-900 placeholder-stone-400 focus:border-[#FF4791]'
                          : 'border-white/10 bg-black/40 text-white placeholder-slate-400 focus:border-[#00D2B8]'
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
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#c81e64] bg-[#FF4791] px-4 py-2.5 text-sm font-black tracking-tight text-white shadow-[0_8px_24px_rgba(255,71,145,0.38)] hover:bg-[#ff599c] active:translate-y-0.5 active:border-b-2 transition-all whitespace-nowrap"
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
                    ? 'border-stone-200/95 bg-white/90 text-stone-900'
                    : 'border-white/15 bg-[#0e1626]/90 text-white'
                }`}
              >
                {/* Score, Streak & Round Readouts (Tabular Numerals) */}
                <div className="flex items-center gap-4">
                  <div>
                    <div
                      className={`text-[10px] font-extrabold tracking-wider uppercase ${
                        isLight ? 'text-stone-400' : 'text-slate-400'
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
                      className={`text-[10px] font-extrabold tracking-wider uppercase ${
                        isLight ? 'text-stone-400' : 'text-slate-400'
                      }`}
                    >
                      STREAK
                    </div>
                    <div
                      className="text-xl font-black font-mono tabular-nums"
                      style={{ color: currentMood.primaryHex }}
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
                        isLight ? 'text-stone-400' : 'text-slate-400'
                      }`}
                    >
                      SONG
                    </div>
                    <div
                      className={`text-xl font-black font-mono tabular-nums ${
                        isLight ? 'text-stone-700' : 'text-slate-200'
                      }`}
                    >
                      {session.currentIndex + 1}/{session.playlist.length}
                    </div>
                  </div>
                </div>

                {/* Right Utility Controls: Theme Switch [T], Account, Mute [M], Pause [P] */}
                <div className="flex items-center gap-1.5">
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
                        ? 'border-stone-200 bg-stone-100 text-amber-500 hover:bg-stone-200'
                        : 'border-white/15 bg-white/5 text-sky-300 hover:bg-white/15'
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
                      audioEngine.playUiTick();
                      setIsAccountModalOpen(true);
                    }}
                    aria-label="Open Spotify and Apple Music settings"
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                      isLight
                        ? 'border-stone-200 bg-stone-100 text-[#1DB954] hover:bg-stone-200'
                        : 'border-white/15 bg-white/5 text-[#1ED760] hover:bg-white/15'
                    }`}
                  >
                    <SpotifyLogo weight="fill" className="h-4 w-4" />
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
                        ? 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/15'
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
                        ? 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/15'
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
                    ? 'border-stone-200/90 bg-white/85 text-stone-700'
                    : 'border-white/10 bg-[#0e1626]/85 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={cycleMascotCharacter}
                    className="h-6 w-6 shrink-0 overflow-hidden rounded-lg border border-pink-400/40"
                  >
                    <img
                      src={activeCharacter.avatarImg}
                      alt={activeCharacter.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <span className="truncate">
                    <strong className={isLight ? 'text-stone-900' : 'text-white'}>
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
                    ? 'border-stone-200 bg-white/90 text-stone-600 hover:text-stone-900'
                    : 'border-white/15 bg-[#0e1626]/90 text-slate-300 hover:text-white'
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
                  className={`w-full rounded-[28px] border p-3 shadow-2xl space-y-2.5 transition-colors ${
                    isLight
                      ? 'border-stone-200/95 bg-white/95 text-stone-900 shadow-[0_16px_40px_rgba(28,25,23,0.1)]'
                      : 'border-white/15 bg-[#0e1626]/95 text-white'
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
                    onSaveTrack={() => setSavedCrateCount((c) => c + 1)}
                  />

                  {/* Snippet Playback Controls & Live Progress Bar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerSnippetPlay(currentSong, snippetDuration)}
                      className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold active:scale-[0.98] transition-all whitespace-nowrap min-w-0 ${
                        isLight
                          ? 'bg-stone-100 text-stone-900 hover:bg-stone-200'
                          : 'bg-white/10 text-white hover:bg-white/15'
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
                        className={`inline-flex min-h-[40px] items-center gap-1 rounded-2xl border px-2.5 py-2 text-xs font-extrabold whitespace-nowrap shrink-0 ${
                          isLight
                            ? 'border-pink-200 bg-pink-50 text-[#FF4791] hover:bg-pink-100'
                            : 'border-[#00D2B8]/30 bg-[#00D2B8]/10 text-[#00D2B8] hover:bg-[#00D2B8]/20'
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
                      className={`inline-flex min-h-[40px] items-center gap-1 rounded-2xl border px-2.5 py-2 text-xs font-bold whitespace-nowrap shrink-0 ${
                        isLight
                          ? 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>{playMode === 'party-30s' ? '4-Choice' : '30s Judge'}</span>
                    </button>
                  </div>

                  {/* Snippet Progress Bar */}
                  <div
                    className={`h-1.5 w-full overflow-hidden rounded-full ${
                      isLight ? 'bg-stone-200' : 'bg-white/10'
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
                          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#c81e64] bg-[#FF4791] px-4 py-2.5 text-sm font-black text-white shadow-md active:translate-y-0.5 transition-all"
                        >
                          <Eye weight="bold" className="h-5 w-5" />
                          <span>Reveal Song &amp; Score Round</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleJudgeAnswer(true)}
                            className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-3 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-400 active:translate-y-0.5 transition-all whitespace-nowrap"
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
                      {quizOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            handleJudgeAnswer(option.id === currentSong.id, option.id)
                          }
                          className={`flex min-h-[46px] flex-col justify-center rounded-2xl border px-3 py-1.5 text-left active:scale-[0.99] transition-all ${
                            isLight
                              ? 'border-stone-200 bg-stone-50 hover:border-[#FF4791] hover:bg-pink-50/40'
                              : 'border-white/12 bg-white/[0.06] hover:border-[#00D2B8] hover:bg-white/12'
                          }`}
                        >
                          <span
                            className={`truncate text-xs font-extrabold ${
                              isLight ? 'text-stone-900' : 'text-white'
                            }`}
                          >
                            {option.title}
                          </span>
                          <span
                            className={`truncate text-[11px] ${
                              isLight ? 'text-stone-500' : 'text-slate-300'
                            }`}
                          >
                            {option.artist} · {option.releaseYear}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Post-Guess Outcome Banner & Next Song Button */}
                  {roundFeedback?.answered && (
                    <div
                      className={`flex items-center justify-between gap-2.5 rounded-2xl border p-2.5 ${
                        isLight
                          ? 'border-stone-200 bg-stone-100/90'
                          : 'border-white/15 bg-white/8'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-black ${
                            roundFeedback.correct
                              ? isLight
                                ? 'text-emerald-600'
                                : 'text-emerald-400'
                              : isLight
                              ? 'text-rose-600'
                              : 'text-rose-300'
                          }`}
                        >
                          {roundFeedback.correct
                            ? `Correct! +${roundFeedback.points} Points`
                            : 'Missed Track — 0 Points'}
                        </div>
                        <div
                          className={`truncate text-[11px] font-medium ${
                            isLight ? 'text-stone-600' : 'text-slate-300'
                          }`}
                        >
                          {currentSong.title} — {currentSong.artist}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextRound}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#FF4791] px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-[#ff599c] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
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
                ? 'border-stone-200 bg-white/95 text-stone-900'
                : 'border-white/15 bg-[#0e1626]/95 text-white'
            }`}
          >
            <h2 id="pause-modal-title" className="text-2xl font-black tracking-tight">
              Turntable Paused
            </h2>
            <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-slate-300'}`}>
              Round {session.currentIndex + 1} of {session.playlist.length} ·{' '}
              {session.config.snippetDuration}s Snippet Mode
            </p>

            <div
              className={`grid grid-cols-2 gap-3 rounded-2xl p-3 ${
                isLight ? 'bg-stone-100' : 'bg-black/40'
              }`}
            >
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-stone-400' : 'text-slate-400'
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
                    isLight ? 'text-stone-400' : 'text-slate-400'
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
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#c81e64] bg-[#FF4791] px-4 py-2.5 text-sm font-black text-white"
              >
                <Play weight="fill" className="h-4 w-4" />
                <span>Resume Turntable</span>
              </button>

              <button
                type="button"
                onClick={() => startNewGame()}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
                  isLight
                    ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                    : 'bg-white/10 text-white hover:bg-white/15'
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
                    ? 'text-stone-500 hover:text-stone-900'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Back to Crate Setup
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STATE 4: GAME OVER / SESSION SUMMARY MODAL WITH SPOTIFY & APPLE MUSIC LINKS
           ===================================================================== */}
        {session.status === 'gameover' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameover-modal-title"
            className={`pointer-events-auto my-auto mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-[30px] border p-5 shadow-2xl ${
              isLight
                ? 'border-stone-200 bg-white/95 text-stone-900'
                : 'border-white/15 bg-[#0e1626]/95 text-white'
            }`}
          >
            <div className="text-center">
              <h2 id="gameover-modal-title" className="text-2xl font-black tracking-tight">
                Session Complete!
              </h2>
              <p className={`mt-0.5 text-xs ${isLight ? 'text-stone-500' : 'text-slate-300'}`}>
                {activeCharacter.name} loved your rhythm! Save your favorite tracks to Spotify or
                Apple Music.
              </p>
            </div>

            {/* 3 Mastery Stat Tiles (Tabular Numerals) */}
            <div
              className={`mt-4 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center ${
                isLight ? 'bg-stone-100' : 'bg-black/40'
              }`}
            >
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-stone-400' : 'text-slate-400'
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
                    isLight ? 'text-stone-400' : 'text-slate-400'
                  }`}
                >
                  ACCURACY
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-emerald-500">
                  {session.history.length > 0
                    ? Math.round((session.correctCount / session.history.length) * 100)
                    : 0}
                  %
                </div>
              </div>
              <div>
                <div
                  className={`text-[10px] font-bold uppercase ${
                    isLight ? 'text-stone-400' : 'text-slate-400'
                  }`}
                >
                  BEST STREAK
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-[#FF4791]">
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
                        ? 'border-stone-200 bg-stone-50'
                        : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold ${
                            item.correct ? 'text-emerald-500' : 'text-rose-500'
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
                          isLight ? 'text-stone-500' : 'text-slate-300'
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
                isLight ? 'border-stone-200' : 'border-white/10'
              }`}
            >
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-b-4 border-[#c81e64] bg-[#FF4791] px-4 py-2.5 text-sm font-black text-white shadow-md hover:bg-[#ff599c]"
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
                    ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                Change Crate
              </button>
            </div>
          </div>
        )}
      </div>

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
