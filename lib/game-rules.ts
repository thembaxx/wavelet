export type SnippetDuration = 1 | 3 | 5 | 10 | 15 | 30;

export type FilterMode = 'genre' | 'artist' | 'year' | 'account';

export type PlayMode = 'party-30s' | 'quiz-4choice';

export type MoodId =
  | 'euphoric-pop'
  | 'velvet-rnb'
  | 'neon-synth'
  | 'golden-hiphop'
  | 'afro-pulse'
  | 'indie-amber';

export interface SongMoodProfile {
  id: MoodId;
  label: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  bgDarkHex: string;
  bpm: number;
  energy: number; // 0.3 to 1.0
}

export interface SongTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseYear: number;
  decade: string; // e.g. "1980s", "1990s", "2000s", "2010s", "2020s"
  genre: string;
  previewUrl: string;
  artworkUrl: string;
  appleMusicUrl?: string;
  spotifyUrl?: string;
  bpm?: number;
  source?: 'itunes' | 'spotify' | 'apple-music' | 'curated';
}

export interface GameConfig {
  filterMode: FilterMode;
  filterValue: string;
  snippetDuration: SnippetDuration;
  songCount: number;
  playMode: PlayMode;
}

export interface RoundHistoryItem {
  roundIndex: number;
  song: SongTrack;
  correct: boolean;
  pointsEarned: number;
  snippetDuration: SnippetDuration;
  streakAfter: number;
  savedToSpotify?: boolean;
  savedToAppleMusic?: boolean;
}

export interface GameSessionState {
  status: 'title' | 'playing' | 'paused' | 'gameover';
  config: GameConfig;
  playlist: SongTrack[];
  currentIndex: number;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  history: RoundHistoryItem[];
  isRevealed: boolean;
}

export const MOOD_PROFILES: Record<MoodId, SongMoodProfile> = {
  'euphoric-pop': {
    id: 'euphoric-pop',
    label: 'Euphoric Pop Glow',
    primaryHex: '#FF2E93',
    secondaryHex: '#7928CA',
    accentHex: '#00F5D4',
    bgDarkHex: '#130924',
    bpm: 122,
    energy: 0.88,
  },
  'velvet-rnb': {
    id: 'velvet-rnb',
    label: 'Velvet Late-Night R&B',
    primaryHex: '#C850C0',
    secondaryHex: '#4158D0',
    accentHex: '#FFCC70',
    bgDarkHex: '#0E1026',
    bpm: 96,
    energy: 0.65,
  },
  'neon-synth': {
    id: 'neon-synth',
    label: 'Electro French Touch',
    primaryHex: '#00DBDE',
    secondaryHex: '#FC00FF',
    accentHex: '#FFE600',
    bgDarkHex: '#091426',
    bpm: 126,
    energy: 0.94,
  },
  'golden-hiphop': {
    id: 'golden-hiphop',
    label: 'Boom-Bap Gold Crate',
    primaryHex: '#F7971E',
    secondaryHex: '#FFD200',
    accentHex: '#FF416C',
    bgDarkHex: '#1B1209',
    bpm: 92,
    energy: 0.78,
  },
  'afro-pulse': {
    id: 'afro-pulse',
    label: 'Amapiano & Afro Log-Drum',
    primaryHex: '#11998E',
    secondaryHex: '#38EF7D',
    accentHex: '#FF8008',
    bgDarkHex: '#081C18',
    bpm: 113,
    energy: 0.85,
  },
  'indie-amber': {
    id: 'indie-amber',
    label: 'Analog Vinyl Warmth',
    primaryHex: '#FF512F',
    secondaryHex: '#DD2476',
    accentHex: '#F09819',
    bgDarkHex: '#1A0D18',
    bpm: 116,
    energy: 0.72,
  },
};

const BASE_POINTS_BY_DURATION: Record<SnippetDuration, number> = {
  1: 500,
  3: 350,
  5: 250,
  10: 180,
  15: 140,
  30: 100,
};

/**
 * Calculates points awarded for a song guess based on snippet duration, streak, and remaining time ratio.
 */
export function calculateRoundPoints(params: {
  correct: boolean;
  snippetSeconds: SnippetDuration;
  streak: number;
  timeRemainingRatio?: number;
}): { points: number; multiplier: number; speedBonus: number } {
  if (!params.correct) {
    return { points: 0, multiplier: 1, speedBonus: 0 };
  }

  const base = BASE_POINTS_BY_DURATION[params.snippetSeconds] ?? 150;
  const clampedStreak = Math.max(0, Math.min(params.streak, 6));
  const multiplier = Number((1 + clampedStreak * 0.25).toFixed(2));
  const clampedRatio = Math.max(0, Math.min(params.timeRemainingRatio ?? 0.5, 1));
  const speedBonus = Math.round(base * 0.3 * clampedRatio);
  const points = Math.round(base * multiplier + speedBonus);

  return { points, multiplier, speedBonus };
}

/**
 * Derives a visual & rhythmic mood profile from a song's genre, artist, and era.
 */
