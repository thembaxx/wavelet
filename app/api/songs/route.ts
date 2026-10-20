import { NextRequest, NextResponse } from 'next/server';
import { CURATED_REAL_SONGS } from '@/lib/music-catalog';
import { type SongTrack } from '@/lib/game-rules';

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  previewUrl?: string;
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
  const limit = Math.min(Number(searchParams.get('limit') || 30), 50);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `https://itunes.apple.com/search?media=music&entity=song&limit=${limit}&term=${encodeURIComponent(term)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`iTunes API status ${response.status}`);
    }

    const data = (await response.json()) as { results?: ItunesResult[] };
    const rawResults = data.results || [];

    const seenTitles = new Set<string>();
    const tracks: SongTrack[] = [];

    for (const item of rawResults) {
      if (!item.trackName || !item.artistName || !item.previewUrl) continue;
      const dedupeKey = `${item.trackName.toLowerCase()}::${item.artistName.toLowerCase()}`;
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
        album: item.collectionName || item.trackName,
        releaseYear: validYear,
        decade: getDecadeFromYear(validYear),
        genre: item.primaryGenreName || 'Pop',
        previewUrl: item.previewUrl,
        artworkUrl: hiResArt,
        appleMusicUrl: item.trackViewUrl || `https://music.apple.com/us/search?term=${query}`,
        spotifyUrl: `https://open.spotify.com/search/${query}`,
        source: 'itunes',
      });
    }

    if (tracks.length >= 4) {
      return NextResponse.json({ tracks, source: 'itunes-live' });
    }
  } catch {
    // Fallback to curated real song catalog if offline or rate-limited
  }

  return NextResponse.json({
    tracks: CURATED_REAL_SONGS,
    source: 'curated-fallback',
  });
}
