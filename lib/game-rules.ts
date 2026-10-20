export type SnippetDuration = 1 | 3 | 5 | 10 | 15 | 30;

export type FilterMode = 'genre' | 'artist' | 'year' | 'account';

export type PlayMode = 'party-30s' | 'quiz-4choice';

export type ThemeMode = 'light' | 'dark';

export type MascotCharacterId = 'pebble' | 'bobacat' | 'sprout';

export interface MascotCharacterProfile {
  id: MascotCharacterId;
  name: string;
  tagline: string;
  avatarImg: string;
  accentColor: string;
}

export const MASCOT_CHARACTERS: MascotCharacterProfile[] = [
  {
    id: 'pebble',
    name: 'Pebble',
    tagline: 'Peanut Cozy & Scooter Groove',
    avatarImg: '/assets/aistudio/IMG_5611_8f13d014.jpeg',
    accentColor: '#E06D85',
  },
  {
    id: 'bobacat',
    name: 'BobaCat',
    tagline: 'Blue Beanie Bass Kitty',
    avatarImg: '/assets/aistudio/IMG_5644_58cdf86c.jpeg',
    accentColor: '#5C8EC2',
  },
  {
    id: 'sprout',
    name: 'Sprout',
    tagline: 'Sage Bucket Sunshine',
    avatarImg: '/assets/aistudio/IMG_5583_ad7fd435.jpeg',
    accentColor: '#4E946B',
  },
];

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
  bgLightHex: string;
  bpm: number;
  energy: number; // 0.3 to 1.0
}

export interface SongTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseYear: number;
  decade: string;
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

// ============================================================================
// GAMIFICATION: TIERS, QUESTS, BADGES & POWER-UPS
// ============================================================================

export interface VinylTierInfo {
  level: number;
  name: string;
  minXp: number;
  nextTierXp: number;
  progressRatio: number;
  xpToNext: number;
  badgeHex: string;
}

export interface DailyQuest {
  id: 'speed-demon' | 'streak-master' | 'crate-explorer';
  title: string;
  description: string;
  rewardXp: number;
  progress: number;
  target: number;
  completed: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface PlayerProgressionState {
  xp: number;
  coins: number;
  totalCorrect: number;
  totalGamesPlayed: number;
  highestStreakEver: number;
  fastestSnippetGuessed: number;
  unlockedBadges: string[];
  quests: DailyQuest[];
}

export const VINYL_TIERS = [
  { level: 1, name: 'Crate Digger', minXp: 0, nextXp: 600, badgeHex: '#68A378' },
  { level: 2, name: 'Blue Tier Selector', minXp: 600, nextXp: 1500, badgeHex: '#38BDF8' },
  { level: 3, name: 'Sage Groove DJ', minXp: 1500, nextXp: 3000, badgeHex: '#4E946B' },
  { level: 4, name: 'Amber Platter Pro', minXp: 3000, nextXp: 5500, badgeHex: '#F59E0B' },
  { level: 5, name: 'Rose Gold Maestro', minXp: 5500, nextXp: 9000, badgeHex: '#E06D85' },
  { level: 6, name: 'Infinite Skies Legend', minXp: 9000, nextXp: 15000, badgeHex: '#2DD4BF' },
] as const;

export function calculateVinylTier(xp: number): VinylTierInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  let active: (typeof VINYL_TIERS)[number] = VINYL_TIERS[0];
  for (const tier of VINYL_TIERS) {
    if (safeXp >= tier.minXp) {
      active = tier;
    }
  }
  const span = Math.max(1, active.nextXp - active.minXp);
  const intoTier = Math.max(0, safeXp - active.minXp);
  const progressRatio = Math.min(1, intoTier / span);
  const xpToNext = Math.max(0, active.nextXp - safeXp);

  return {
    level: active.level,
    name: active.name,
    minXp: active.minXp,
    nextTierXp: active.nextXp,
    progressRatio,
    xpToNext,
    badgeHex: active.badgeHex,
  };
}

