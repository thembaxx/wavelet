import type { SongTrack } from './game-rules';

export type MusicGameUse = 'solo' | 'multiplayer';
export type LicensedProvider = 'direct' | 'songclip' | 'feed-clips' | 'partner';

export interface TrackPlaybackRights {
  /** Contract identifier, not proof of licensing. Keep signed agreement outside the repository. */
  licenseId: string;
  provider: LicensedProvider;
  allowedUses: MusicGameUse[];
  /** ISO 3166-1 alpha-2 codes or "*" only for explicitly worldwide-cleared tracks. */
  territories: string[];
  validFrom?: string;
  expiresAt: string;
  /** Expiry of a temporary signed clip URL, if different from the agreement expiry. */
  playbackExpiresAt?: string;
  maxClipSeconds: number;
  /** A partner with mandatory usage reports must be configured before tracks can be served. */
  usageReportingRequired?: boolean;
}

export type LicensedTrack = SongTrack & { rights: TrackPlaybackRights };
const PROVIDERS = new Set<LicensedProvider>(['direct', 'songclip', 'feed-clips', 'partner']);
const USES = new Set<MusicGameUse>(['solo', 'multiplayer']);

function isHttpsClip(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || /^https:\/\/[^/?#]*@/.test(url.href) || url.port) return false;
    const host = url.hostname.toLowerCase();
    // These are promotional or embedding endpoints; their URLs are not a trivia licence.
    return !(host === 'itunes.apple.com' || host.endsWith('.itunes.apple.com') ||
      host === 'mzstatic.com' || host.endsWith('.mzstatic.com') ||
      host === 'spotify.com' || host.endsWith('.spotify.com') ||
      host === 'youtube.com' || host.endsWith('.youtube.com') ||
      host === 'googlevideo.com' || host.endsWith('.googlevideo.com'));
  } catch { return false; }
}
const dateMs = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? Date.parse(value) : NaN;

export function isLicensedTrack(value: unknown): value is LicensedTrack {
  if (!value || typeof value !== 'object') return false;
  const track = value as Partial<LicensedTrack>;
  const rights = track.rights;
  return Boolean(
    typeof track.id === 'string' && track.id.length > 0 &&
    typeof track.title === 'string' && track.title.length > 0 &&
    typeof track.artist === 'string' && track.artist.length > 0 &&
    typeof track.album === 'string' && typeof track.decade === 'string' &&
    typeof track.genre === 'string' && Number.isInteger(track.releaseYear) &&
    typeof track.artworkUrl === 'string' && isHttpsClip(track.previewUrl) &&
    rights && typeof rights.licenseId === 'string' && rights.licenseId.trim().length > 0 &&
    PROVIDERS.has(rights.provider) && Array.isArray(rights.allowedUses) &&
    rights.allowedUses.length > 0 && rights.allowedUses.every(item => USES.has(item)) &&
    Array.isArray(rights.territories) && rights.territories.length > 0 &&
    rights.territories.every(item => item === '*' || /^[A-Z]{2}$/.test(item)) &&
    Number.isFinite(dateMs(rights.expiresAt)) &&
    (!rights.validFrom || Number.isFinite(dateMs(rights.validFrom))) &&
    (!rights.playbackExpiresAt || Number.isFinite(dateMs(rights.playbackExpiresAt))) &&
    Number.isInteger(rights.maxClipSeconds) && rights.maxClipSeconds >= 1 &&
    rights.maxClipSeconds <= 30 &&
    (rights.usageReportingRequired === undefined || typeof rights.usageReportingRequired === 'boolean')
  );
}

export function canPlayLicensedTrack(
  track: unknown,
  use: MusicGameUse,
  durationSeconds: number,
  country?: string | null,
  now = Date.now(),
  minimumValidityMs = 0,
): track is LicensedTrack {
  if (!isLicensedTrack(track) || !USES.has(use)) return false;
  const r = track.rights;
  if (!r.allowedUses.includes(use) || durationSeconds < 1 || durationSeconds > r.maxClipSeconds) return false;
  if (!r.territories.includes('*') && !(country && r.territories.includes(country.toUpperCase()))) return false;
  if (r.validFrom && dateMs(r.validFrom) > now) return false;
  const requiredUntil = now + Math.ceil(durationSeconds * 1000) + minimumValidityMs;
  return dateMs(r.expiresAt) > requiredUntil &&
    (!r.playbackExpiresAt || dateMs(r.playbackExpiresAt) > requiredUntil);
}
