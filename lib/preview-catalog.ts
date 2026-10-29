import type { SongTrack } from "./game-rules.ts";
import { isFreeGameTrack } from "./cleared-catalog.ts";
import { normalizeArtist } from "./catalog-filters.ts";

/** Only stream Apple's preview CDN; never accept arbitrary media URLs. */
export function isApplePreviewUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "audio-ssl.itunes.apple.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.startsWith("/itunes-assets/AudioPreview") &&
      url.pathname.endsWith(".m4a")
    );
  } catch {
    return false;
  }
}

export function isPlayableTrack(track: SongTrack): boolean {
  return (
    isFreeGameTrack(track) ||
    (track.source === "itunes" &&
      /^itunes:\d+$/.test(track.id) &&
      !!track.title &&
      !!track.artist &&
      Number.isInteger(track.releaseYear) &&
      isApplePreviewUrl(track.previewUrl))
  );
}

function appleStoreUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["music.apple.com", "itunes.apple.com"].includes(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** Convert provider metadata without claiming a license or accepting missing previews. */
export function previewTracks(results: unknown[]): SongTrack[] {
  const seen = new Set<string>();
  const tracks: SongTrack[] = [];
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    const row = result as Record<string, unknown>;
    if (
      row.kind !== "song" ||
      !Number.isSafeInteger(row.trackId) ||
      typeof row.trackName !== "string" ||
      !row.trackName.trim() ||
      typeof row.artistName !== "string" ||
      !row.artistName.trim() ||
      typeof row.previewUrl !== "string" ||
      !isApplePreviewUrl(row.previewUrl) ||
      typeof row.releaseDate !== "string"
    )
      continue;
    const releaseYear = new Date(row.releaseDate).getUTCFullYear();
    if (!Number.isInteger(releaseYear) || releaseYear < 1900 || releaseYear > 2100) continue;
    const key = normalizeArtist(row.artistName) + ":" + normalizeArtist(row.trackName);
    if (seen.has(key)) continue;
    seen.add(key);
    tracks.push({
      id: `itunes:${row.trackId}`,
      title: row.trackName.trim(),
      artist: row.artistName.trim(),
      ...(Number.isSafeInteger(row.artistId) ? { artistId: row.artistId as number } : {}),
      album: typeof row.collectionName === "string" ? row.collectionName : "",
      releaseYear,
      decade: `${Math.floor(releaseYear / 10) * 10}s`,
      genre: typeof row.primaryGenreName === "string" ? row.primaryGenreName : "Music",
      previewUrl: row.previewUrl,
      artworkUrl:
        typeof row.artworkUrl100 === "string" &&
        /^https:\/\/[^/]+\.mzstatic\.com\//.test(row.artworkUrl100)
          ? row.artworkUrl100
          : "",
      appleMusicUrl: appleStoreUrl(row.trackViewUrl),
      source: "itunes",
    });
  }
  return tracks;
}
