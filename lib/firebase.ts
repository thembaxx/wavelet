"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import {
  type PlayerProgressionState,
  type MascotCharacterId,
  createInitialProgression,
} from "./game-rules";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested || typeof window === "undefined") return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

if (typeof window !== "undefined") {
  void testFirestoreConnection();
}

// ============================================================================
// DEFENSIVE PAYLOAD SANITIZATION (Synced with firebase-blueprint.json & rules)
// ============================================================================

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_MASCOTS: MascotCharacterId[] = ["pebble", "bobacat", "sprout"];

export function sanitizeCallsign(input: string, fallback = "Studio Selector"): string {
  const trimmed = (input || "").trim().slice(0, 40);
  return trimmed.length >= 1 ? trimmed : fallback;
}

export function sanitizeTagline(
  input: string,
  fallback = "Wavelet selector · Always listening",
): string {
  return (input ?? fallback).trim().slice(0, 80);
}

export function sanitizeMascotId(input: string): MascotCharacterId {
  return VALID_MASCOTS.includes(input as MascotCharacterId)
    ? (input as MascotCharacterId)
    : "pebble";
}

export function sanitizeBoundedInt(val: unknown): number {
  const num = typeof val === "number" && Number.isFinite(val) ? Math.floor(val) : 0;
  return Math.max(0, Math.min(1000000000, num));
}

export function sanitizeBadges(badges: unknown): string[] {
  if (!Array.isArray(badges)) return ["first-spin"];
  return badges
    .filter((b): b is string => typeof b === "string" && b.trim().length >= 1)
    .map((b) => b.trim().slice(0, 40))
    .slice(0, 20);
}

export function buildValidatedFirestorePayload(
  uid: string,
  state: PlayerProgressionState,
  includeCreatedAt: boolean,
): Record<string, unknown> {
  const safeUid = VALID_ID_REGEX.test(uid) ? uid.slice(0, 128) : "user_fallback";
  const base = createInitialProgression();
  const modeStats = state.modeStats || base.modeStats;

  const payload: Record<string, unknown> = {
    uid: safeUid,
    callsign: sanitizeCallsign(state.callsign),
    tagline: sanitizeTagline(state.tagline),
    mascotId: sanitizeMascotId(state.mascotId),
    xp: sanitizeBoundedInt(state.xp),
    coins: sanitizeBoundedInt(state.coins),
    overallScore: sanitizeBoundedInt(state.overallScore),
    bestSetScore: sanitizeBoundedInt(state.bestSetScore),
    totalWins: sanitizeBoundedInt(state.totalWins ?? state.totalCorrect),
    totalLosses: sanitizeBoundedInt(state.totalLosses),
    totalGamesPlayed: sanitizeBoundedInt(state.totalGamesPlayed),
    highestStreakEver: sanitizeBoundedInt(state.highestStreakEver),
    fastestSnippetGuessed: sanitizeBoundedInt(state.fastestSnippetGuessed || 5),
    unlockedBadges: sanitizeBadges(state.unlockedBadges),
    trackWins: sanitizeBoundedInt(modeStats.track?.wins),
    trackLosses: sanitizeBoundedInt(modeStats.track?.losses),
    trackGames: sanitizeBoundedInt(modeStats.track?.gamesPlayed),
    trackBestScore: sanitizeBoundedInt(modeStats.track?.bestScore),
    trackBestStreak: sanitizeBoundedInt(modeStats.track?.bestStreak),
    artistWins: sanitizeBoundedInt(modeStats.artist?.wins),
    artistLosses: sanitizeBoundedInt(modeStats.artist?.losses),
    artistGames: sanitizeBoundedInt(modeStats.artist?.gamesPlayed),
    artistBestScore: sanitizeBoundedInt(modeStats.artist?.bestScore),
    artistBestStreak: sanitizeBoundedInt(modeStats.artist?.bestStreak),
    genreWins: sanitizeBoundedInt(modeStats.genre?.wins),
    genreLosses: sanitizeBoundedInt(modeStats.genre?.losses),
    genreGames: sanitizeBoundedInt(modeStats.genre?.gamesPlayed),
    genreBestScore: sanitizeBoundedInt(modeStats.genre?.bestScore),
    genreBestStreak: sanitizeBoundedInt(modeStats.genre?.bestStreak),
    yearWins: sanitizeBoundedInt(modeStats.year?.wins),
    yearLosses: sanitizeBoundedInt(modeStats.year?.losses),
    yearGames: sanitizeBoundedInt(modeStats.year?.gamesPlayed),
    yearBestScore: sanitizeBoundedInt(modeStats.year?.bestScore),
    yearBestStreak: sanitizeBoundedInt(modeStats.year?.bestStreak),
    updatedAt: serverTimestamp(),
  };

  if (includeCreatedAt) {
    payload.createdAt = serverTimestamp();
  }

  return payload;
}

