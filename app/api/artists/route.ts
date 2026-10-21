import { NextRequest, NextResponse } from 'next/server';
import { FREE_GAME_TRACKS } from '@/lib/cleared-catalog';
import { normalizeArtist } from '@/lib/catalog-filters';

export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get('term') || '').trim().slice(0, 100);
  if (term.length < 2) return NextResponse.json({ artists: [], source: 'wavelet-original' });
  const names = [...new Set(FREE_GAME_TRACKS.map(track => track.artist))];
  const artists = names.filter(name => normalizeArtist(name).includes(normalizeArtist(term)))
    .map(name => ({ id: 'original:' + name, name, genre: 'Original studio project' }));
  return NextResponse.json({ artists, source: 'wavelet-original' });
}
