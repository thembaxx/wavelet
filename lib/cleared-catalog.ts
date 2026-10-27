import type { SongTrack } from "./game-rules";

// These are original, algorithmically rendered Wavelet demo compositions.
// No third-party recording or public-domain claim is required to play them.
// A future licensed provider must be reviewed separately before being enabled.
export interface OriginalGroove {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  melody: readonly number[];
  wave: "sine" | "triangle" | "sawtooth" | "square";
}

const GROOVES: readonly OriginalGroove[] = [
  {
    id: "neon-drift",
    title: "Neon Drift",
    artist: "Wavelet / Circuit",
    genre: "Electronic",
    bpm: 122,
    wave: "sawtooth",
    melody: [57, 60, 64, 67, 64, 60, 59, 55],
  },
  {
    id: "glass-sky",
    title: "Glass Sky",
    artist: "Wavelet / Circuit",
    genre: "Electronic",
    bpm: 116,
    wave: "triangle",
    melody: [69, 72, 76, 72, 67, 69, 64, 67],
  },
  {
    id: "static-heart",
    title: "Static Heart",
    artist: "Wavelet / Circuit",
    genre: "Electronic",
    bpm: 130,
    wave: "square",
    melody: [52, 59, 64, 59, 55, 62, 67, 62],
  },
  {
    id: "midnight-pixel",
    title: "Midnight Pixel",
    artist: "Wavelet / Circuit",
    genre: "Electronic",
    bpm: 128,
    wave: "sawtooth",
    melody: [64, 62, 59, 62, 71, 69, 67, 64],
  },
  {
    id: "golden-hour",
    title: "Golden Hour",
    artist: "Wavelet / Sol",
    genre: "Pop",
    bpm: 108,
    wave: "triangle",
    melody: [60, 64, 67, 72, 71, 67, 64, 62],
  },
  {
    id: "paper-planes",
    title: "Paper Planes",
    artist: "Wavelet / Sol",
    genre: "Pop",
    bpm: 112,
    wave: "sine",
    melody: [65, 69, 72, 69, 67, 65, 62, 60],
  },
  {
    id: "horizon-line",
    title: "Horizon Line",
    artist: "Wavelet / Sol",
    genre: "Pop",
    bpm: 105,
    wave: "triangle",
    melody: [62, 66, 69, 74, 69, 66, 64, 62],
  },
  {
    id: "satellite-smile",
    title: "Satellite Smile",
    artist: "Wavelet / Sol",
    genre: "Pop",
    bpm: 118,
    wave: "square",
    melody: [67, 71, 74, 71, 69, 67, 64, 67],
  },
  {
    id: "velvet-radio",
    title: "Velvet Radio",
    artist: "Wavelet / Velvet",
    genre: "R&B/Soul",
    bpm: 84,
    wave: "sine",
    melody: [55, 59, 62, 64, 62, 59, 57, 55],
  },
  {
    id: "after-rain",
    title: "After Rain",
    artist: "Wavelet / Velvet",
    genre: "R&B/Soul",
    bpm: 90,
    wave: "triangle",
    melody: [57, 60, 64, 69, 67, 64, 60, 57],
  },
  {
    id: "quiet-signals",
    title: "Quiet Signals",
    artist: "Wavelet / Velvet",
    genre: "R&B/Soul",
    bpm: 78,
    wave: "sine",
    melody: [64, 67, 71, 74, 71, 67, 66, 62],
  },
  {
    id: "late-train",
    title: "Late Train",
    artist: "Wavelet / Velvet",
    genre: "R&B/Soul",
    bpm: 92,
    wave: "triangle",
    melody: [62, 65, 69, 72, 69, 65, 64, 60],
  },
  {
    id: "city-steps",
    title: "City Steps",
    artist: "Wavelet / Breaker",
    genre: "Hip-Hop/Rap",
    bpm: 94,
    wave: "square",
    melody: [48, 48, 55, 53, 48, 60, 55, 53],
  },
  {
    id: "side-street",
    title: "Side Street",
    artist: "Wavelet / Breaker",
    genre: "Hip-Hop/Rap",
    bpm: 98,
    wave: "sawtooth",
    melody: [50, 57, 53, 50, 60, 57, 53, 48],
  },
  {
    id: "low-key",
    title: "Low Key",
    artist: "Wavelet / Breaker",
    genre: "Hip-Hop/Rap",
    bpm: 88,
    wave: "square",
    melody: [52, 52, 59, 55, 52, 62, 59, 55],
  },
  {
    id: "backbeat",
    title: "Backbeat",
    artist: "Wavelet / Breaker",
    genre: "Hip-Hop/Rap",
    bpm: 100,
    wave: "triangle",
    melody: [53, 60, 58, 53, 65, 60, 58, 55],
  },
  {
    id: "sunset-taxi",
    title: "Sunset Taxi",
    artist: "Wavelet / Coast",
    genre: "Afrobeats",
    bpm: 106,
    wave: "sine",
    melody: [60, 67, 64, 69, 67, 62, 64, 60],
  },
  {
    id: "palm-shadow",
    title: "Palm Shadow",
    artist: "Wavelet / Coast",
    genre: "Afrobeats",
    bpm: 110,
    wave: "triangle",
    melody: [62, 69, 66, 71, 69, 64, 66, 62],
  },
  {
    id: "warm-pavement",
    title: "Warm Pavement",
    artist: "Wavelet / Coast",
    genre: "Afrobeats",
    bpm: 113,
    wave: "sine",
    melody: [57, 64, 60, 67, 64, 59, 60, 57],
  },
  {
    id: "daybreak-ride",
    title: "Daybreak Ride",
    artist: "Wavelet / Coast",
    genre: "Afrobeats",
    bpm: 114,
    wave: "triangle",
    melody: [65, 72, 69, 74, 72, 67, 69, 65],
  },
  {
    id: "forest-light",
    title: "Forest Light",
    artist: "Wavelet / Echo",
    genre: "Alternative",
    bpm: 105,
    wave: "sawtooth",
    melody: [55, 62, 65, 62, 60, 57, 55, 53],
  },
  {
    id: "paper-moon",
    title: "Paper Moon",
    artist: "Wavelet / Echo",
    genre: "Alternative",
    bpm: 109,
    wave: "triangle",
    melody: [59, 62, 67, 64, 62, 59, 57, 55],
  },
  {
    id: "open-window",
    title: "Open Window",
    artist: "Wavelet / Echo",
    genre: "Alternative",
    bpm: 118,
    wave: "square",
    melody: [64, 67, 72, 69, 67, 64, 62, 60],
  },
  {
    id: "wildflower",
    title: "Wildflower",
    artist: "Wavelet / Echo",
    genre: "Alternative",
    bpm: 112,
    wave: "sawtooth",
    melody: [57, 64, 69, 65, 64, 60, 57, 55],
  },
];

