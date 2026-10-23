import test from "node:test";
import assert from "node:assert/strict";

/**
 * Deterministic evaluator mirroring the exact boolean gates of firestore.rules
 * to verify all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED
 * and valid owner operations succeed.
 */

interface AuthContext {
  uid: string;
  email_verified: boolean;
}

interface RuleEvaluationContext {
  auth: AuthContext | null;
  pathUserId: string;
  requestTimeIso: string;
  operation: "get" | "list" | "create" | "update" | "delete";
  existingData?: Record<string, unknown>;
  incomingData?: Record<string, unknown>;
}

const ALLOWED_KEYS = [
  "uid",
  "callsign",
  "tagline",
  "mascotId",
  "xp",
  "coins",
  "overallScore",
  "bestSetScore",
  "totalWins",
  "totalLosses",
  "totalGamesPlayed",
  "highestStreakEver",
  "fastestSnippetGuessed",
  "unlockedBadges",
  "trackWins",
  "trackLosses",
  "trackGames",
  "trackBestScore",
  "trackBestStreak",
  "artistWins",
  "artistLosses",
  "artistGames",
  "artistBestScore",
  "artistBestStreak",
  "genreWins",
  "genreLosses",
  "genreGames",
  "genreBestScore",
  "genreBestStreak",
  "yearWins",
  "yearLosses",
  "yearGames",
  "yearBestScore",
  "yearBestStreak",
  "createdAt",
  "updatedAt",
];

function isValidId(id: unknown): boolean {
  return (
    typeof id === "string" && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id)
  );
}

function isBoundedInt(val: unknown): boolean {
  return typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 1000000000;
}

function isValidBadgesList(badges: unknown): boolean {
  if (!Array.isArray(badges) || badges.length > 20) return false;
  if (badges.length === 0) return true;
  return typeof badges[0] === "string" && badges[0].length >= 1 && badges[0].length <= 40;
}

function isValidUserProfile(
  data: Record<string, unknown> | undefined,
  userId: string,
  authUid: string,
): boolean {
  if (!data) return false;
  const keys = Object.keys(data);
  if (keys.length !== ALLOWED_KEYS.length) return false;
  for (const key of ALLOWED_KEYS) {
    if (!(key in data)) return false;
  }
  for (const key of keys) {
    if (!ALLOWED_KEYS.includes(key)) return false;
  }

  return (
    isValidId(data.uid) &&
    data.uid === userId &&
    data.uid === authUid &&
    typeof data.callsign === "string" &&
    data.callsign.length >= 1 &&
    data.callsign.length <= 40 &&
    typeof data.tagline === "string" &&
    data.tagline.length >= 0 &&
    data.tagline.length <= 80 &&
    typeof data.mascotId === "string" &&
    data.mascotId.length >= 1 &&
    data.mascotId.length <= 16 &&
    ["pebble", "bobacat", "sprout"].includes(data.mascotId) &&
    isBoundedInt(data.xp) &&
    isBoundedInt(data.coins) &&
    isBoundedInt(data.overallScore) &&
    isBoundedInt(data.bestSetScore) &&
    isBoundedInt(data.totalWins) &&
    isBoundedInt(data.totalLosses) &&
    isBoundedInt(data.totalGamesPlayed) &&
    isBoundedInt(data.highestStreakEver) &&
    isBoundedInt(data.fastestSnippetGuessed) &&
    isValidBadgesList(data.unlockedBadges) &&
    isBoundedInt(data.trackWins) &&
    isBoundedInt(data.trackLosses) &&
    isBoundedInt(data.trackGames) &&
    isBoundedInt(data.trackBestScore) &&
    isBoundedInt(data.trackBestStreak) &&
    isBoundedInt(data.artistWins) &&
    isBoundedInt(data.artistLosses) &&
    isBoundedInt(data.artistGames) &&
    isBoundedInt(data.artistBestScore) &&
    isBoundedInt(data.artistBestStreak) &&
    isBoundedInt(data.genreWins) &&
    isBoundedInt(data.genreLosses) &&
    isBoundedInt(data.genreGames) &&
    isBoundedInt(data.genreBestScore) &&
    isBoundedInt(data.genreBestStreak) &&
    isBoundedInt(data.yearWins) &&
    isBoundedInt(data.yearLosses) &&
    isBoundedInt(data.yearGames) &&
    isBoundedInt(data.yearBestScore) &&
    isBoundedInt(data.yearBestStreak) &&
    typeof data.createdAt === "string" &&
    typeof data.updatedAt === "string"
  );
}

