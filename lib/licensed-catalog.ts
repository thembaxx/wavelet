import manifest from '@/data/licensed-tracks.json';
import { canPlayLicensedTrack, isLicensedTrack, type LicensedTrack, type MusicGameUse } from '@/lib/music-rights';

/** Contract-backed catalogue only. Search metadata is not evidence of playback rights. */
export async function getLicensedCatalog(args: {
  use: MusicGameUse;
  durationSeconds: number;
  country?: string | null;
  minimumValidityMs?: number;
}): Promise<LicensedTrack[]> {
  const candidates: unknown[] = [...manifest.tracks];
  const feedUrl = process.env.WAVELET_LICENSED_CATALOG_URL;
  if (feedUrl) {
    try {
      const url = new URL(feedUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Invalid licensed feed URL');
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (process.env.WAVELET_LICENSED_CATALOG_TOKEN) {
        headers.Authorization = 'Bearer ' + process.env.WAVELET_LICENSED_CATALOG_TOKEN;
      }
      const response = await fetch(url.toString(), {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error('Licensed feed failed');
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { tracks?: unknown }).tracks)) {
        throw new Error('Invalid licensed feed');
      }
      candidates.push(...(payload as { tracks: unknown[] }).tracks.slice(0, 500));
    } catch {
      // Fail closed for unavailable partners. Never recover via iTunes promotional preview URLs.
    }
  }
  const unique = new Map<string, LicensedTrack>();
  for (const candidate of candidates) {
    if (!isLicensedTrack(candidate)) continue;
    // Partner-mandated reporting is not implemented without an agreed provider protocol.
    if (candidate.rights.usageReportingRequired) continue;
    if (!canPlayLicensedTrack(candidate, args.use, args.durationSeconds, args.country, Date.now(), args.minimumValidityMs ?? 0)) continue;
    unique.set(candidate.id, candidate);
  }
  return [...unique.values()];
}
