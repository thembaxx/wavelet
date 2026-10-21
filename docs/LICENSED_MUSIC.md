# Licensed music architecture for Wavelet

## How it works

This is an implementation of rights-gated playback infrastructure, **not an assertion that Wavelet already has a commercial-music licence**. Streaming subscriptions, iTunes promotional previews and YouTube embeds are not blanket music-trivia permissions.

- The existing iTunes search has moved to /api/music/discover and returns **only metadata** (an empty previewUrl).
- /api/songs is now the gameplay catalogue endpoint and returns only approved direct or partner tracks whose rights declarations and URL validity pass server-side checks.
- Cloudflare PartyServer independently checks worldwide multiplayer rights and expiry before constructing a round, and discards older stored rooms that contain pre-gate audio.
- Solo playback and imported streaming-account tracks cannot bypass the same checks.
- The shipped catalogue data/licensed-tracks.json is deliberately empty. Gameplay requiring actual songs will be unavailable until rights are secured. This branch should be reviewed before merging because it changes the current public gameplay experience.

## Direct rights-cleared recordings

Review data/licensed-tracks.example.json (fictional data; **not a valid music licence**). Once the developer has written authorisation for *both master recording and composition* for the exact timed guessing-game use, add entries to data/licensed-tracks.json. Use only authorised HTTPS clip URLs on an approved CDN; never reuse iTunes/Spotify/YouTube promotional media.

Each track declares its licenseId, provider, allowedUses (solo and/or multiplayer), permitted territories, agreement expiry, optional signed-clip URL expiry, maximum clip duration, and whether the licensor requires usage reports. Rights entries are not proof of the contract: independently validate them against executed agreements kept out of Git.

Territory-restricted tracks are supported in solo only when a Vercel request-country header resolves. Multiplayer deliberately requires territories ["*"], which must **really mean worldwide rights**, because the Worker does not yet know each player's territory. Expired recordings and URLs are never played.

## Partner adapter (Songclip / Feed Clips / other B2B)

The generic server-side adapter uses:

- WAVELET_LICENSED_CATALOG_URL — a trusted HTTPS service returning {"tracks":[...]} in the licensed Wavelet format. This gateway translates a vendor-specific protocol and confirms that the partner's contract authorises music trivia.
- WAVELET_LICENSED_CATALOG_TOKEN — an optional **server-only** Bearer secret for that gateway. Store in Vercel Environment Variables as a Secret, never in NEXT_PUBLIC.

The adapter uses no-store requests, filters malformed or expired records, and fails closed if the provider is unavailable. A signed clip URL is passed to the player's browser but is not copied to Wavelet's servers. The vendor must document the contractually permitted expiry, caching, attribution, authentication and client-playback behaviour; no undocumented Songclip/Feed endpoint has been invented.

If usageReportingRequired=true, that track is **blocked** until an authenticated provider-specific reporting flow is added, load-tested, deduplicated and reconciled. Setting a feed URL alone does not satisfy usage accounting or licensing requirements.

## Routes

- GET /api/music/discover — artist/genre/year discovery data; no third-party audio URL.
- GET /api/songs?usage=solo&duration=5 — licensed clips for the verified viewer territory, no-store.
- GET /api/songs?usage=multiplayer&duration=5 — worldwide, long-validity clips for a Cloudflare-hosted match.

## Activation checklist

1. Obtain explicit written rights (master and composition), approval of free-to-play and future monetisation, game clip duration, territories, reporting, caching, billing, artwork and credits.
2. Obtain approved provider docs, API credentials, test catalogue and signed media access. A public provider API key alone is insufficient.
3. Implement the provider-specific catalogue translator and play-event gateway following the agreed contract. Keep secret keys server-only.
4. Add rights-cleared tracks, then verify a four-choice playable selection for each multiplayer mode (track, artist, genre, year) plus solo duration variants.
5. Test expired contract, restricted country, expired signed URL, unauthorised preview, user-account imports, missing partner credentials, two separate players, and playback failures.
6. Run project tests, TypeScript, Next.js build and Worker typecheck/dry-run. Only release when both partner compliance and user-facing functionality are verified.

Partner enquiries: https://www.songclip.com/songclip-api-form and https://www.feed.fm/clips/music-api . Both require game-specific commercial approval.