function evaluateUserProfileRules(ctx: RuleEvaluationContext): "ALLOWED" | "PERMISSION_DENIED" {
  const isSignedIn = ctx.auth !== null;
  const isVerifiedUser = isSignedIn && ctx.auth?.email_verified === true;
  const isOwner = isSignedIn && ctx.auth?.uid === ctx.pathUserId;

  if (ctx.operation === "list") {
    return "PERMISSION_DENIED";
  }

  if (ctx.operation === "get") {
    return isOwner && isValidId(ctx.pathUserId) ? "ALLOWED" : "PERMISSION_DENIED";
  }

  if (ctx.operation === "create") {
    const ok =
      isVerifiedUser &&
      isOwner &&
      isValidId(ctx.pathUserId) &&
      isValidUserProfile(ctx.incomingData, ctx.pathUserId, ctx.auth!.uid) &&
      ctx.incomingData?.createdAt === ctx.requestTimeIso &&
      ctx.incomingData?.updatedAt === ctx.requestTimeIso;
    return ok ? "ALLOWED" : "PERMISSION_DENIED";
  }

  if (ctx.operation === "update") {
    if (
      !isVerifiedUser ||
      !isOwner ||
      !isValidId(ctx.pathUserId) ||
      !ctx.existingData ||
      !ctx.incomingData ||
      !isValidUserProfile(ctx.incomingData, ctx.pathUserId, ctx.auth!.uid)
    ) {
      return "PERMISSION_DENIED";
    }
    if (
      ctx.incomingData.uid !== ctx.existingData.uid ||
      ctx.incomingData.createdAt !== ctx.existingData.createdAt ||
      ctx.incomingData.updatedAt !== ctx.requestTimeIso
    ) {
      return "PERMISSION_DENIED";
    }
    return "ALLOWED";
  }

  if (ctx.operation === "delete") {
    return isVerifiedUser && isOwner && isValidId(ctx.pathUserId) ? "ALLOWED" : "PERMISSION_DENIED";
  }

  return "PERMISSION_DENIED";
}

const NOW_ISO = "2026-10-20T08:00:00.000Z";

function buildValidPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: "user_1",
    callsign: "DJ Pebble",
    tagline: "Crate Selector · 365 Studio",
    mascotId: "pebble",
    xp: 650,
    coins: 150,
    overallScore: 1200,
    bestSetScore: 1200,
    totalWins: 4,
    totalLosses: 1,
    totalGamesPlayed: 1,
    highestStreakEver: 3,
    fastestSnippetGuessed: 3,
    unlockedBadges: ["first-spin"],
    trackWins: 2,
    trackLosses: 0,
    trackGames: 1,
    trackBestScore: 1200,
    trackBestStreak: 2,
    artistWins: 1,
    artistLosses: 0,
    artistGames: 0,
    artistBestScore: 0,
    artistBestStreak: 1,
    genreWins: 1,
    genreLosses: 0,
    genreGames: 0,
    genreBestScore: 0,
    genreBestStreak: 1,
    yearWins: 0,
    yearLosses: 1,
    yearGames: 0,
    yearBestScore: 0,
    yearBestStreak: 0,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

test("Dirty Dozen Security Payloads all return PERMISSION_DENIED and valid owner writes succeed", () => {
  const validAuth: AuthContext = { uid: "user_1", email_verified: true };

  // Valid owner create succeeds
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload(),
    }),
    "ALLOWED",
  );

  // 1. Unauthenticated Create
  assert.equal(
    evaluateUserProfileRules({
      auth: null,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload(),
    }),
    "PERMISSION_DENIED",
  );

  // 2. Unverified Email Write
  assert.equal(
    evaluateUserProfileRules({
      auth: { uid: "user_1", email_verified: false },
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload(),
    }),
    "PERMISSION_DENIED",
  );

  // 3. Cross-User Identity Spoofing (Create)
  assert.equal(
    evaluateUserProfileRules({
      auth: { uid: "user_2", email_verified: true },
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload(),
    }),
    "PERMISSION_DENIED",
  );

  // 4. Shadow / Ghost Field Injection
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({ isAdmin: true }),
    }),
    "PERMISSION_DENIED",
  );

  // 5. Callsign Volumetric Overflow
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({ callsign: "A".repeat(100) }),
    }),
    "PERMISSION_DENIED",
  );

  // 6. Invalid Mascot Enum
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({ mascotId: "hacker_bot" }),
    }),
    "PERMISSION_DENIED",
  );

  // 7. Negative Score / Counter Poisoning
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({ artistWins: -5 }),
    }),
    "PERMISSION_DENIED",
  );

  // 8. Unbounded Array Exhaustion
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({
        unlockedBadges: Array.from({ length: 25 }, (_, i) => `badge-${i}`),
      }),
    }),
    "PERMISSION_DENIED",
  );

  // 9. Array Element Type Poisoning
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({ unlockedBadges: [99999] }),
    }),
    "PERMISSION_DENIED",
  );

  // 10. Immutable Field Tampering on Update
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: "2026-10-20T09:00:00.000Z",
      operation: "update",
      existingData: buildValidPayload(),
      incomingData: buildValidPayload({
        createdAt: "2026-10-20T09:00:00.000Z",
        updatedAt: "2026-10-20T09:00:00.000Z",
      }),
    }),
    "PERMISSION_DENIED",
  );

  // 11. Forged Client Timestamp
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "create",
      incomingData: buildValidPayload({ updatedAt: "2099-01-01T00:00:00.000Z" }),
    }),
    "PERMISSION_DENIED",
  );

  // 12. Unauthorized Cross-User Read / Collection Listing
  assert.equal(
    evaluateUserProfileRules({
      auth: { uid: "user_2", email_verified: true },
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "get",
    }),
    "PERMISSION_DENIED",
  );
  assert.equal(
    evaluateUserProfileRules({
      auth: validAuth,
      pathUserId: "user_1",
      requestTimeIso: NOW_ISO,
      operation: "list",
    }),
    "PERMISSION_DENIED",
  );
});
