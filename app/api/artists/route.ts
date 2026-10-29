import { NextRequest, NextResponse } from "next/server";
import { FREE_GAME_TRACKS } from "@/lib/cleared-catalog";
import { normalizeArtist } from "@/lib/catalog-filters";
import { searchPreviewArtists } from "@/lib/itunes-catalog";

export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get("term") || "").trim().slice(0, 100);
  if (term.length < 2) return NextResponse.json({ artists: [], source: "wavelet-original" });
  if (!normalizeArtist(term).startsWith("wavelet")) {
    try {
      return NextResponse.json(
        { artists: await searchPreviewArtists(term), source: "itunes" },
        { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" } },
      );
    } catch {
      return NextResponse.json(
        { artists: [], error: "Artist search unavailable" },
        { status: 502 },
      );
    }
  }
  const names = [...new Set(FREE_GAME_TRACKS.map((track) => track.artist))];
  const artists = names
    .filter((name) => normalizeArtist(name).includes(normalizeArtist(term)))
    .map((name) => ({ id: "original:" + name, name, genre: "Original studio project" }));
  return NextResponse.json({ artists, source: "wavelet-original" });
}
