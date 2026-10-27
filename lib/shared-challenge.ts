import { freeGameCatalog, isFreeGameTrack } from "./cleared-catalog.ts";
import type { DifficultyTier, PlayMode, SnippetDuration, SongTrack } from "./game-rules.ts";

export type SharedChallengeMode = "track" | "artist" | "genre";
export type SharedChallenge = {
  v: 1;
  catalog: "original-v1";
  seed: number;
  /** Canonical original IDs in round order, never audio URLs or remote metadata. */
  trackIds: string[];
  snippet: SnippetDuration;
  mode: SharedChallengeMode;
  difficulty: DifficultyTier;
  playMode: PlayMode;
};

export type SharedChallengeInput = Omit<SharedChallenge, "v" | "catalog" | "trackIds"> & {
  pool: readonly SongTrack[];
  count?: number;
};

const MAX_TOKEN_LENGTH = 2048;
const TRACKS = freeGameCatalog();
const TRACK_IDS = new Set(TRACKS.map((track) => track.id));
const KEYS = ["v", "catalog", "seed", "trackIds", "snippet", "mode", "difficulty", "playMode"];

function validSeed(seed: unknown): seed is number {
  return typeof seed === "number" && Number.isInteger(seed) && seed >= 1 && seed <= 0xffffffff;
}

function validate(value: unknown): SharedChallenge | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (
    Object.keys(raw).length !== KEYS.length ||
    !KEYS.every((key) => Object.hasOwn(raw, key)) ||
    raw.v !== 1 ||
    raw.catalog !== "original-v1" ||
    !validSeed(raw.seed) ||
    !Array.isArray(raw.trackIds) ||
    raw.trackIds.length < 1 ||
    raw.trackIds.length > 24 ||
    !raw.trackIds.every((id) => typeof id === "string" && TRACK_IDS.has(id)) ||
    new Set(raw.trackIds).size !== raw.trackIds.length ||
    ![1, 3, 5, 10, 15, 30].includes(raw.snippet as number) ||
    !["track", "artist", "genre"].includes(raw.mode as string) ||
    !["chill", "club", "master"].includes(raw.difficulty as string) ||
    !["quiz-4choice", "party-30s"].includes(raw.playMode as string)
  )
    return null;
  return {
    v: 1,
    catalog: "original-v1",
    seed: raw.seed,
    trackIds: [...raw.trackIds],
    snippet: raw.snippet as SnippetDuration,
    mode: raw.mode as SharedChallengeMode,
    difficulty: raw.difficulty as DifficultyTier,
    playMode: raw.playMode as PlayMode,
  };
}

/** Stable Mulberry32 generator; deliberately unrelated to cryptographic randomness. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Canonical ordering makes equal pools reproduce even if fetched in a different order. */
export function createSharedChallenge(input: SharedChallengeInput): SharedChallenge {
  if (
    !validSeed(input.seed) ||
    !Array.isArray(input.pool) ||
    input.pool.length < 1 ||
    input.pool.length > 24 ||
    !input.pool.every(isFreeGameTrack)
  )
    throw new RangeError("Choose a valid seed and the original Wavelet catalogue.");
  const ids = input.pool.map((track) => track.id).sort();
  if (new Set(ids).size !== ids.length)
    throw new RangeError("Choose each original track only once.");
  const count = input.count ?? ids.length;
  if (!Number.isInteger(count) || count < 1 || count > ids.length)
    throw new RangeError("Choose between one round and the number of tracks in this crate.");
  const random = seededRandom(input.seed);
  for (let index = ids.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  const challenge = validate({
    v: 1,
    catalog: "original-v1",
    seed: input.seed,
    trackIds: ids.slice(0, count),
    snippet: input.snippet,
    mode: input.mode,
    difficulty: input.difficulty,
    playMode: input.playMode,
  });
  if (!challenge) throw new RangeError("Choose supported challenge settings.");
  return challenge;
}

export function encodeSharedChallenge(challenge: SharedChallenge): string {
  const checked = validate(challenge);
  if (!checked) throw new RangeError("This challenge cannot be shared.");
  return btoa(JSON.stringify(checked)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Fail closed on unsupported versions, catalogue IDs, extra fields or malformed tokens. */
export function decodeSharedChallenge(token: string): SharedChallenge | null {
  if (
    typeof token !== "string" ||
    token.length < 1 ||
    token.length > MAX_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token) ||
    token.length % 4 === 1
  )
    return null;
  try {
    const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const challenge = validate(JSON.parse(decoded));
    // Keep one canonical token per descriptor, rejecting ignored JSON duplicate keys too.
    return challenge && encodeSharedChallenge(challenge) === token ? challenge : null;
  } catch {
    return null;
  }
}

/** The link deliberately excludes unrelated query values and fragments from the current page. */
export function sharedChallengeUrl(challenge: SharedChallenge, baseUrl: string): string {
  const url = new URL(baseUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new RangeError("Use a public HTTP or HTTPS page for the challenge link.");
  url.search = new URLSearchParams({ challenge: encodeSharedChallenge(challenge) }).toString();
  url.hash = "";
  return url.href;
}

/** Resolves only this catalogue's canonical metadata, retaining the encoded round order. */
export function resolveSharedChallengeTracks(challenge: SharedChallenge): SongTrack[] {
  const checked = validate(challenge);
  if (!checked) throw new RangeError("This shared challenge is not supported.");
  const tracks = new Map(freeGameCatalog().map((track) => [track.id, track]));
  return checked.trackIds.map((id) => tracks.get(id)!);
}
