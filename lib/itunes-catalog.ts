import type { ArtistChoice } from "./catalog-filters.ts";
import { artistOnlyTracks } from "./catalog-filters.ts";
import { previewTracks } from "./preview-catalog.ts";

// A mixed starting crate: pop, R&B, hip-hop, electronic, Afrobeats and alternative.
const MIX_ARTISTS = "159260351,479756766,368183298,5468295,591899010,471744";
const GENRE_MATCHERS: Record<string, RegExp> = {
  Pop: /pop/i,
  "R&B/Soul": /r&b|soul/i,
  "Hip-Hop/Rap": /hip.hop|rap/i,
  Electronic: /electronic|dance|house|techno|trance/i,
  Afrobeats: /afro|amapiano|african/i,
  Alternative: /alternative|indie/i,
};

async function requestCatalog(path: "search" | "lookup", params: Record<string, string>) {
  const url = new URL(path, "https://itunes.apple.com/");
  url.search = new URLSearchParams({ country: "ZA", media: "music", ...params }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Music preview search is unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !Array.isArray((data as { results?: unknown }).results))
    throw new Error("Invalid music preview response");
  return (data as { results: unknown[] }).results;
}

export async function searchPreviewSongs(term: string, artist: string, artistId?: string) {
  const exactId = artistId && /^\d{1,16}$/.test(artistId) ? artistId : undefined;
  const results =
    !artist && (!term || term === "All")
      ? await requestCatalog("lookup", { id: MIX_ARTISTS, entity: "song", limit: "8" })
      : exactId
        ? await requestCatalog("lookup", { id: exactId, entity: "song", limit: "50" })
        : await requestCatalog("search", {
            term: artist || term,
            entity: "song",
            limit: "200",
            ...(artist ? { attribute: "artistTerm" } : {}),
          });
  const tracks = previewTracks(results);
  if (artist) return artistOnlyTracks(tracks, artist, exactId);
  const genre = Object.hasOwn(GENRE_MATCHERS, term) ? GENRE_MATCHERS[term] : undefined;
  return genre ? tracks.filter((track) => genre.test(track.genre)) : tracks;
}

export async function searchPreviewArtists(term: string): Promise<ArtistChoice[]> {
  const results = await requestCatalog("search", {
    term,
    entity: "musicArtist",
    attribute: "artistTerm",
    limit: "20",
  });
  const artists = new Map<string, ArtistChoice>();
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    const row = result as Record<string, unknown>;
    if (
      row.wrapperType !== "artist" ||
      !Number.isSafeInteger(row.artistId) ||
      typeof row.artistName !== "string" ||
      !row.artistName.trim()
    )
      continue;
    const id = String(row.artistId);
    artists.set(id, {
      id,
      name: row.artistName,
      genre: typeof row.primaryGenreName === "string" ? row.primaryGenreName : "Artist",
    });
  }
  return [...artists.values()];
}
