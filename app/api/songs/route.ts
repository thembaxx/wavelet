import { NextRequest, NextResponse } from 'next/server';
import { freeGameCatalog } from '@/lib/cleared-catalog';
import { normalizeArtist } from '@/lib/catalog-filters';

// Only approved original compositions. Do not use Apple/Spotify previews as a
// substitute: a free app does not grant the right to stream their recordings.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requested = Number(searchParams.get('limit') || 30);
  const limit = Number.isFinite(requested) ? Math.min(50, Math.max(1, Math.floor(requested))) : 30;
  const artist = (searchParams.get('artist') || '').trim().slice(0, 100);
  const term = (searchParams.get('term') || 'All').trim().slice(0, 100);
  const pool = freeGameCatalog();
  const tracks = pool.filter(track => {
    if (artist) return normalizeArtist(track.artist) === normalizeArtist(artist);
    if (!term || normalizeArtist(term) === 'all') return true;
    return [track.title, track.artist, track.genre, track.decade, track.album]
      .some(value => normalizeArtist(value).includes(normalizeArtist(term)));
  }).slice(0, limit);

  return NextResponse.json({
    tracks, source: 'wavelet-original', ...(artist ? { artist } : {}),
    rightsNotice: 'Original, procedurally rendered Wavelet demo compositions. No commercial chart-music previews.',
  }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
}
