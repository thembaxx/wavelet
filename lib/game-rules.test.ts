import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoundPoints,
  deriveSongMood,
  buildStreamingLinks,
  buildQuizOptions,
  buildModeChallengeOptions,
  getEffectiveDifficulty,
  calculateWinLossRatio,
  filterAndSelectSongs,
  advanceRoundState,
  calculateVinylTier,
  createInitialProgression,
  updateProgressionAfterRound,
  type SongTrack,
  type GameSessionState,
} from './game-rules.ts';

const SAMPLE_SONGS: SongTrack[] = [
  {
    id: 'track-1',
    title: 'One More Time',
    artist: 'Daft Punk',
    album: 'Discovery',
    releaseYear: 2001,
    decade: '2000s',
    genre: 'Electronic',
    previewUrl: 'https://example.com/1.m4a',
    artworkUrl: 'https://example.com/1.jpg',
    bpm: 123,
  },
  {
    id: 'track-2',
    title: 'Water',
    artist: 'Tyla',
    album: 'TYLA',
    releaseYear: 2023,
    decade: '2020s',
    genre: 'Afrobeats',
    previewUrl: 'https://example.com/2.m4a',
    artworkUrl: 'https://example.com/2.jpg',
    bpm: 117,
  },
  {
    id: 'track-3',
    title: 'Kill Bill',
    artist: 'SZA',
    album: 'SOS',
    releaseYear: 2022,
    decade: '2020s',
    genre: 'R&B/Soul',
    previewUrl: 'https://example.com/3.m4a',
    artworkUrl: 'https://example.com/3.jpg',
    bpm: 89,
  },
  {
    id: 'track-4',
    title: 'Ms. Jackson',
    artist: 'Outkast',
    album: 'Stankonia',
    releaseYear: 2000,
    decade: '2000s',
    genre: 'Hip-Hop/Rap',
    previewUrl: 'https://example.com/4.m4a',
    artworkUrl: 'https://example.com/4.jpg',
    bpm: 95,
  },
  {
    id: 'track-5',
    title: 'The Less I Know The Better',
    artist: 'Tame Impala',
    album: 'Currents',
    releaseYear: 2015,
    decade: '2010s',
    genre: 'Alternative',
    previewUrl: 'https://example.com/5.m4a',
    artworkUrl: 'https://example.com/5.jpg',
    bpm: 117,
  },
];

test('calculateRoundPoints rewards shorter snippets, fever streaks, difficulty tiers, and 2x boost', () => {
  const fast1s = calculateRoundPoints({
    correct: true,
    snippetSeconds: 1,
    streak: 2,
    timeRemainingRatio: 1,
  });
  const master1s = calculateRoundPoints({
    correct: true,
    snippetSeconds: 1,
    streak: 2,
    timeRemainingRatio: 1,
    difficulty: 'master',
  });
  const boosted1s = calculateRoundPoints({
    correct: true,
    snippetSeconds: 1,
    streak: 2,
    timeRemainingRatio: 1,
    doubleBoost: true,
  });
  const slow30s = calculateRoundPoints({
    correct: true,
    snippetSeconds: 30,
    streak: 0,
    timeRemainingRatio: 0.2,
  });
  const wrong = calculateRoundPoints({
    correct: false,
    snippetSeconds: 1,
    streak: 4,
    timeRemainingRatio: 1,
  });

  assert.equal(wrong.points, 0);
  assert.ok(fast1s.points > slow30s.points, '1s snippet with streak should score higher than 30s');
  assert.ok(master1s.points > fast1s.points, 'Master difficulty should scale points higher');
  assert.equal(fast1s.isFever, true);
  assert.equal(boosted1s.points, fast1s.points * 2);
});

test('deriveSongMood maps genres and artists to distinct color/rhythm profiles', () => {
  const daftMood = deriveSongMood(SAMPLE_SONGS[0]);
  const tylaMood = deriveSongMood(SAMPLE_SONGS[1]);
  const szaMood = deriveSongMood(SAMPLE_SONGS[2]);

  assert.equal(daftMood.id, 'neon-synth');
  assert.equal(tylaMood.id, 'afro-pulse');
  assert.equal(szaMood.id, 'velvet-rnb');
});

