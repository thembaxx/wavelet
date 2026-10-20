'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  Check,
  X,
  Sparkle,
  SpotifyLogo,
  AppleLogo,
  CaretDown,
  CaretUp,
  DeviceMobile,
  Desktop,
  ArrowsClockwise,
  Timer,
  MusicNotesPlus,
  Lightning,
  DownloadSimple,
  Eye,
  ArrowRight,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import {
  type SnippetDuration,
  type FilterMode,
  type PlayMode,
  type SongTrack,
  type GameSessionState,
  MOOD_PROFILES,
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

export const VinylRushGame: React.FC = () => {
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
    'Tap me or swipe the vinyl deck! Pick your snippet time and drop the needle.'
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
  const [savedCrateCount, setSavedCrateCount] = useState<number>(0);

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  const [showIOSInstallTip, setShowIOSInstallTip] = useState<boolean>(false);

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

  // Sync document.body.dataset.state & dynamic theme-color meta tag for seamless browser chrome
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.state = session.status;
    document.documentElement.style.backgroundColor = currentMood.bgDarkHex;
    document.body.style.backgroundColor = currentMood.bgDarkHex;

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', currentMood.bgDarkHex);
  }, [session.status, currentMood.bgDarkHex]);

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
    fetchLiveCrate('genre', 'All');
  }, [fetchLiveCrate]);

  // Trigger playing the current song snippet
  const triggerSnippetPlay = useCallback(
    (song: SongTrack, durationSec: number) => {
      const mood = deriveSongMood(song);
      setIsPlayingSnippet(true);
      setMascotState('listening');
      setMascotSpeech(`Spinning a ${durationSec}s cut... Listen to the rhythm!`);

      audioEngine.playSnippet({
        previewUrl: song.previewUrl,
        durationSec,
        mood,
        onEnded: () => {
          setIsPlayingSnippet(false);
          setMascotState('idle');
          setMascotSpeech(
            `Time's up! Did you catch that ${song.decade} ${song.genre} groove?`
          );
        },
      });
    },
    []
  );

  // Track snippet elapsed progress bar
  useEffect(() => {
    if (!isPlayingSnippet) {
      setSnippetProgress(0);
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
      startNewGame(CURATED_REAL_SONGS);
    }
  }, [startNewGame]);

  // Handle player answering Right or Wrong (either via 30s Party Judge buttons or 4-Choice Quiz)
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
          `Nailed it! +${points} pts! "${currentSong.title}" by ${currentSong.artist}!`
        );
      } else {
        audioEngine.playWrongScratch();
        setMascotState('sympathy');
        setMascotSpeech(
          `Ah, tough break! That was "${currentSong.title}" by ${currentSong.artist}.`
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
        `Session complete! You scored ${nextState.score} points with a ${nextState.bestStreak}x best streak!`
      );
    } else {
      const nextSong = nextState.playlist[nextState.currentIndex];
      if (nextSong) {
        triggerSnippetPlay(nextSong, snippetDuration);
      }
    }
  }, [roundFeedback, session, snippetProgress, snippetDuration, triggerSnippetPlay]);

  // Global keyboard shortcuts (Enter/Space on Title, P/Escape for Pause, M for Mute, H for Collapse HUD)
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
      } else if (e.code === 'KeyH' && session.status === 'playing') {
        e.preventDefault();
        setIsDockCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.status, isAccountModalOpen, startNewGame]);

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

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden select-none text-white"
      style={{
        background: `radial-gradient(circle at 50% 15%, ${currentMood.primaryHex}33 0%, ${currentMood.bgDarkHex} 72%)`,
      }}
    >
      {/* Full-Viewport 3D Isometric Three.js Vinyl & Mascot World */}
      <IsometricVinylStage
        mood={currentMood}
        mascotState={mascotState}
        isPlayingSnippet={isPlayingSnippet}
        gameState={session.status}
        onMascotInteract={() => {
          setMascotState('hyped');
          setMascotSpeech(
            `Yo! I'm GrooveBot! Shorter snippet times = bigger point multipliers!`
          );
          setTimeout(() => setMascotState(isPlayingSnippet ? 'listening' : 'idle'), 1800);
        }}
        onTurntableInteract={() => {
          setMascotSpeech(`Wicka-wicka scratch! Currently tuned to ${currentMood.label} (${currentMood.bpm} BPM).`);
        }}
      />

      {/* Offline PWA Connectivity Toast */}
      {!isOnline && (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-amber-400/40 bg-[#1c1308]/95 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-lg">
          Offline Mode Active — Playing Cached Curated Crate &amp; Synth Grooves
        </div>
      )}

      {/* Desktop / Tablet Mobile-Only Disclaimer Bar (Non-blocking so all tests and desktop players can interact immediately) */}
      {isDesktopViewport && showDesktopBanner && (
        <div
          role="region"
          aria-label="Mobile-only experience notice"
          className="pointer-events-auto fixed top-3 left-1/2 z-40 flex w-[min(94vw,760px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#120d1e]/95 px-4 py-2.5 text-xs shadow-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <DeviceMobile weight="duotone" className="h-5 w-5 shrink-0 text-[#00F5D4]" />
            <p className="truncate text-slate-200">
              <strong className="text-white">Mobile-First Party Game:</strong> Designed for handheld
              thumb-zone gestures &amp; pass-and-play. Previewing in Mobile Frame mode.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiTick();
                setMobileFrameLocked((prev) => !prev);
              }}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1 font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap"
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
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white"
            >
              <X weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Responsive Game Shell Container (Mobile-Ergonomic Column or Full Width) */}
      <div
        className={`pointer-events-none relative mx-auto flex h-full w-full flex-col justify-between transition-all duration-300 ${
          isDesktopViewport && mobileFrameLocked
            ? 'max-w-[440px] border-x border-white/10 shadow-[0_0_90px_rgba(0,0,0,0.85)]'
            : 'max-w-5xl'
        } ${isDesktopViewport && showDesktopBanner ? 'pt-18' : 'pt-3'} pb-3 px-3.5`}
      >
        {/* =====================================================================
            STATE 1: TITLE SCREEN STAGE
           ===================================================================== */}
        {session.status === 'title' && (
          <>
            {/* Top Negative-Space Custom Inline SVG Title Lockup & Account / PWA Bar */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                {/* Custom Inline SVG Emblem Lockup */}
                <div className="flex items-center min-w-0">
                  <svg
                    viewBox="0 0 218 54"
                    className="h-9 sm:h-10 w-auto drop-shadow-[0_4px_16px_rgba(255,46,147,0.45)]"
                    role="img"
                    aria-label="Vinyl Rush 30s"
                  >
                    <rect
                      x="2"
                      y="4"
                      width="44"
                      height="44"
                      rx="13"
                      fill="#161026"
                      stroke={currentMood.primaryHex}
                      strokeWidth="2.5"
                    />
                    <circle cx="24" cy="26" r="14" fill="#0d0914" stroke="#00F5D4" strokeWidth="2" />
                    <circle cx="24" cy="26" r="4.5" fill={currentMood.primaryHex} />
                    <text
                      x="54"
                      y="25"
                      fill="#FFFFFF"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontWeight="900"
                      fontSize="20"
                      letterSpacing="-0.5"
                    >
                      VINYL RUSH
                    </text>
                    <text
                      x="54"
                      y="42"
                      fill="#00F5D4"
                      fontFamily="monospace"
                      fontWeight="700"
                      fontSize="10.5"
                      letterSpacing="1.2"
                    >
                      30s BEAT QUIZ
                    </text>
                  </svg>
                </div>

                {/* Top Right Actions: Connect Music Account, PWA Install, Mute */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick(1.1);
                      setIsAccountModalOpen(true);
                    }}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl border border-white/15 bg-[#150f24]/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f1735] transition-colors whitespace-nowrap shrink-0"
                  >
                    <SpotifyLogo weight="fill" className="h-4 w-4 text-[#1ED760]" />
                    <AppleLogo weight="fill" className="h-4 w-4 text-[#FF4D62]" />
                    <span>{connectedProfile ? 'Synced' : 'Sync Music'}</span>
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
                      className="inline-flex min-h-[42px] items-center gap-1 rounded-2xl border border-[#00F5D4]/40 bg-[#00F5D4]/15 px-2.5 py-1.5 text-xs font-semibold text-[#00F5D4] hover:bg-[#00F5D4]/25 whitespace-nowrap shrink-0"
                    >
                      <DownloadSimple weight="bold" className="h-4 w-4" />
                      <span>App</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      audioEngine.setMuted(next);
                    }}
                    aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-white/15 bg-[#150f24]/90 text-slate-200 hover:bg-white/15 shrink-0"
                  >
                    {isMuted ? (
                      <SpeakerSlash weight="bold" className="h-5 w-5 text-rose-400" />
                    ) : (
                      <SpeakerHigh weight="bold" className="h-5 w-5 text-[#00F5D4]" />
                    )}
                  </button>
                </div>
              </div>

              {showIOSInstallTip && (
                <div className="rounded-2xl border border-[#00F5D4]/40 bg-[#120d1e]/95 p-3 text-xs text-slate-200">
                  To install on iOS: tap <strong>Share</strong> in Safari and choose{' '}
                  <strong>Add to Home Screen</strong>.
                </div>
              )}

              {/* GrooveBot Mascot Interactive Dialogue Bubble */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#120d1e]/85 px-3.5 py-2 text-xs text-slate-200 shadow-lg">
                <Sparkle weight="fill" className="h-4 w-4 shrink-0 text-[#00F5D4]" />
                <p className="truncate font-medium">
                  <strong className="text-white">GrooveBot:</strong> {mascotSpeech}
                </p>
              </div>
            </div>

            {/* Center Viewport left 100% unobstructed for the 3D Isometric Turntable & GrooveBot */}
            <div className="pointer-events-none flex-1" />

            {/* Bottom Squircle Crate Configurator & Primary Start CTA Dock */}
            <section
              aria-label="Game Configuration Dock"
              className="pointer-events-auto rounded-[28px] border border-white/15 bg-[#120d1e]/95 p-4 shadow-2xl space-y-3"
            >
              {/* Filter Mode Tabs: Genre | Artist | Year | My Account */}
              <div className="grid grid-cols-4 gap-1 rounded-2xl bg-black/40 p-1">
                {(
                  [
                    { id: 'genre', label: 'Genre' },
                    { id: 'artist', label: 'Artist' },
                    { id: 'year', label: 'Year' },
                    { id: 'account', label: 'My Crate' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playUiTick();
                      setFilterMode(tab.id);
                      if (tab.id === 'genre') handleSelectFilterValue('genre', 'All');
                      if (tab.id === 'artist') handleSelectFilterValue('artist', 'Daft Punk');
                      if (tab.id === 'year') handleSelectFilterValue('year', '2020s');
                      if (tab.id === 'account') {
                        if (!connectedProfile) {
                          setIsAccountModalOpen(true);
                        } else {
                          handleSelectFilterValue('account', 'Synced');
                        }
                      }
                    }}
                    className={`min-h-[38px] rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                      filterMode === tab.id
                        ? 'bg-[#FF2E93] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Chips for Selected Filter Mode + Custom Artist/Song Search */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {filterMode === 'genre' &&
                    GENRE_PRESETS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectFilterValue('genre', g.id)}
                        className={`min-h-[36px] shrink-0 rounded-xl px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          filterValue === g.id && !customSearchTerm
                            ? 'bg-[#00F5D4] text-slate-950 font-bold'
                            : 'bg-white/8 text-slate-200 hover:bg-white/15'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}

                  {filterMode === 'artist' &&
                    ARTIST_PRESETS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelectFilterValue('artist', a.id)}
                        className={`min-h-[36px] shrink-0 rounded-xl px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          filterValue === a.id && !customSearchTerm
                            ? 'bg-[#00F5D4] text-slate-950 font-bold'
                            : 'bg-white/8 text-slate-200 hover:bg-white/15'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}

                  {filterMode === 'year' &&
                    YEAR_PRESETS.map((y) => (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => handleSelectFilterValue('year', y.id)}
                        className={`min-h-[36px] shrink-0 rounded-xl px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          filterValue === y.id && !customSearchTerm
                            ? 'bg-[#00F5D4] text-slate-950 font-bold'
                            : 'bg-white/8 text-slate-200 hover:bg-white/15'
                        }`}
                      >
                        {y.label}
                      </button>
                    ))}

                  {filterMode === 'account' && (
                    <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs">
                      <span className="truncate text-slate-200">
                        {connectedProfile
                          ? `${connectedProfile.displayName} (${connectedProfile.customTracks.length} tracks)`
                          : 'Connect Spotify or Apple Music for personal crates'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAccountModalOpen(true)}
                        className="rounded-lg bg-[#00F5D4] px-2.5 py-1 font-bold text-slate-950 whitespace-nowrap"
                      >
                        {connectedProfile ? 'Edit Crate' : 'Connect'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom Live Search Input */}
                <div className="relative flex items-center">
                  <MagnifyingGlass
                    weight="bold"
                    className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
                  />
                  <input
                    type="text"
                    value={customSearchTerm}
                    onChange={(e) => setCustomSearchTerm(e.target.value)}
                    placeholder="Or type any artist, genre, or year (e.g. Rihanna, 1995, House)..."
                    aria-label="Custom artist, genre, or year search"
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-[#00F5D4] focus:outline-none"
                  />
                </div>
              </div>

              {/* Snippet Duration & Song Count Stacked Cleanly */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                    <span className="font-semibold">Snippet Play Time</span>
                    <span className="font-mono tabular-nums text-[#00F5D4]">
                      Up to +{potentialPoints} pts/song
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 rounded-xl bg-black/40 p-1">
                    {SNIPPET_OPTIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          audioEngine.playUiTick(1 + (30 - sec) * 0.01);
                          setSnippetDuration(sec);
                        }}
                        className={`min-h-[34px] rounded-lg text-xs font-mono font-bold tabular-nums transition-colors ${
                          snippetDuration === sec
                            ? 'bg-[#FF2E93] text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Songs (Rounds)
                    </span>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/40 p-1">
                      {SONG_COUNT_OPTIONS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => {
                            audioEngine.playUiTick();
                            setSongCount(count);
                          }}
                          className={`min-h-[34px] rounded-lg text-xs font-mono font-bold tabular-nums transition-colors ${
                            songCount === count
                              ? 'bg-[#00F5D4] text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Judge Mode
                    </span>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playUiTick();
                          setPlayMode('party-30s');
                        }}
                        className={`min-h-[34px] rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap px-1.5 ${
                          playMode === 'party-30s'
                            ? 'bg-[#FF2E93] text-white'
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
                        className={`min-h-[34px] rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap px-1.5 ${
                          playMode === 'quiz-4choice'
                            ? 'bg-[#FF2E93] text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        4-Choice
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Start CTA (with data-start="true") */}
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className="flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FF2E93] px-5 py-3 text-base font-extrabold tracking-tight text-white shadow-[0_8px_28px_rgba(255,46,147,0.45)] hover:bg-[#ff439e] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <Play weight="fill" className="h-5 w-5" />
                <span>
                  {`Drop the Needle · Play ${songCount} Songs (${snippetDuration}s)`}
                </span>
              </button>

              {/* Single Flat Borderless Control Hint Line */}
              <p className="text-center text-[11px] text-slate-400">
                Swipe 3D Turntable to Scratch · Tap GrooveBot · Enter/Space Start · P Pause · M Mute
              </p>
            </section>
          </>
        )}

        {/* =====================================================================
            STATE 2: PLAYING HUD & COLLAPSIBLE BOTTOM CONTROL DOCK
           ===================================================================== */}
        {session.status === 'playing' && (
          <>
            {/* Top Perimeter Status Cluster */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#120d1e]/90 px-3.5 py-2 shadow-xl">
                {/* Score, Streak & Round Readouts (Tabular Numerals) */}
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      SCORE
                    </div>
                    <div
                      data-testid="hud-score"
                      className="text-xl font-black font-mono tabular-nums text-white"
                    >
                      {Math.round(session.score)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      STREAK
                    </div>
                    <div className="text-xl font-black font-mono tabular-nums text-[#00F5D4]">
                      {session.streak}x
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      SONG
                    </div>
                    <div className="text-xl font-black font-mono tabular-nums text-slate-200">
                      {session.currentIndex + 1}/{session.playlist.length}
                    </div>
                  </div>
                </div>

                {/* Right Utility Controls: Account, Mute [M], Pause [P] */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      audioEngine.playUiTick();
                      setIsAccountModalOpen(true);
                    }}
                    aria-label="Open Spotify and Apple Music settings"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#1ED760] hover:bg-white/15"
                  >
                    <SpotifyLogo weight="fill" className="h-5 w-5" />
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
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
                  >
                    {isMuted ? (
                      <SpeakerSlash weight="bold" className="h-5 w-5 text-rose-400" />
                    ) : (
                      <SpeakerHigh weight="bold" className="h-5 w-5 text-[#00F5D4]" />
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
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15"
                  >
                    <Pause weight="bold" className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Mascot Live Status Bar */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#120d1e]/85 px-3 py-1.5 text-xs text-slate-200">
                <span className="truncate">
                  <strong className="text-[#00F5D4]">GrooveBot:</strong> {mascotSpeech}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-[11px] text-slate-400">
                  {snippetDuration}s cut
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
                className="mb-1.5 inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-white/15 bg-[#120d1e]/90 px-3.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white"
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
                  className="w-full rounded-[28px] border border-white/15 bg-[#120d1e]/95 p-3.5 shadow-2xl space-y-3"
                >
                  {/* Apple Music-style Animated Cover Art & Mood Card */}
                  <AppleMusicCoverCard
                    song={currentSong}
                    mood={currentMood}
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
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15 active:scale-[0.98] transition-all whitespace-nowrap"
                    >
                      <Play weight="fill" className="h-4 w-4 shrink-0 text-[#00F5D4]" />
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
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl border border-[#00F5D4]/30 bg-[#00F5D4]/10 px-2.5 py-2 text-xs font-bold text-[#00F5D4] hover:bg-[#00F5D4]/20 whitespace-nowrap shrink-0"
                      >
                        <Timer weight="bold" className="h-4 w-4" />
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
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:text-white whitespace-nowrap shrink-0"
                    >
                      <span>{playMode === 'party-30s' ? '4-Choice' : '30s Judge'}</span>
                    </button>
                  </div>

                  {/* Snippet Progress Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full transition-all duration-75"
                      style={{
                        width: `${Math.round(snippetProgress * 100)}%`,
                        backgroundColor: currentMood.accentHex,
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
                              `It's "${currentSong.title}" by ${currentSong.artist}! Did you get it right?`
                            );
                          }}
                          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF2E93] to-[#7928CA] px-4 py-2.5 text-sm font-extrabold text-white shadow-lg active:scale-[0.98] transition-transform"
                        >
                          <Eye weight="bold" className="h-5 w-5" />
                          <span>Reveal Song &amp; Score Round</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleJudgeAnswer(true)}
                            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 active:scale-[0.98] transition-all whitespace-nowrap"
                          >
                            <Check weight="bold" className="h-5 w-5" />
                            <span>Got It Right (+{potentialPoints})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleJudgeAnswer(false)}
                            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-rose-500/25 border border-rose-500/50 px-4 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-500/35 active:scale-[0.98] transition-all whitespace-nowrap"
                          >
                            <X weight="bold" className="h-5 w-5" />
                            <span>Wrong / Missed</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODE B: 4-CHOICE INTERACTIVE QUIZ */}
                  {playMode === 'quiz-4choice' && !roundFeedback?.answered && (
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {quizOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            handleJudgeAnswer(option.id === currentSong.id, option.id)
                          }
                          className="flex min-h-[46px] flex-col justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2 text-left hover:border-[#00F5D4] hover:bg-white/12 active:scale-[0.99] transition-all"
                        >
                          <span className="truncate text-xs font-bold text-white">
                            {option.title}
                          </span>
                          <span className="truncate text-[11px] text-slate-300">
                            {option.artist} · {option.releaseYear}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Post-Guess Outcome Banner & Next Song Button */}
                  {roundFeedback?.answered && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/8 p-2.5">
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-extrabold ${
                            roundFeedback.correct ? 'text-emerald-400' : 'text-rose-300'
                          }`}
                        >
                          {roundFeedback.correct
                            ? `Correct! +${roundFeedback.points} Points`
                            : 'Missed Track — 0 Points'}
                        </div>
                        <div className="truncate text-[11px] text-slate-300">
                          {currentSong.title} — {currentSong.artist}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextRound}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#00F5D4] px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-[#2affdf] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
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
            className="pointer-events-auto my-auto mx-auto w-full max-w-sm rounded-[28px] border border-white/15 bg-[#130d1f]/95 p-6 text-center shadow-2xl space-y-4"
          >
            <h2 id="pause-modal-title" className="text-2xl font-black tracking-tight">
              Turntable Paused
            </h2>
            <p className="text-xs text-slate-300">
              Round {session.currentIndex + 1} of {session.playlist.length} ·{' '}
              {session.config.snippetDuration}s Snippet Mode
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-black/40 p-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">SCORE</div>
                <div className="text-xl font-black font-mono tabular-nums text-white">
                  {session.score}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">STREAK</div>
                <div className="text-xl font-black font-mono tabular-nums text-[#00F5D4]">
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
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#00F5D4] px-4 py-2.5 text-sm font-extrabold text-slate-950"
              >
                <Play weight="fill" className="h-4 w-4" />
                <span>Resume Turntable</span>
              </button>

              <button
                type="button"
                onClick={() => startNewGame()}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
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
                className="flex min-h-[44px] w-full items-center justify-center rounded-2xl text-xs font-semibold text-slate-300 hover:text-white"
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
            className="pointer-events-auto my-auto mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-[28px] border border-white/15 bg-[#130d1f]/95 p-5 shadow-2xl"
          >
            <div className="text-center">
              <h2 id="gameover-modal-title" className="text-2xl font-black tracking-tight">
                Session Complete!
              </h2>
              <p className="mt-0.5 text-xs text-slate-300">
                GrooveBot salutes your ear! Save your favorite tracks to Spotify or Apple Music.
              </p>
            </div>

            {/* 3 Mastery Stat Tiles (Tabular Numerals) */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/40 p-3 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">FINAL SCORE</div>
                <div className="text-xl font-black font-mono tabular-nums text-white">
                  {Math.round(session.score)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">ACCURACY</div>
                <div className="text-xl font-black font-mono tabular-nums text-[#00F5D4]">
                  {session.history.length > 0
                    ? Math.round((session.correctCount / session.history.length) * 100)
                    : 0}
                  %
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">BEST STREAK</div>
                <div className="text-xl font-black font-mono tabular-nums text-[#FF2E93]">
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
                    className="flex items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold ${
                            item.correct ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.correct ? `+${item.pointsEarned}` : '0'} pts
                        </span>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="truncate text-xs font-bold text-white">
                          {item.song.title}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-slate-300">
                        {item.song.artist} · {item.song.releaseYear}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={links.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Add ${item.song.title} to Spotify`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1DB954]/20 text-[#1ED760] hover:bg-[#1DB954]/35"
                      >
                        <SpotifyLogo weight="fill" className="h-4 w-4" />
                      </a>
                      <a
                        href={links.appleMusicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.song.title} in Apple Music`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FA243C]/20 text-[#FF4D62] hover:bg-[#FA243C]/35"
                      >
                        <AppleLogo weight="fill" className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Play Again & Back to Title Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#FF2E93] px-4 py-2.5 text-sm font-extrabold text-white shadow-lg hover:bg-[#ff47a0]"
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
                className="flex min-h-[48px] items-center justify-center rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15"
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