export function createInitialProgression(): PlayerProgressionState {
  return {
    xp: 650, // Starts in Blue Tier Selector (like IMG_5843!) so player sees live progress immediately
    coins: 150,
    totalCorrect: 3,
    totalGamesPlayed: 1,
    highestStreakEver: 2,
    fastestSnippetGuessed: 5,
    unlockedBadges: ['first-spin'],
    quests: [
      {
        id: 'speed-demon',
        title: '1s–3s Speed Ear',
        description: 'Guess a track on 1s or 3s snippet length',
        rewardXp: 350,
        progress: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'streak-master',
        title: 'Fever Combo 3x',
        description: 'Hit a 3x correct song streak in any set',
        rewardXp: 250,
        progress: 0,
        target: 3,
        completed: false,
      },
      {
        id: 'crate-explorer',
        title: 'Set Finisher',
        description: 'Complete 5 song rounds across sessions',
        rewardXp: 500,
        progress: 1,
        target: 5,
        completed: false,
      },
    ],
  };
}

export const ALL_BADGES: Array<{ id: string; title: string; description: string }> = [
  {
    id: 'first-spin',
    title: 'First Needle Drop',
    description: 'Start your first 3D vinyl quiz session',
  },
  {
    id: 'speed-prodigy',
    title: '1-Second Prodigy',
    description: 'Nail a song with a 1s or 3s snippet',
  },
  {
    id: 'fever-streak',
    title: 'Fever Groove 3x',
    description: 'Ignite Fever Mode with 3 right in a row',
  },
  {
    id: 'perfect-set',
    title: 'Flawless Ear',
    description: 'Score 100% accuracy on a full song set',
  },
  {
    id: 'crate-curator',
    title: 'Crate Curator',
    description: 'Save a track to Spotify or Apple Music',
  },
  {
    id: 'high-roller',
    title: '2,000 XP Club',
    description: 'Reach 2,000 total Groove XP',
  },
];

export function updateProgressionAfterRound(
  prev: PlayerProgressionState,
  outcome: {
    correct: boolean;
    pointsEarned: number;
    snippetSeconds: SnippetDuration;
    newStreak: number;
    isSetComplete: boolean;
    setPerfect?: boolean;
  }
): {
  next: PlayerProgressionState;
  xpGained: number;
  coinsGained: number;
  newlyCompletedQuests: DailyQuest[];
} {
  let xpGained = outcome.correct ? Math.round(outcome.pointsEarned * 0.65) + 40 : 15;
  const coinsGained = outcome.correct ? 25 + outcome.newStreak * 10 : 5;
  const newlyCompletedQuests: DailyQuest[] = [];

  const updatedQuests = prev.quests.map((q) => {
    if (q.completed) return q;
    let nextProgress = q.progress;
    if (q.id === 'speed-demon' && outcome.correct && outcome.snippetSeconds <= 3) {
      nextProgress = q.target;
    } else if (q.id === 'streak-master') {
      nextProgress = Math.max(q.progress, Math.min(q.target, outcome.newStreak));
    } else if (q.id === 'crate-explorer') {
      nextProgress = Math.min(q.target, q.progress + 1);
    }
    const nowCompleted = nextProgress >= q.target;
    if (nowCompleted && !q.completed) {
      xpGained += q.rewardXp;
      newlyCompletedQuests.push({ ...q, progress: nextProgress, completed: true });
    }
    return {
      ...q,
      progress: nextProgress,
      completed: nowCompleted,
    };
  });

  const nextXp = prev.xp + xpGained;
  const badgeSet = new Set(prev.unlockedBadges);
  badgeSet.add('first-spin');
  if (outcome.correct && outcome.snippetSeconds <= 3) {
    badgeSet.add('speed-prodigy');
  }
  if (outcome.newStreak >= 3) {
    badgeSet.add('fever-streak');
  }
  if (outcome.isSetComplete && outcome.setPerfect) {
    badgeSet.add('perfect-set');
  }
  if (nextXp >= 2000) {
    badgeSet.add('high-roller');
  }

  const next: PlayerProgressionState = {
    xp: nextXp,
    coins: prev.coins + coinsGained,
    totalCorrect: prev.totalCorrect + (outcome.correct ? 1 : 0),
    totalGamesPlayed: prev.totalGamesPlayed + (outcome.isSetComplete ? 1 : 0),
    highestStreakEver: Math.max(prev.highestStreakEver, outcome.newStreak),
    fastestSnippetGuessed: outcome.correct
      ? Math.min(prev.fastestSnippetGuessed, outcome.snippetSeconds)
      : prev.fastestSnippetGuessed,
    unlockedBadges: Array.from(badgeSet),
    quests: updatedQuests,
  };

  return { next, xpGained, coinsGained, newlyCompletedQuests };
}