export function mergeCloudDocIntoProgression(
  data: Record<string, unknown>,
  localState: PlayerProgressionState,
): PlayerProgressionState {
  const initial = createInitialProgression();
  const trackWins = sanitizeBoundedInt(data.trackWins);
  const artistWins = sanitizeBoundedInt(data.artistWins);
  const genreWins = sanitizeBoundedInt(data.genreWins);
  const yearWins = sanitizeBoundedInt(data.yearWins);
  const totalWins = Math.max(
    sanitizeBoundedInt(data.totalWins),
    trackWins + artistWins + genreWins + yearWins,
  );

  return {
    callsign: sanitizeCallsign(
      typeof data.callsign === "string" ? data.callsign : localState.callsign,
    ),
    tagline: sanitizeTagline(typeof data.tagline === "string" ? data.tagline : localState.tagline),
    mascotId: sanitizeMascotId(
      typeof data.mascotId === "string" ? data.mascotId : localState.mascotId,
    ),
    xp: Math.max(sanitizeBoundedInt(data.xp), localState.xp),
    coins: Math.max(sanitizeBoundedInt(data.coins), localState.coins),
    overallScore: Math.max(sanitizeBoundedInt(data.overallScore), localState.overallScore),
    bestSetScore: Math.max(sanitizeBoundedInt(data.bestSetScore), localState.bestSetScore),
    totalCorrect: Math.max(totalWins, localState.totalCorrect),
    totalWins: Math.max(totalWins, localState.totalWins),
    totalLosses: Math.max(sanitizeBoundedInt(data.totalLosses), localState.totalLosses),
    totalGamesPlayed: Math.max(
      sanitizeBoundedInt(data.totalGamesPlayed),
      localState.totalGamesPlayed,
    ),
    highestStreakEver: Math.max(
      sanitizeBoundedInt(data.highestStreakEver),
      localState.highestStreakEver,
    ),
    fastestSnippetGuessed: Math.min(
      sanitizeBoundedInt(data.fastestSnippetGuessed) || 30,
      localState.fastestSnippetGuessed || 30,
    ),
    unlockedBadges: Array.from(
      new Set([...sanitizeBadges(data.unlockedBadges), ...localState.unlockedBadges]),
    ).slice(0, 20),
    quests: localState.quests || initial.quests,
    modeStats: {
      track: {
        wins: Math.max(trackWins, localState.modeStats?.track?.wins ?? 0),
        losses: Math.max(
          sanitizeBoundedInt(data.trackLosses),
          localState.modeStats?.track?.losses ?? 0,
        ),
        gamesPlayed: Math.max(
          sanitizeBoundedInt(data.trackGames),
          localState.modeStats?.track?.gamesPlayed ?? 0,
        ),
        bestScore: Math.max(
          sanitizeBoundedInt(data.trackBestScore),
          localState.modeStats?.track?.bestScore ?? 0,
        ),
        bestStreak: Math.max(
          sanitizeBoundedInt(data.trackBestStreak),
          localState.modeStats?.track?.bestStreak ?? 0,
        ),
      },
      artist: {
        wins: Math.max(artistWins, localState.modeStats?.artist?.wins ?? 0),
        losses: Math.max(
          sanitizeBoundedInt(data.artistLosses),
          localState.modeStats?.artist?.losses ?? 0,
        ),
        gamesPlayed: Math.max(
          sanitizeBoundedInt(data.artistGames),
          localState.modeStats?.artist?.gamesPlayed ?? 0,
        ),
        bestScore: Math.max(
          sanitizeBoundedInt(data.artistBestScore),
          localState.modeStats?.artist?.bestScore ?? 0,
        ),
        bestStreak: Math.max(
          sanitizeBoundedInt(data.artistBestStreak),
          localState.modeStats?.artist?.bestStreak ?? 0,
        ),
      },
      genre: {
        wins: Math.max(genreWins, localState.modeStats?.genre?.wins ?? 0),
        losses: Math.max(
          sanitizeBoundedInt(data.genreLosses),
          localState.modeStats?.genre?.losses ?? 0,
        ),
        gamesPlayed: Math.max(
          sanitizeBoundedInt(data.genreGames),
          localState.modeStats?.genre?.gamesPlayed ?? 0,
        ),
        bestScore: Math.max(
          sanitizeBoundedInt(data.genreBestScore),
          localState.modeStats?.genre?.bestScore ?? 0,
        ),
        bestStreak: Math.max(
          sanitizeBoundedInt(data.genreBestStreak),
          localState.modeStats?.genre?.bestStreak ?? 0,
        ),
      },
      year: {
        wins: Math.max(yearWins, localState.modeStats?.year?.wins ?? 0),
        losses: Math.max(
          sanitizeBoundedInt(data.yearLosses),
          localState.modeStats?.year?.losses ?? 0,
        ),
        gamesPlayed: Math.max(
          sanitizeBoundedInt(data.yearGames),
          localState.modeStats?.year?.gamesPlayed ?? 0,
        ),
        bestScore: Math.max(
          sanitizeBoundedInt(data.yearBestScore),
          localState.modeStats?.year?.bestScore ?? 0,
        ),
        bestStreak: Math.max(
          sanitizeBoundedInt(data.yearBestStreak),
          localState.modeStats?.year?.bestStreak ?? 0,
        ),
      },
    },
  };
}

