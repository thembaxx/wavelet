export type SnippetDuration = 1 | 3 | 5 | 10 | 15 | 30;

export type FilterMode = 'genre' | 'artist' | 'year' | 'account';

export type PlayMode = 'party-30s' | 'quiz-4choice';

export type GuessChallengeMode = 'track' | 'artist' | 'genre' | 'year';

export type DifficultyTier = 'chill' | 'club' | 'master';

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
    tagline: 'Peanut Cozy · Scooter Groove',
    avatarImg: '/assets/aistudio/IMG_5611_8f13d014.jpeg',
    accentColor: '#309F92',
  },
  {
    id: 'bobacat',
    name: 'BobaCat',
    tagline: 'Blue Beanie · Bass Kitty',
    avatarImg: '/assets/aistudio/IMG_5644_58cdf86c.jpeg',
    accentColor: '#4F5BD5',
  },
  {
    id: 'sprout',
    name: 'Sprout',
    tagline: 'Sage Bucket · Sunshine',
    avatarImg: '/assets/aistudio/IMG_5583_ad7fd435.jpeg',
    accentColor: '#E8734A',
  },
];

export interface ChallengeModeDefinition {
  id: GuessChallengeMode;
  badgeCode: string;
  title: string;
  shortLabel: string;
  subtitle: string;
  promptLabel: string;
  shapeType: 'squircle' | 'arch' | 'circle' | 'pill';
}

export const GAME_CHALLENGE_MODES: ChallengeModeDefinition[] = [
  {
    id: 'track',
    badgeCode: 'MODE 01',
    title: 'Track ID',
    shortLabel: 'Track',
    subtitle: 'Identify the exact song title from the snippet',
    promptLabel: 'Which track is spinning on the platter?',
    shapeType: 'squircle',
  },
  {
    id: 'artist',
    badgeCode: 'MODE 02',
    title: 'Artist Call',
    shortLabel: 'Artist',
    subtitle: 'Guess the recording artist behind the groove',
    promptLabel: 'Which artist recorded this track?',
    shapeType: 'arch',
  },
  {
    id: 'genre',
    badgeCode: 'MODE 03',
    title: 'Sonic Genre',
    shortLabel: 'Genre',
    subtitle: 'Pinpoint the musical genre & rhythm style',
    promptLabel: 'Which genre defines this sonic blueprint?',
    shapeType: 'circle',
  },
  {
    id: 'year',
    badgeCode: 'MODE 04',
    title: 'Time Capsule',
    shortLabel: 'Year',
    subtitle: 'Lock in the exact release year & era',
    promptLabel: 'What year was this record released?',
    shapeType: 'pill',
  },
];

export interface DifficultyTierDefinition {
  id: DifficultyTier;
  label: string;
  shortLabel: string;
  multiplier: number;
  recommendedSnippet: SnippetDuration;
  description: string;
  cluePolicy: string;
}

export const DIFFICULTY_TIERS: DifficultyTierDefinition[] = [
  {
    id: 'chill',
    label: 'Chill · Warmup',
    shortLabel: 'Chill',
    multiplier: 1.0,
    recommendedSnippet: 10,
    description: 'Wide distractors · Era & BPM context clues · 1.0x score',
    cluePolicy: 'Full era & tempo clues shown',
  },
  {
    id: 'club',
    label: 'Club · Selector',
    shortLabel: 'Club',
    multiplier: 1.35,
    recommendedSnippet: 5,
    description: 'Era-matched distractors · 5s standard cut · 1.35x score',
    cluePolicy: 'Subtle tempo hint only',
  },
  {
    id: 'master',
    label: 'Master · Needle Pro',
    shortLabel: 'Master',
    multiplier: 1.85,
    recommendedSnippet: 3,
    description: 'Tight ±1–2yr / same-genre distractors · Adaptive streak · 1.85x score',
    cluePolicy: 'Zero hints · Pure ear test',
  },
];

export interface ChallengeOption {
  id: string;
  primaryText: string;
  secondaryText: string;
  isCorrect: boolean;
  trackRef?: SongTrack;
}

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
  energy: number;
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
  challengeMode?: GuessChallengeMode;
  difficulty?: DifficultyTier;
}

