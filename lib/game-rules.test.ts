import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoundPoints,
  deriveSongMood,
  buildStreamingLinks,
  buildQuizOptions,
  filterAndSelectSongs,
  advanceRoundState,
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

test('calculateRoundPoints rewards shorter snippets and higher streaks', () => {
  const fast1s = calculateRoundPoints({
    correct: true,
    snippetSeconds: 1,
    streak: 2,
    timeRemainingRatio: 1,
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
  assert.equal(fast1s.multiplier, 1.5);
});

test('deriveSongMood maps genres and artists to distinct color/rhythm profiles', () => {
  const daftMood = deriveSongMood(SAMPLE_SONGS[0]);
  const tylaMood = deriveSongMood(SAMPLE_SONGS[1]);
  const szaMood = deriveSongMood(SAMPLE_SONGS[2]);

  assert.equal(daftMood.id, 'neon-synth');
  assert.equal(tylaMood.id, 'afro-pulse');
  assert.equal(szaMood.id, 'velvet-rnb');
});

test('buildQuizOptions returns 4 unique options containing the target song', () => {
  const options = buildQuizOptions(SAMPLE_SONGS[0], SAMPLE_SONGS, 3);
  assert.equal(options.length, 4);
  assert.ok(options.some((o) => o.id === 'track-1'));
  const uniqueIds = new Set(options.map((o) => o.id));
  assert.equal(uniqueIds.size, 4);
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
