import { FREE_GAME_TRACKS } from "./cleared-catalog";

export const GENRE_PRESETS = [
  { id: "All", label: "Commercial Mix", query: "All" },
  { id: "Pop", label: "Pop Grooves", query: "Pop" },
  { id: "R&B/Soul", label: "Velvet R&B", query: "R&B/Soul" },
  { id: "Hip-Hop/Rap", label: "Hip-Hop Beats", query: "Hip-Hop/Rap" },
  { id: "Electronic", label: "Electronic Nights", query: "Electronic" },
  { id: "Afrobeats", label: "Afrobeats Rhythm", query: "Afrobeats" },
  { id: "Alternative", label: "Indie & Alt", query: "Alternative" },
  { id: "Originals", label: "Offline originals", query: "All" },
] as const;

// New compositions were created in 2026; do not falsely describe them as old hits.
export const YEAR_PRESETS = [{ id: "2020s", label: "2020s Originals", query: "2020s" }] as const;
export const ARTIST_PRESETS = [
  { id: "159260351", label: "Taylor Swift", genre: "Pop" },
  { id: "479756766", label: "The Weeknd", genre: "R&B/Soul" },
  { id: "5468295", label: "Daft Punk", genre: "Electronic" },
  { id: "591899010", label: "Burna Boy", genre: "Afrobeats" },
  { id: "368183298", label: "Kendrick Lamar", genre: "Hip-Hop/Rap" },
  { id: "471744", label: "Coldplay", genre: "Alternative" },
];

// Kept as a compatibility export for existing solo/PWA consumers; no chart music
// or third-party promotional preview URLs are included.
export const CURATED_REAL_SONGS = FREE_GAME_TRACKS;