export interface RoundHistoryItem {
  roundIndex: number;
  song: SongTrack;
  correct: boolean;
  pointsEarned: number;
  snippetDuration: SnippetDuration;
  streakAfter: number;
  challengeMode?: GuessChallengeMode;
  difficulty?: DifficultyTier;
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
// GAMIFICATION & USER PROFILE: TIERS, QUESTS, BADGES & PER-MODE STATS
// ============================================================================

export interface VinylTierInfo {
  level: number;
  name: string;
  grade: string;
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

export interface ModePerformanceStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  bestScore: number;
  bestStreak: number;
}

export interface PlayerProgressionState {
  callsign: string;
  tagline: string;
  mascotId: MascotCharacterId;
  xp: number;
  coins: number;
  overallScore: number;
  bestSetScore: number;
  totalCorrect: number;
  totalWins: number;
  totalLosses: number;
  totalGamesPlayed: number;
  highestStreakEver: number;
  fastestSnippetGuessed: number;
  unlockedBadges: string[];
  quests: DailyQuest[];
  modeStats: Record<GuessChallengeMode, ModePerformanceStats>;
}

export const VINYL_TIERS = [
  { level: 1, name: 'Crate Digger', grade: 'Grade C', minXp: 0, nextXp: 600, badgeHex: '#309F92' },
  { level: 2, name: 'Blue Tier Selector', grade: 'Grade B', minXp: 600, nextXp: 1500, badgeHex: '#309F92' },
  { level: 3, name: 'Teal Groove Architect', grade: 'Grade A', minXp: 1500, nextXp: 3000, badgeHex: '#309F92' },
  { level: 4, name: 'Lime Platter Pro', grade: 'Grade A+', minXp: 3000, nextXp: 5500, badgeHex: '#000000' },
  { level: 5, name: 'Cobalt Studio Master', grade: 'Grade S', minXp: 5500, nextXp: 9000, badgeHex: '#4F5BD5' },
  { level: 6, name: 'Wavelet Legend', grade: 'Grade S+', minXp: 9000, nextXp: 15000, badgeHex: '#309F92' },
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
    grade: active.grade,
    minXp: active.minXp,
    nextTierXp: active.nextXp,
    progressRatio,
    xpToNext,
    badgeHex: active.badgeHex,
  };
}

export function calculateWinLossRatio(wins: number, losses: number): {
  winRatePercent: number;
  ratioFormatted: string;
  totalRounds: number;
} {
  const safeWins = Math.max(0, Math.floor(wins));
  const safeLosses = Math.max(0, Math.floor(losses));
  const totalRounds = safeWins + safeLosses;
  const winRatePercent = totalRounds > 0 ? Math.round((safeWins / totalRounds) * 100) : 0;
  const ratioFormatted =
    safeLosses === 0
      ? safeWins > 0
        ? `${safeWins}.0 W/L`
        : '0.0 W/L'
      : `${(safeWins / safeLosses).toFixed(2)} W/L`;

  return { winRatePercent, ratioFormatted, totalRounds };
}

