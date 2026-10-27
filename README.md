# Wavelet

Little clips. Big music energy. A free interactive music guessing game with original browser-generated loops, three current challenges, and an interactive 3D vinyl studio.

Use Node.js 22.18+ and Bun. Install with `bun install --frozen-lockfile`, then run `bun run dev`. Open `http://localhost:3000`.

The frontend uses the Bun version declared in `package.json` and `bun.lock` as its only lockfile. `vercel.json` runs install and build through `npx --yes bun@1.4.4`, so Vercel's older preinstalled Bun cannot reject the newer lockfile format. Installation uses `--frozen-lockfile`. Keep the Bun version in these two files aligned when upgrading. Do not generate a root `package-lock.json`; the separately deployed multiplayer Worker uses npm in `workers/multiplayer/`.

`bun run test` runs the game, exclusive artist filter, audio, preferences, and service worker regression tests. `bun run lint` checks the project. `bun run build` creates the production build and a versioned service worker. Offline behavior is enabled only in production; verify it with `bun run build` and `bun run start`, then reopen after the offline-ready message in Settings.

Guest play exclusively uses 24 original Wavelet studio demos: no paid licensing service, no third-party preview URLs, and no externally hosted recordings. Spotify/Apple Music account gameplay is disabled because subscription playback does not authorize a trivia game. Configure the site origin with `NEXT_PUBLIC_SITE_URL`; Firebase still provides optional Google sign-in and profile sync. See [music rights and expansion policy](docs/MUSIC_RIGHTS.md).

Open **Settings** from the header to adjust audio, haptics, appearance, motion, companions, and installation. Preferences and guest progression are saved locally. See [BRAND.md](BRAND.md) for brand assets, interaction details, and hidden grooves.

Choose **Your music → Artists** for an original Wavelet studio project, or try six genre mixes. The 2026 demos currently support Track, Artist and Genre guessing; Year mode and external music-account syncing are paused until there is a meaningful cleared catalog. The rights gate is checked at the API, playlist, playback and multiplayer boundaries.

The interface uses shadcn/ui, Phosphor icons, Three.js contour animation, and React Bits interactions, shapes, and Sound Lab exports. It follows the system theme and reduced-motion preference, with persistent overrides. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for credits and licenses.

The PWA caches its shell, approved original catalog responses, and studio sounds. Generated loops do not require streaming or paid third-party music APIs. Updates can be applied in Settings between sets. Supported browsers also offer fullscreen, native media controls, and home-screen installation.

The skippable three-step welcome introduces the studio through interactive Three.js objects. Replay it from **Settings → Replay the intro**; an active round pauses safely. Both the intro and its 3D bundle work offline after the app reports offline readiness. Apple install icons use Next.js file-based PNG metadata with fingerprinted URLs and traditional fallback filenames.

## Multiplayer (private rooms)

Wavelet now includes a separate **Play with friends** lobby at `/multiplayer`: 2–8 listeners can join via an eight-character invite code, mark ready, and compete across Track, Artist, or Genre challenges. The Cloudflare PartyServer Worker is server-authoritative for answers, deadlines, and scores; solo play is unchanged.

Multiplayer requires a separately deployed Worker and `NEXT_PUBLIC_WAVELET_MULTIPLAYER_URL` to be set in the Vercel project. See [Multiplayer setup, architecture, and validation](docs/MULTIPLAYER.md). The option is intentionally disabled when the Worker URL is not configured. Do not replace approved original clips with third-party recordings until explicit game and multiplayer rights have been confirmed.

## Repeatable shared challenges

Create a challenge link from an original mix, then explicitly start it. Links contain only a versioned original-catalogue identifier, seed, approved track IDs and game settings. The recipient hears the same ordered tracks; replay preserves them. Unsupported versions or tracks are rejected. Scores are local practice results, not a verified leaderboard. This branch resolves the playable direction from PR #9 while preserving the newer scroll fixes; the empty commercial catalogue from PR #10 remains a separate future integration requiring actual permissions. No existing PR has been merged or closed.
