# Wavelet multiplayer — PartyServer on Cloudflare Workers

## Architecture

- The existing Next.js/Vercel app owns the new `/multiplayer` UI. Solo games and offline PWA remain unchanged.
- The independent `workers/multiplayer` Worker hosts one SQLite-backed Durable Object per room using PartyServer 0.5.10.
- The browser talks to `wss://WORKER/parties/wavelet-room/XXXXXXXX`; no secret or privileged score calculation lives in the browser.
- The Worker requests the approved original catalog from Wavelet `/api/songs`, once at match start, and rejects tracks lacking the strict original-preview and rights fields. It never writes audio to Durable Object storage.
- Each client synthesizes the original melody locally using Web Audio only after an explicit user gesture; no third-party preview URL is fetched. The Worker controls the round deadline and computes scores from receipt time.
- Reconnecting guests authenticate to the room with a private player ID and random reconnect secret saved in `sessionStorage`; these are never broadcast.
- Scores are **match-local**. They are not applied to solo progression, XP, coins, quests, or leaderboards.

## Run locally

1. From `workers/multiplayer/`, run `npm install`, then `npm run typecheck`, then `npm run dev`.
2. Add `http://localhost:3000` to `ALLOWED_ORIGINS` in the Worker vars for local testing. **Remove it from the production Worker**.
3. In the Next.js project's `.env.local`, set `NEXT_PUBLIC_WAVELET_MULTIPLAYER_URL=http://localhost:8787`.
4. From the repository root, run `bun install --frozen-lockfile && bun run dev`.
5. Use two independent browsers/profiles. Create a room, share the invite, mark both ready, and start.

The Worker uses its own package.json intentionally. Do not add PartyServer dependencies to the root Next.js app. Worker builds run separately in CI.

## Deployment

1. Configure `CATALOG_ORIGIN` and `ALLOWED_ORIGINS` in `workers/multiplayer/wrangler.jsonc` with your verified production frontend URL. `ALLOWED_ORIGINS` accepts a comma-separated, exact origin allowlist (no wildcard); avoid preview-domain wildcards.
2. Confirm that the selected Cloudflare account supports SQLite-backed Durable Objects.
3. In `workers/multiplayer`, run `npm install`, `npm run typecheck`, and `npm run deploy`.
4. Confirm `GET https://<worker-host>/health` returns `{ "ok": true }` and verify one two-player match across browsers.
5. Set `NEXT_PUBLIC_WAVELET_MULTIPLAYER_URL=https://<worker-host>` in Vercel and redeploy the Next.js frontend.
6. Verify browser WebSocket connections and the room status on the published origin.

**Licensing gate:** The free beta uses only 24 original procedurally synthesized tracks with strict allowlist checks on the API, client and Worker. Year mode and Spotify/Apple Music sync are intentionally disabled. New recordings require track-level verification and explicit multiplayer permissions before integration; see [music rights](MUSIC_RIGHTS.md).

## Protocol

The client sends JSON commands `join`, `ready`, `configure`, `start`, `play`, `answer`, `reset`, and `leave`. The `play` command records a best-effort, per-listener-per-round play intent (deduplicated on the Worker) and is **not** a royalty report or proof of hearing audio.
The Worker sends `joined` (private identity), `state` (public lobby/round snapshot), and `error`.

- Only the host configures and starts, with at least two connected, ready players.
- Players choose from four options during a 20-second round; only one valid submission per player counts.
- The correct option and song metadata stay server-side until the reveal phase.
- Scores: 100 points for a correct answer plus a 0–100 speed bonus calculated using server receipt time; wrong answers earn 0.
- All online players submitting an answer ends the round early. Otherwise, an alarm reveals after the deadline and advances after 4.5 seconds.
- Room state is durably persisted, supporting recovery across Worker restarts. Room snapshots expire after roughly 24 hours of lobby/final-result inactivity.

## Required manual verification

- Two, three, and eight players; room full error; unknown room and wrong code.
- Host disconnects and another connected player becomes host.
- Reload mid-match, reconnect after a temporary network outage, and a second tab using the same saved identity.
- A duplicate guess must not award points twice, a late answer must be rejected, and guessed scores must be ignored.
- One browser backgrounded, another on a slow connection; the round must still end consistently.
- Verify all three enabled modes have four distinct choices, and each original synthesizer melody plays. Year mode stays disabled for the 2026 catalog.
- Worker source typecheck, Wrangler dry-run bundle, frontend typecheck, lint and Next.js production build.

## Limitations and follow-ups

- Guests use room invite codes and per-device reconnect secrets, not Firebase login. Abuse protection and monitoring should be added before large public launch (for example, rate limiting / Turnstile at room creation).
- New players cannot join a match already in progress, but disconnected existing players can rejoin.
- Timer is authoritative on the server, but audio playback start depends on each player's own interaction/browser media policy. This is not sample-accurate synchronized audio.
- The room invite URL conveys access to a private room; do not publish it publicly. There is no cross-room discovery or matchmaking.
- Multiplayer scores are deliberately separate from solo achievements until server-verified profile integrations are designed.
