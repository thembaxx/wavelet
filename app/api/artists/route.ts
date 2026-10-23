import { NextRequest, NextResponse } from "next/server";
import { ARTIST_PRESETS } from "@/lib/music-catalog";
import { normalizeArtist, type ArtistChoice } from "@/lib/catalog-filters";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("term")?.trim().slice(0, 100) || "";
  if (term.length < 2) return NextResponse.json({ artists: [] });
  try {
    const query = new URLSearchParams({
      term,
      entity: "musicArtist",
      attribute: "artistTerm",
      limit: "12",
    });
    const response = await fetch(`https://itunes.apple.com/search?${query}`, {
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("Catalog unavailable");
    const data = (await response.json()) as {
      results?: Array<{ artistId: number; artistName: string; primaryGenreName?: string }>;
    };
    const artists: ArtistChoice[] = (data.results || [])
      .filter((item) => item.artistId && item.artistName)
      .map((item) => ({
        id: String(item.artistId),
        name: item.artistName,
        genre: item.primaryGenreName,
      }));
    return NextResponse.json({ artists, source: "catalog" });
  } catch {
    return NextResponse.json({
      artists: ARTIST_PRESETS.filter((artist) =>
        normalizeArtist(artist.label).includes(normalizeArtist(term)),
      ).map((artist) => ({ id: `curated:${artist.id}`, name: artist.label, genre: artist.genre })),
      source: "curated",
    });
  }
}
