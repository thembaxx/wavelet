# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Global Default Deny**: Any path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false;`).
2. **Master Gate & Owner Isolation (`/users/{userId}`)**:
   - A `UserProfile` document at `/users/{userId}` belongs exclusively to the authenticated Firebase user whose `request.auth.uid == userId`.
   - `userId` path parameter must satisfy `isValidId(userId)` (`userId is string && userId.size() >= 1 && userId.size() <= 128 && userId.matches('^[a-zA-Z0-9_\\-]+$')`).
   - All write operations require `isVerifiedUser()` (`request.auth != null && request.auth.token.email_verified == true`).
   - `list` queries on `/users` are strictly forbidden (`allow list: if false;`) to prevent user enumeration or scraping.
   - `get` access on `/users/{userId}` is restricted strictly to `isOwner(userId)` (`request.auth != null && request.auth.uid == userId`).
3. **Immutable & Temporal Integrity**:
   - `uid` must equal `userId` and `request.auth.uid` on creation and remain immutable on update (`incoming().uid == existing().uid`).
   - `createdAt` must equal `request.time` on creation and remain immutable on update (`incoming().createdAt == existing().createdAt`).
   - `updatedAt` must equal `request.time` on both creation and update (`incoming().updatedAt == request.time`).
4. **Strict Key & Volumetric Boundaries (`isValidUserProfile`)**:
   - Every string field enforces exact length limits matching `firebase-blueprint.json`:
     - `uid`: `1..128`, regex `^[a-zA-Z0-9_\-]+$`
     - `callsign`: `1..40`
     - `tagline`: `0..80`
     - `mascotId`: in `['pebble', 'bobacat', 'sprout']`, `1..16`
   - `unlockedBadges`: `is list && size() <= 20` and if non-empty, `unlockedBadges[0] is string && unlockedBadges[0].size() <= 40`.
   - All numeric counters (`xp`, `coins`, `overallScore`, `bestSetScore`, `totalWins`, `totalLosses`, `totalGamesPlayed`, `highestStreakEver`, `fastestSnippetGuessed`, and all 20 mode-specific counters) must be `int`, `>= 0`, and `<= 1000000000`.
5. **Action-Based Update Pattern**:
   - Every `update` must pass `isValidUserProfile(incoming(), userId)` first, preserve immutable fields (`uid`, `createdAt`), set `updatedAt == request.time`, and match one of the explicit action branches via `incoming().diff(existing()).affectedKeys().hasOnly(...)`:
     - **Action 1 (`updateIdentity`)**: Modifies only `['callsign', 'tagline', 'mascotId', 'updatedAt']`.
     - **Action 2 (`syncStatsAndProgression`)**: Modifies only allowed progression/mode stats and identity fields without touching `uid` or `createdAt`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Unauthenticated Create**: Attempting to create `/users/user_1` with `auth = null`. -> `PERMISSION_DENIED`
2. **Payload 2 — Unverified Email Write**: Authenticated as `user_1` with `email_verified: false` attempting `create` on `/users/user_1`. -> `PERMISSION_DENIED`
3. **Payload 3 — Cross-User Identity Spoofing (Create)**: Authenticated as `user_2` attempting to create `/users/user_1` or setting `uid: 'user_2'` inside `/users/user_1`. -> `PERMISSION_DENIED`
4. **Payload 4 — Shadow / Ghost Field Injection**: Sending valid profile fields plus `"isAdmin": true` or `"isVerified": true`. -> `PERMISSION_DENIED`
5. **Payload 5 — Callsign Volumetric Overflow**: Setting `callsign` to a 500-character string (exceeds `maxLength: 40`). -> `PERMISSION_DENIED`
6. **Payload 6 — Invalid Mascot Enum**: Setting `mascotId: "hacker_bot"` (not in `['pebble', 'bobacat', 'sprout']`). -> `PERMISSION_DENIED`
7. **Payload 7 — Negative Score / Counter Poisoning**: Setting `xp: -500` or `artistWins: -1`. -> `PERMISSION_DENIED`
8. **Payload 8 — Unbounded Array Exhaustion**: Setting `unlockedBadges` to an array of 25 items (exceeds `size() <= 20`). -> `PERMISSION_DENIED`
9. **Payload 9 — Array Element Type Poisoning**: Setting `unlockedBadges: [12345]` (first element is not a bounded string). -> `PERMISSION_DENIED`
10. **Payload 10 — Immutable Field Tampering on Update**: Updating `/users/user_1` while changing `createdAt` or `uid`. -> `PERMISSION_DENIED`
11. **Payload 11 — Forged Client Timestamp**: Creating or updating `/users/user_1` with a past/future timestamp instead of `request.time`. -> `PERMISSION_DENIED`
12. **Payload 12 — Unauthorized Cross-User Read / Collection Listing**: Authenticated as `user_2` attempting `get` on `/users/user_1` or `list` on `/users`. -> `PERMISSION_DENIED`