export async function signInWithGooglePopup(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export function subscribeToUserProfile(
  uid: string,
  localFallback: PlayerProgressionState,
  onProfileUpdate: (merged: PlayerProgressionState) => void,
): Unsubscribe {
  const path = `users/${uid}`;
  const docRef = doc(db, "users", uid);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const merged = mergeCloudDocIntoProgression(
          snapshot.data() as Record<string, unknown>,
          localFallback,
        );
        onProfileUpdate(merged);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export async function syncOrInitializeUserProfile(
  user: User,
  localState: PlayerProgressionState,
): Promise<PlayerProgressionState> {
  if (!user.emailVerified) {
    return localState;
  }
  const path = `users/${user.uid}`;
  const docRef = doc(db, "users", user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap.exists()) {
    const defaultCallsign = sanitizeCallsign(
      user.displayName || localState.callsign || "Studio Selector",
    );
    const seededState: PlayerProgressionState = {
      ...localState,
      callsign: defaultCallsign,
    };
    const createPayload = buildValidatedFirestorePayload(user.uid, seededState, true);
    try {
      await setDoc(docRef, createPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    return seededState;
  }

  const merged = mergeCloudDocIntoProgression(
    existingSnap.data() as Record<string, unknown>,
    localState,
  );
  const updatePayload = buildValidatedFirestorePayload(user.uid, merged, false);
  delete updatePayload.uid;
  delete updatePayload.createdAt;

  try {
    await updateDoc(docRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return merged;
}

export async function persistUserProfileUpdate(
  user: User | null,
  state: PlayerProgressionState,
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const path = `users/${user.uid}`;
  const docRef = doc(db, "users", user.uid);
  const updatePayload = buildValidatedFirestorePayload(user.uid, state, false);
  delete updatePayload.uid;
  delete updatePayload.createdAt;

  try {
    await updateDoc(docRef, updatePayload);
  } catch (error) {
    // If document doesn't exist yet, create it
    if (error instanceof Error && error.message.includes("No document to update")) {
      const createPayload = buildValidatedFirestorePayload(user.uid, state, true);
      try {
        await setDoc(docRef, createPayload);
        return;
      } catch (createErr) {
        handleFirestoreError(createErr, OperationType.CREATE, path);
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