test('buildQuizOptions and buildModeChallengeOptions generate 4 options for Track, Artist, Genre, and Year modes', () => {
  const options = buildQuizOptions(SAMPLE_SONGS[0], SAMPLE_SONGS, 3);
  assert.equal(options.length, 4);
  assert.ok(options.some((o) => o.id === 'track-1'));

  const artistOpts = buildModeChallengeOptions({
    target: SAMPLE_SONGS[0],
    pool: SAMPLE_SONGS,
    challengeMode: 'artist',
    difficulty: 'club',
    seed: 2,
  });
  assert.equal(artistOpts.length, 4);
  assert.ok(artistOpts.some((o) => o.isCorrect && o.primaryText === 'Daft Punk'));

  const genreOpts = buildModeChallengeOptions({
    target: SAMPLE_SONGS[1],
    pool: SAMPLE_SONGS,
    challengeMode: 'genre',
    difficulty: 'chill',
    seed: 2,
  });
  assert.equal(genreOpts.length, 4);
  assert.ok(genreOpts.some((o) => o.isCorrect && o.primaryText === 'Afrobeats'));

  const yearOptsMaster = buildModeChallengeOptions({
    target: SAMPLE_SONGS[2],
    pool: SAMPLE_SONGS,
    challengeMode: 'year',
    difficulty: 'master',
    seed: 1,
  });
  assert.equal(yearOptsMaster.length, 4);
  assert.ok(yearOptsMaster.some((o) => o.isCorrect && o.primaryText === '2022'));

  const adaptive = getEffectiveDifficulty('chill', 3);
  assert.equal(adaptive.effectiveTier, 'club');
  assert.equal(adaptive.isScaledUp, true);
});

test('buildStreamingLinks produces valid Apple Music and Spotify URLs', () => {
  const links = buildStreamingLinks(SAMPLE_SONGS[0]);
  assert.ok(links.appleMusicUrl.includes('music.apple.com'));
  assert.ok(links.spotifyUrl.includes('open.spotify.com'));
});

test('filterAndSelectSongs filters by decade and supplements if needed', () => {
  const selected = filterAndSelectSongs(SAMPLE_SONGS, {
    filterMode: 'year',
    filterValue: '2020s',
    snippetDuration: 5,
    songCount: 3,
    playMode: 'party-30s',
  });
  assert.equal(selected.length, 3);
  assert.equal(selected[0].decade, '2020s');
});

test('advanceRoundState increments score, streak, and transitions to gameover on final track', () => {
  const initial: GameSessionState = {
    status: 'playing',
    config: {
      filterMode: 'genre',
      filterValue: 'All',
      snippetDuration: 5,
      songCount: 2,
      playMode: 'party-30s',
      challengeMode: 'artist',
      difficulty: 'club',
    },
    playlist: SAMPLE_SONGS.slice(0, 2),
    currentIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    history: [],
    isRevealed: true,
  };

  const afterRound1 = advanceRoundState(initial, { correct: true, timeRemainingRatio: 0.8 });
  assert.equal(afterRound1.status, 'playing');
  assert.equal(afterRound1.currentIndex, 1);
  assert.equal(afterRound1.streak, 1);
  assert.ok(afterRound1.score > 0);

  const afterRound2 = advanceRoundState(afterRound1, { correct: false });
  assert.equal(afterRound2.status, 'gameover');
  assert.equal(afterRound2.streak, 0);
  assert.equal(afterRound2.bestStreak, 1);
  assert.equal(afterRound2.history.length, 2);
});

test('calculateVinylTier and updateProgressionAfterRound award XP, coins, quests, badges, and per-mode win/loss stats', () => {
  const initial = createInitialProgression();
  const tier = calculateVinylTier(initial.xp);
  assert.equal(tier.level, 2);
  assert.equal(tier.name, 'Blue Tier Selector');

  const { next, xpGained, newlyCompletedQuests } = updateProgressionAfterRound(initial, {
    correct: true,
    pointsEarned: 500,
    snippetSeconds: 1,
    newStreak: 3,
    isSetComplete: true,
    setPerfect: true,
    challengeMode: 'artist',
    setTotalScore: 1450,
  });

  assert.ok(xpGained > 350);
  assert.ok(newlyCompletedQuests.length >= 2);
  assert.ok(next.unlockedBadges.includes('speed-prodigy'));
  assert.ok(next.unlockedBadges.includes('fever-streak'));
  assert.ok(next.unlockedBadges.includes('perfect-set'));
  assert.equal(next.modeStats.artist.wins, 1);
  assert.equal(next.modeStats.artist.bestScore, 1450);
  assert.equal(next.bestSetScore, 1450);

  const wl = calculateWinLossRatio(next.totalWins, next.totalLosses);
  assert.equal(wl.winRatePercent, 80);
});