export function deriveSongMood(song: Pick<SongTrack, 'genre' | 'releaseYear' | 'title' | 'artist' | 'bpm'>): SongMoodProfile {
  const g = (song.genre || '').toLowerCase();
  const a = (song.artist || '').toLowerCase();

  if (
    g.includes('electronic') ||
    g.includes('dance') ||
    g.includes('house') ||
    a.includes('daft punk') ||
    a.includes('kaytranada') ||
    a.includes('calvin')
  ) {
    return { ...MOOD_PROFILES['neon-synth'], bpm: song.bpm || 124 };
  }
  if (
    g.includes('afro') ||
    g.includes('amapiano') ||
    g.includes('world') ||
    a.includes('burna') ||
    a.includes('tyla') ||
    a.includes('wizkid') ||
    a.includes('tems')
  ) {
    return { ...MOOD_PROFILES['afro-pulse'], bpm: song.bpm || 113 };
  }
  if (
    g.includes('hip-hop') ||
    g.includes('rap') ||
    a.includes('kendrick') ||
    a.includes('drake') ||
    a.includes('outkast')
  ) {
    return { ...MOOD_PROFILES['golden-hiphop'], bpm: song.bpm || 94 };
  }
  if (
    g.includes('r&b') ||
    g.includes('soul') ||
    a.includes('sza') ||
    a.includes('frank ocean') ||
    a.includes('usher') ||
    a.includes('beyoncé')
  ) {
    return { ...MOOD_PROFILES['velvet-rnb'], bpm: song.bpm || 98 };
  }
  if (
    g.includes('rock') ||
    g.includes('alternative') ||
    g.includes('indie') ||
    a.includes('tame impala') ||
    a.includes('arctic') ||
    a.includes('fleetwood')
  ) {
    return { ...MOOD_PROFILES['indie-amber'], bpm: song.bpm || 116 };
  }

  return { ...MOOD_PROFILES['euphoric-pop'], bpm: song.bpm || 120 };
}

/**
 * Generates direct streaming links for Apple Music and Spotify so players can open/save any track.
 */
export function buildStreamingLinks(song: Pick<SongTrack, 'title' | 'artist' | 'appleMusicUrl' | 'spotifyUrl'>): {
  appleMusicUrl: string;
  spotifyUrl: string;
} {
  const query = encodeURIComponent(`${song.title} ${song.artist}`.trim());
  return {
    appleMusicUrl: song.appleMusicUrl || `https://music.apple.com/us/search?term=${query}`,
    spotifyUrl: song.spotifyUrl || `https://open.spotify.com/search/${query}`,
  };
}

/**
 * Deterministically builds 4 multiple-choice options including the target song.
 */
export function buildQuizOptions(target: SongTrack, pool: SongTrack[], seed = 1): SongTrack[] {
  const distractors = pool.filter((t) => t.id !== target.id && t.title.toLowerCase() !== target.title.toLowerCase());
  const selected: SongTrack[] = [target];

  let idx = Math.abs(seed);
  while (selected.length < 4 && distractors.length > 0) {
    const pickIndex = idx % distractors.length;
    const candidate = distractors.splice(pickIndex, 1)[0];
    if (candidate) {
      selected.push(candidate);
    }
    idx += 7;
  }

  // Deterministic rotation so target isn't always first
  const rotateBy = Math.abs(seed + target.title.length) % selected.length;
  return [...selected.slice(rotateBy), ...selected.slice(0, rotateBy)];
}

/**
 * Filters a song pool by config criteria and returns up to songCount tracks.
 */
export function filterAndSelectSongs(pool: SongTrack[], config: GameConfig): SongTrack[] {
  const val = (config.filterValue || 'All').trim().toLowerCase();
  let filtered = pool;

  if (val && val !== 'all') {
    if (config.filterMode === 'genre') {
      filtered = pool.filter((s) => s.genre.toLowerCase().includes(val));
    } else if (config.filterMode === 'artist') {
      filtered = pool.filter((s) => s.artist.toLowerCase().includes(val));
    } else if (config.filterMode === 'year') {
      filtered = pool.filter(
        (s) => s.decade.toLowerCase() === val || String(s.releaseYear) === val
      );
    } else if (config.filterMode === 'account') {
      filtered = pool.filter((s) => s.source === 'spotify' || s.source === 'apple-music' || true);
    }
  }

  if (filtered.length < 4) {
    // Supplement from full pool if filter is too narrow
    const existingIds = new Set(filtered.map((s) => s.id));
    for (const track of pool) {
      if (!existingIds.has(track.id)) {
        filtered.push(track);
      }
      if (filtered.length >= config.songCount) break;
    }
  }

  return filtered.slice(0, Math.max(1, config.songCount));
}

/**
 * Advances the game session state after a player answers right or wrong.
 */
export function advanceRoundState(
  state: GameSessionState,
  outcome: {
    correct: boolean;
    timeRemainingRatio?: number;
  }
): GameSessionState {
  const currentSong = state.playlist[state.currentIndex];
  if (!currentSong) {
    return { ...state, status: 'gameover' };
  }

  const { points } = calculateRoundPoints({
    correct: outcome.correct,
    snippetSeconds: state.config.snippetDuration,
    streak: state.streak,
    timeRemainingRatio: outcome.timeRemainingRatio ?? 0.5,
  });

  const nextStreak = outcome.correct ? state.streak + 1 : 0;
  const nextBestStreak = Math.max(state.bestStreak, nextStreak);
  const nextScore = state.score + points;
  const nextCorrectCount = state.correctCount + (outcome.correct ? 1 : 0);

  const historyItem: RoundHistoryItem = {
    roundIndex: state.currentIndex,
    song: currentSong,
    correct: outcome.correct,
    pointsEarned: points,
    snippetDuration: state.config.snippetDuration,
    streakAfter: nextStreak,
  };

  const nextIndex = state.currentIndex + 1;
  const isFinished = nextIndex >= state.playlist.length;

  return {
    ...state,
    status: isFinished ? 'gameover' : 'playing',
    currentIndex: isFinished ? state.currentIndex : nextIndex,
    score: nextScore,
    streak: nextStreak,
    bestStreak: nextBestStreak,
    correctCount: nextCorrectCount,
    history: [...state.history, historyItem],
    isRevealed: false,
  };
}