// ============================================================================
// REDESIGNED THEME & MOOD PALETTES (Matcha/Oat Daylight & Aero-Cyan Dark Glass)
// ============================================================================

export const MOOD_PROFILES: Record<MoodId, SongMoodProfile> = {
  'euphoric-pop': {
    id: 'euphoric-pop',
    label: 'Matcha & Rose Pop',
    primaryHex: '#4E946B',
    secondaryHex: '#E06D85',
    accentHex: '#38BDF8',
    bgDarkHex: '#07131E',
    bgLightHex: '#F4F1EA',
    bpm: 122,
    energy: 0.88,
  },
  'velvet-rnb': {
    id: 'velvet-rnb',
    label: 'Velvet Indigo & Honey',
    primaryHex: '#5C8EC2',
    secondaryHex: '#8B72BE',
    accentHex: '#E59A42',
    bgDarkHex: '#081523',
    bgLightHex: '#F3F1ED',
    bpm: 96,
    energy: 0.65,
  },
  'neon-synth': {
    id: 'neon-synth',
    label: 'Aero Cyan French Touch',
    primaryHex: '#28A9C9',
    secondaryHex: '#4E946B',
    accentHex: '#E06D85',
    bgDarkHex: '#061520',
    bgLightHex: '#EEF4F3',
    bpm: 126,
    energy: 0.94,
  },
  'golden-hiphop': {
    id: 'golden-hiphop',
    label: 'Peanut Gold Boom-Bap',
    primaryHex: '#D98A3C',
    secondaryHex: '#4E946B',
    accentHex: '#5C8EC2',
    bgDarkHex: '#10151C',
    bgLightHex: '#F7F2E8',
    bpm: 92,
    energy: 0.78,
  },
  'afro-pulse': {
    id: 'afro-pulse',
    label: 'Sage & Terracotta Groove',
    primaryHex: '#45936B',
    secondaryHex: '#D98A3C',
    accentHex: '#28A9C9',
    bgDarkHex: '#071717',
    bgLightHex: '#F0F5EE',
    bpm: 113,
    energy: 0.85,
  },
  'indie-amber': {
    id: 'indie-amber',
    label: 'Warm Rose & Vinyl Oat',
    primaryHex: '#DF6C83',
    secondaryHex: '#5C8EC2',
    accentHex: '#D98A3C',
    bgDarkHex: '#0D131F',
    bgLightHex: '#F7F1EE',
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
  doubleBoost?: boolean;
}): { points: number; multiplier: number; speedBonus: number; isFever: boolean } {
  if (!params.correct) {
    return { points: 0, multiplier: 1, speedBonus: 0, isFever: false };
  }

  const base = BASE_POINTS_BY_DURATION[params.snippetSeconds] ?? 150;
  const clampedStreak = Math.max(0, Math.min(params.streak, 6));
  const isFever = clampedStreak >= 2; // 3rd correct answer in a row triggers Fever!
  const feverBonus = isFever ? 0.25 : 0;
  const multiplier = Number((1 + clampedStreak * 0.25 + feverBonus).toFixed(2));
  const clampedRatio = Math.max(0, Math.min(params.timeRemainingRatio ?? 0.5, 1));
  const speedBonus = Math.round(base * 0.3 * clampedRatio);
  const rawPoints = Math.round(base * multiplier + speedBonus);
  const points = params.doubleBoost ? rawPoints * 2 : rawPoints;

  return { points, multiplier, speedBonus, isFever };
}

/**
 * Derives a visual & rhythmic mood profile from a song's genre, artist, and era.
 */
export function deriveSongMood(
  song: Pick<SongTrack, 'genre' | 'releaseYear' | 'title' | 'artist' | 'bpm'>
): SongMoodProfile {
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
export function buildStreamingLinks(
  song: Pick<SongTrack, 'title' | 'artist' | 'appleMusicUrl' | 'spotifyUrl'>
): {
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
  const distractors = pool.filter(
    (t) => t.id !== target.id && t.title.toLowerCase() !== target.title.toLowerCase()
  );
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
    doubleBoost?: boolean;
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
    doubleBoost: outcome.doubleBoost,
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