export function createInitialProgression(): PlayerProgressionState {
  return {
    callsign: 'Studio Selector',
    tagline: 'Wavelet selector · Always listening',
    mascotId: 'pebble',
    xp: 650,
    coins: 150,
    overallScore: 840,
    bestSetScore: 840,
    totalCorrect: 3,
    totalWins: 3,
    totalLosses: 1,
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
    modeStats: {
      track: {
        wins: 3,
        losses: 1,
        gamesPlayed: 1,
        bestScore: 840,
        bestStreak: 2,
      },
      artist: {
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        bestScore: 0,
        bestStreak: 0,
      },
      genre: {
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        bestScore: 0,
        bestStreak: 0,
      },
      year: {
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        bestScore: 0,
        bestStreak: 0,
      },
    },
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
  {
    id: 'multi-mode-specialist',
    title: 'Quad Mode Specialist',
    description: 'Win a round in Track, Artist, Genre, and Year modes',
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
    challengeMode?: GuessChallengeMode;
    setTotalScore?: number;
  }
): {
  next: PlayerProgressionState;
  xpGained: number;
  coinsGained: number;
  newlyCompletedQuests: DailyQuest[];
} {
  const activeMode: GuessChallengeMode = outcome.challengeMode || 'track';
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

  const prevModeStats = prev.modeStats || createInitialProgression().modeStats;
  const currentModeRecord = prevModeStats[activeMode] || {
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    bestScore: 0,
    bestStreak: 0,
  };

  const nextSetScoreCandidate =
    outcome.setTotalScore !== undefined
      ? outcome.setTotalScore
      : currentModeRecord.bestScore + outcome.pointsEarned;

  const updatedModeRecord: ModePerformanceStats = {
    wins: currentModeRecord.wins + (outcome.correct ? 1 : 0),
    losses: currentModeRecord.losses + (outcome.correct ? 0 : 1),
    gamesPlayed: currentModeRecord.gamesPlayed + (outcome.isSetComplete ? 1 : 0),
    bestScore: Math.max(
      currentModeRecord.bestScore,
      outcome.isSetComplete ? nextSetScoreCandidate : outcome.pointsEarned
    ),
    bestStreak: Math.max(currentModeRecord.bestStreak, outcome.newStreak),
  };

  const nextModeStats: Record<GuessChallengeMode, ModePerformanceStats> = {
    ...prevModeStats,
    [activeMode]: updatedModeRecord,
  };

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
  if (
    nextModeStats.track.wins > 0 &&
    nextModeStats.artist.wins > 0 &&
    nextModeStats.genre.wins > 0 &&
    nextModeStats.year.wins > 0
  ) {
    badgeSet.add('multi-mode-specialist');
  }

  const nextOverallScore = (prev.overallScore || 0) + outcome.pointsEarned;
  const nextBestSetScore = Math.max(
    prev.bestSetScore || 0,
    outcome.setTotalScore ?? outcome.pointsEarned,
    updatedModeRecord.bestScore
  );

  const next: PlayerProgressionState = {
    callsign: prev.callsign || 'Studio Selector',
    tagline: prev.tagline || 'Wavelet selector · Always listening',
    mascotId: prev.mascotId || 'pebble',
    xp: nextXp,
    coins: prev.coins + coinsGained,
    overallScore: nextOverallScore,
    bestSetScore: nextBestSetScore,
    totalCorrect: prev.totalCorrect + (outcome.correct ? 1 : 0),
    totalWins: (prev.totalWins ?? prev.totalCorrect) + (outcome.correct ? 1 : 0),
    totalLosses: (prev.totalLosses ?? 0) + (outcome.correct ? 0 : 1),
    totalGamesPlayed: prev.totalGamesPlayed + (outcome.isSetComplete ? 1 : 0),
    highestStreakEver: Math.max(prev.highestStreakEver, outcome.newStreak),
    fastestSnippetGuessed: outcome.correct
      ? Math.min(prev.fastestSnippetGuessed, outcome.snippetSeconds)
      : prev.fastestSnippetGuessed,
    unlockedBadges: Array.from(badgeSet).slice(0, 20),
    quests: updatedQuests,
    modeStats: nextModeStats,
  };

  return { next, xpGained, coinsGained, newlyCompletedQuests };
}

// ============================================================================
// EDITORIAL PALETTE SYSTEM (Inspired directly by IMG_5845, IMG_5847, IMG_5813)
// #000000 · #D1D1D1 · #F1F1F1 · #FFFFFF · #309F92 · #EDFF8C
// ============================================================================

export const MOOD_PROFILES: Record<MoodId, SongMoodProfile> = {
  'euphoric-pop': {
    id: 'euphoric-pop',
    label: 'Teal & Acid Lime Pop',
    primaryHex: '#309F92',
    secondaryHex: '#EDFF8C',
    accentHex: '#FF7A59',
    bgDarkHex: '#0B0F12',
    bgLightHex: '#F1F1F1',
    bpm: 122,
    energy: 0.88,
  },
  'velvet-rnb': {
    id: 'velvet-rnb',
    label: 'Cobalt & Warm Blush R&B',
    primaryHex: '#4F5BD5',
    secondaryHex: '#309F92',
    accentHex: '#EDFF8C',
    bgDarkHex: '#0B0D14',
    bgLightHex: '#F2F1F4',
    bpm: 96,
    energy: 0.65,
  },
  'neon-synth': {
    id: 'neon-synth',
    label: 'Studio Teal & Chartreuse',
    primaryHex: '#309F92',
    secondaryHex: '#4F5BD5',
    accentHex: '#EDFF8C',
    bgDarkHex: '#091012',
    bgLightHex: '#EEF2F1',
    bpm: 126,
    energy: 0.94,
  },
  'golden-hiphop': {
    id: 'golden-hiphop',
    label: 'Warm Amber & Lime Beat',
    primaryHex: '#E07A47',
    secondaryHex: '#309F92',
    accentHex: '#EDFF8C',
    bgDarkHex: '#100E0C',
    bgLightHex: '#F4F2ED',
    bpm: 92,
    energy: 0.78,
  },
  'afro-pulse': {
    id: 'afro-pulse',
    label: 'Seafoam & Sunburst Rhythm',
    primaryHex: '#309F92',
    secondaryHex: '#E07A47',
    accentHex: '#EDFF8C',
    bgDarkHex: '#0A1110',
    bgLightHex: '#F0F3F0',
    bpm: 113,
    energy: 0.85,
  },
  'indie-amber': {
    id: 'indie-amber',
    label: 'Coral Starburst & Cream',
    primaryHex: '#E86F52',
    secondaryHex: '#4F5BD5',
    accentHex: '#309F92',
    bgDarkHex: '#110D10',
    bgLightHex: '#F4F1EF',
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

const DIFFICULTY_MULTIPLIERS: Record<DifficultyTier, number> = {
  chill: 1.0,
  club: 1.35,
  master: 1.85,
};

/**
 * Returns the effective difficulty tier, scaling up by 1 tier when the player is on a 3x+ Fever streak.
 */
export function getEffectiveDifficulty(
  baseDifficulty: DifficultyTier = 'club',
  streak = 0
): { effectiveTier: DifficultyTier; isScaledUp: boolean; multiplier: number } {
  if (streak >= 3) {
    if (baseDifficulty === 'chill') {
      return { effectiveTier: 'club', isScaledUp: true, multiplier: DIFFICULTY_MULTIPLIERS.club };
    }
    if (baseDifficulty === 'club') {
      return {
        effectiveTier: 'master',
        isScaledUp: true,
        multiplier: DIFFICULTY_MULTIPLIERS.master,
      };
    }
  }
  return {
    effectiveTier: baseDifficulty,
    isScaledUp: false,
    multiplier: DIFFICULTY_MULTIPLIERS[baseDifficulty] ?? 1.0,
  };
}

/**
 * Calculates points awarded for a song guess based on snippet duration, streak, difficulty, and remaining time ratio.
 */
export function calculateRoundPoints(params: {
  correct: boolean;
  snippetSeconds: SnippetDuration;
  streak: number;
  timeRemainingRatio?: number;
  doubleBoost?: boolean;
  difficulty?: DifficultyTier;
}): {
  points: number;
  multiplier: number;
  speedBonus: number;
  isFever: boolean;
  difficultyMultiplier: number;
} {
  if (!params.correct) {
    return {
      points: 0,
      multiplier: 1,
      speedBonus: 0,
      isFever: false,
      difficultyMultiplier: 1,
    };
  }

  const base = BASE_POINTS_BY_DURATION[params.snippetSeconds] ?? 150;
  const clampedStreak = Math.max(0, Math.min(params.streak, 6));
  const isFever = clampedStreak >= 2;
  const feverBonus = isFever ? 0.25 : 0;
  const difficultyMultiplier = params.difficulty
    ? DIFFICULTY_MULTIPLIERS[params.difficulty] ?? 1
    : 1;
  const multiplier = Number(
    ((1 + clampedStreak * 0.25 + feverBonus) * difficultyMultiplier).toFixed(2)
  );
  const clampedRatio = Math.max(0, Math.min(params.timeRemainingRatio ?? 0.5, 1));
  const speedBonus = Math.round(base * 0.3 * clampedRatio);
  const rawPoints = Math.round(base * multiplier + speedBonus);
  const points = params.doubleBoost ? rawPoints * 2 : rawPoints;

  return { points, multiplier, speedBonus, isFever, difficultyMultiplier };
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
 * Deterministically builds 4 multiple-choice SongTrack options including the target song.
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

const CANONICAL_GENRES = [
  { genre: 'Pop', styleHint: 'Hooks · Vocal Polish · Synth-Pop' },
  { genre: 'R&B/Soul', styleHint: 'Velvet Chords · Neo-Soul Groove' },
  { genre: 'Hip-Hop/Rap', styleHint: '808 Drums · Lyrical Cadence' },
  { genre: 'Afrobeats', styleHint: 'Log Drum · Syncopated shakers' },
  { genre: 'Electronic', styleHint: 'Four-on-the-Floor · Analog Synth' },
  { genre: 'Alternative', styleHint: 'Fuzz Bass · Psychedelic Indie' },
  { genre: 'Funk/Disco', styleHint: 'Slap Bass · Brass Section' },
  { genre: 'Rock', styleHint: 'Overdriven Guitars · Live Kit' },
];

/**
 * Generates 4 mode-specific multiple-choice options for Track, Artist, Genre, or Release Year
 * with difficulty-scaled distractor proximity and context clues.
 */
export function buildModeChallengeOptions(params: {
  target: SongTrack;
  pool: SongTrack[];
  challengeMode: GuessChallengeMode;
  difficulty?: DifficultyTier;
  streak?: number;
  seed?: number;
}): ChallengeOption[] {
  const { target, pool, challengeMode, seed = 1 } = params;
  const { effectiveTier } = getEffectiveDifficulty(params.difficulty || 'club', params.streak || 0);

  // 1. TRACK MODE
  if (challengeMode === 'track') {
    const candidates = pool.filter(
      (t) => t.id !== target.id && t.title.toLowerCase() !== target.title.toLowerCase()
    );
    // On Master/Club, prioritize distractors from the same genre or decade
    const sortedCandidates = [...candidates].sort((a, b) => {
      const aMatch =
        (a.genre === target.genre ? 2 : 0) + (a.decade === target.decade ? 1 : 0);
      const bMatch =
        (b.genre === target.genre ? 2 : 0) + (b.decade === target.decade ? 1 : 0);
      return effectiveTier === 'chill' ? aMatch - bMatch : bMatch - aMatch;
    });

    const picked: SongTrack[] = [target];
    let idx = Math.abs(seed);
    while (picked.length < 4 && sortedCandidates.length > 0) {
      const windowSize =
        effectiveTier === 'master'
          ? Math.min(5, sortedCandidates.length)
          : sortedCandidates.length;
      const pickIndex = idx % Math.max(1, windowSize);
      const item = sortedCandidates.splice(pickIndex, 1)[0];
      if (item) picked.push(item);
      idx += 5;
    }

    const options: ChallengeOption[] = picked.map((song) => ({
      id: `track-${song.id}`,
      primaryText: song.title,
      secondaryText:
        effectiveTier === 'chill'
          ? `${song.artist} · ${song.genre} · ${song.releaseYear}`
          : effectiveTier === 'club'
            ? `${song.artist} · ${song.decade}`
            : song.artist,
      isCorrect: song.id === target.id,
      trackRef: song,
    }));

    const rotateBy = Math.abs(seed + target.title.length) % options.length;
    return [...options.slice(rotateBy), ...options.slice(0, rotateBy)];
  }

  // 2. ARTIST MODE
  if (challengeMode === 'artist') {
    const seenArtists = new Set<string>([target.artist.toLowerCase()]);
    const artistPool = pool.filter((t) => {
      const key = t.artist.toLowerCase();
      if (seenArtists.has(key)) return false;
      seenArtists.add(key);
      return true;
    });

    const sortedArtists = [...artistPool].sort((a, b) => {
      const aScore =
        (a.genre === target.genre ? 2 : 0) + (a.decade === target.decade ? 1 : 0);
      const bScore =
        (b.genre === target.genre ? 2 : 0) + (b.decade === target.decade ? 1 : 0);
      return effectiveTier === 'chill' ? aScore - bScore : bScore - aScore;
    });

    const pickedTracks: SongTrack[] = [target];
    let idx = Math.abs(seed);
    while (pickedTracks.length < 4 && sortedArtists.length > 0) {
      const windowSize =
        effectiveTier === 'master'
          ? Math.min(4, sortedArtists.length)
          : sortedArtists.length;
      const pickIndex = idx % Math.max(1, windowSize);
      const candidate = sortedArtists.splice(pickIndex, 1)[0];
      if (candidate) pickedTracks.push(candidate);
      idx += 3;
    }

    const options: ChallengeOption[] = pickedTracks.map((song) => ({
      id: `artist-${song.id}`,
      primaryText: song.artist,
      secondaryText:
        effectiveTier === 'chill'
          ? `${song.genre} · ${song.decade} Recording Artist`
          : effectiveTier === 'club'
            ? `${song.decade} Catalog`
            : 'Studio Recording Artist',
      isCorrect: song.artist.toLowerCase() === target.artist.toLowerCase(),
      trackRef: song,
    }));

    const rotateBy = Math.abs(seed + target.artist.length) % options.length;
    return [...options.slice(rotateBy), ...options.slice(0, rotateBy)];
  }

  // 3. GENRE MODE
  if (challengeMode === 'genre') {
    const targetGenre = target.genre || 'Pop';
    const targetEntry = CANONICAL_GENRES.find(
      (g) => g.genre.toLowerCase() === targetGenre.toLowerCase()
    ) || {
      genre: targetGenre,
      styleHint: 'Studio Rhythm & Production',
    };

    const otherGenres = CANONICAL_GENRES.filter(
      (g) => g.genre.toLowerCase() !== targetGenre.toLowerCase()
    );

    const pickedGenres = [targetEntry];
    let idx = Math.abs(seed + target.releaseYear);
    while (pickedGenres.length < 4 && otherGenres.length > 0) {
      const pickIndex = idx % otherGenres.length;
      const candidate = otherGenres.splice(pickIndex, 1)[0];
      if (candidate) pickedGenres.push(candidate);
      idx += 3;
    }

    const options: ChallengeOption[] = pickedGenres.map((g, i) => ({
      id: `genre-${g.genre}-${i}`,
      primaryText: g.genre,
      secondaryText:
        effectiveTier === 'chill'
          ? g.styleHint
          : effectiveTier === 'club'
            ? 'Primary Sonic Classification'
            : 'Studio Genre Blueprint',
      isCorrect: g.genre.toLowerCase() === targetGenre.toLowerCase(),
    }));

    const rotateBy = Math.abs(seed + targetGenre.length) % options.length;
    return [...options.slice(rotateBy), ...options.slice(0, rotateBy)];
  }

  // 4. YEAR MODE
  const targetYear = target.releaseYear || 2020;
  const currentYear = 2026;
  const offsetsByDifficulty: Record<DifficultyTier, number[]> = {
    chill: [-8, -4, 4, 7, -11, 6],
    club: [-4, -2, 2, 4, -5, 3],
    master: [-2, -1, 1, 2, -3, 3],
  };
  const offsets = offsetsByDifficulty[effectiveTier] || offsetsByDifficulty.club;
  const yearsSet = new Set<number>([targetYear]);

  let offsetIdx = Math.abs(seed) % offsets.length;
  for (let step = 0; step < offsets.length && yearsSet.size < 4; step++) {
    const delta = offsets[(offsetIdx + step) % offsets.length];
    const candidateYear = Math.min(currentYear, Math.max(1970, targetYear + delta));
    if (!yearsSet.has(candidateYear)) {
      yearsSet.add(candidateYear);
    }
  }
  let fallbackStep = 1;
  while (yearsSet.size < 4) {
    const candidate = Math.min(currentYear, Math.max(1970, targetYear - fallbackStep));
    yearsSet.add(candidate);
    if (yearsSet.size < 4) {
      yearsSet.add(Math.min(currentYear, targetYear + fallbackStep));
    }
    fallbackStep++;
  }

  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
  return sortedYears.map((yr) => {
    const decadeLabel = `${Math.floor(yr / 10) * 10}s`;
    return {
      id: `year-${yr}`,
      primaryText: String(yr),
      secondaryText:
        effectiveTier === 'chill'
          ? `${decadeLabel} Era · ${yr < 2000 ? 'Classic Pressing' : 'Modern Pressing'}`
          : effectiveTier === 'club'
            ? `${decadeLabel} Release Window`
            : 'Original Pressing Year',
      isCorrect: yr === targetYear,
    };
  });
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
    difficulty: state.config.difficulty,
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
    challengeMode: state.config.challengeMode || 'track',
    difficulty: state.config.difficulty || 'club',
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
