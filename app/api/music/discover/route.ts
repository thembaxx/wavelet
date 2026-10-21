import { NextRequest, NextResponse } from 'next/server';
/** Metadata discovery only; third-party previews are not granted game-use rights. */
import { CURATED_REAL_SONGS } from '@/lib/music-catalog';
import { type SongTrack } from '@/lib/game-rules';
import { artistOnlyTracks, normalizeArtist } from '@/lib/catalog-filters';

interface ItunesResult {
  artistId?: number;
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

function getDecadeFromYear(year: number): string {
  if (year >= 2020) return '2020s';
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '1990s';
  return '1980s';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get('term') || 'top hits pop dance r&b';
  const requestedLimit = Number(searchParams.get('limit') || 30);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.floor(requestedLimit), 50)) : 30;
  const artist = searchParams.get('artist')?.trim().slice(0, 100) || '';
  const artistId = searchParams.get('artistId') || '';
  const isArtistCrate = Boolean(artist);

  try {
    const query = new URLSearchParams({ media: 'music', entity: 'song', limit: String(isArtistCrate ? 200 : limit), term: artist || term });
    if (isArtistCrate) query.set('attribute', 'artistTerm');
    const url = isArtistCrate && /^\d{1,14}$/.test(artistId)
      ? `https://itunes.apple.com/lookup?id=${artistId}&entity=song&limit=200`
      : `https://itunes.apple.com/search?${query}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`iTunes API status ${response.status}`);
    }

    const data = (await response.json()) as { results?: ItunesResult[] };
    const rawResults = data.results || [];

    const seenTitles = new Set<string>();
    const tracks: SongTrack[] = [];

    for (const item of rawResults) {
      if (!item.trackName || !item.artistName) continue;
      const dedupeKey = `${normalizeArtist(item.trackName)}::${normalizeArtist(item.artistName)}`;
      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);

      const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2020;
      const validYear = Number.isNaN(year) ? 2020 : year;
      const hiResArt = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '600x600bb')
        : '';

      const query = encodeURIComponent(`${item.trackName} ${item.artistName}`);

      tracks.push({
        id: `itunes-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        artistId: item.artistId,
        album: item.collectionName || item.trackName,
        releaseYear: validYear,
        decade: getDecadeFromYear(validYear),
        genre: item.primaryGenreName || 'Pop',
        previewUrl: '',
        artworkUrl: hiResArt,
        appleMusicUrl: item.trackViewUrl || `https://music.apple.com/us/search?term=${query}`,
        spotifyUrl: `https://open.spotify.com/search/${query}`,
        source: 'itunes',
      });
    }

    if (isArtistCrate) {
      return NextResponse.json({ tracks: artistOnlyTracks(tracks, artist, artistId).slice(0, limit), source: 'artist-metadata-only', artist });
    }
    if (tracks.length >= 4) {
      return NextResponse.json({ tracks, source: 'itunes-metadata-only' });
    }
  } catch {
    // Fallback to curated real song catalog if offline or rate-limited
  }

  return NextResponse.json({
    tracks: isArtistCrate ? artistOnlyTracks(CURATED_REAL_SONGS, artist, artistId).slice(0, limit) : CURATED_REAL_SONGS,
    source: isArtistCrate ? 'artist-curated-fallback' : 'curated-fallback',
    ...(isArtistCrate ? { artist } : {}),
  });
}
