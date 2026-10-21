import { NextRequest, NextResponse } from 'next/server';
import { getLicensedCatalog } from '@/lib/licensed-catalog';
import { matchesArtist } from '@/lib/catalog-filters';

/** Only authorized clips are permitted in gameplay. iTunes previews stay metadata-only. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const use = params.get('usage') === 'multiplayer' ? 'multiplayer' : 'solo';
  const requestedDuration = Number(params.get('duration') ?? 5);
  const durationSeconds = Number.isFinite(requestedDuration) && requestedDuration > 0 && requestedDuration <= 30
    ? requestedDuration : 5;
  const count = Number(params.get('limit') ?? 50);
  const limit = Number.isFinite(count) ? Math.max(1, Math.min(50, Math.floor(count))) : 50;
  const artist = (params.get('artist') || '').trim().slice(0, 100);
  const artistId = params.get('artistId') || '';
  const term = (params.get('term') || '').trim().toLowerCase().slice(0, 100);
  // In multiplayer a single Worker cannot assert every participant's location.
  const country = use === 'solo' ? request.headers.get('x-vercel-ip-country') : null;
  const validity = use === 'multiplayer' ? 10 * (20 + 4.5) * 1000 : 0;
  let tracks = await getLicensedCatalog({ use, durationSeconds, country, minimumValidityMs: validity });
  if (artist) tracks = tracks.filter(track => matchesArtist(track, artist, artistId));
  else if (term && term !== 'all' && !term.includes(' hits') && !term.includes(' music')) {
    const matching = tracks.filter(track => [track.title, track.artist, track.album, track.genre, track.decade, String(track.releaseYear)].some(value => value.toLowerCase().includes(term)));
    if (matching.length) tracks = matching;
  }
  return NextResponse.json(
    { tracks: tracks.slice(0, limit), source: 'licensed-catalog', country, licensingRequired: tracks.length === 0 },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } },
  );
}