export const ORIGINAL_GROOVES = GROOVES;
export const FREE_GAME_TRACKS: SongTrack[] = GROOVES.map((groove) => ({
  id: groove.id,
  title: groove.title,
  artist: groove.artist,
  album: "Wavelet Original Grooves",
  releaseYear: 2026,
  decade: "2020s",
  genre: groove.genre,
  previewUrl: "wavelet-original:" + groove.id,
  artworkUrl: "",
  bpm: groove.bpm,
  source: "original",
  rights: {
    provider: "wavelet-original",
    recording: "original-synthesis",
    composition: "original",
    gameUse: true,
    territories: ["*"],
    attribution: "Original procedural demo music created for Wavelet",
    evidence: "docs/MUSIC_RIGHTS.md",
  },
}));

const GROOVE_BY_URL = new Map(GROOVES.map((groove) => ["wavelet-original:" + groove.id, groove]));
const TRACK_BY_ID = new Map(FREE_GAME_TRACKS.map((track) => [track.id, track]));

// Strict allowlist: metadata from remote APIs, OAuth sessions or an old PWA
// cache can never authorize arbitrary previews merely by adding rights fields.
export function getOriginalGroove(previewUrl: string): OriginalGroove | undefined {
  return GROOVE_BY_URL.get(previewUrl);
}

export function isFreeGameTrack(track: SongTrack): boolean {
  const canonical = TRACK_BY_ID.get(track.id);
  return (
    !!canonical &&
    track.source === "original" &&
    track.previewUrl === canonical.previewUrl &&
    track.title === canonical.title &&
    track.artist === canonical.artist &&
    track.genre === canonical.genre &&
    track.releaseYear === canonical.releaseYear &&
    track.rights?.provider === "wavelet-original" &&
    track.rights?.gameUse === true &&
    track.rights?.territories?.includes("*") === true
  );
}

export function freeGameCatalog(): SongTrack[] {
  return FREE_GAME_TRACKS.map((track) => ({
    ...track,
    rights: { ...track.rights!, territories: [...track.rights!.territories] },
  }));
}
