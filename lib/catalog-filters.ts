import type { SongTrack } from './game-rules';

export interface ArtistChoice { id: string; name: string; genre?: string; }

export function normalizeArtist(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function matchesArtist(song: Pick<SongTrack, 'artist' | 'artistId'>, artist: string, artistId?: string): boolean {
  if (artistId && /^\d+$/.test(artistId) && song.artistId !== undefined) return String(song.artistId) === artistId;
  return normalizeArtist(song.artist) === normalizeArtist(artist);
}

export function artistOnlyTracks(tracks: SongTrack[], artist: string, artistId?: string): SongTrack[] {
  return tracks.filter(track => matchesArtist(track, artist, artistId));
}
