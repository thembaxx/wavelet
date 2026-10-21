import { FREE_GAME_TRACKS } from './cleared-catalog';

export const GENRE_PRESETS = [
  { id: 'All', label: 'Original Studio Mix', query: 'All' },
  { id: 'Pop', label: 'Pop Grooves', query: 'Pop' },
  { id: 'R&B/Soul', label: 'Velvet R&B', query: 'R&B/Soul' },
  { id: 'Hip-Hop/Rap', label: 'Hip-Hop Beats', query: 'Hip-Hop/Rap' },
  { id: 'Electronic', label: 'Electronic Nights', query: 'Electronic' },
  { id: 'Afrobeats', label: 'Afrobeats Rhythm', query: 'Afrobeats' },
  { id: 'Alternative', label: 'Indie & Alt', query: 'Alternative' },
] as const;

// New compositions were created in 2026; do not falsely describe them as old hits.
export const YEAR_PRESETS = [{ id: '2020s', label: '2020s Originals', query: '2020s' }] as const;
export const ARTIST_PRESETS = [...new Set(FREE_GAME_TRACKS.map(track => track.artist))]
  .map(name => ({ id: name, label: name, genre: 'Original studio project' }));

// Kept as a compatibility export for existing solo/PWA consumers; no chart music
// or third-party promotional preview URLs are included.
export const CURATED_REAL_SONGS = FREE_GAME_TRACKS;
