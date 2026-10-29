# Wavelet

Little clips. Big music energy. An interactive music guessing game with real commercial song previews, original offline loops, three challenges, and an interactive 3D vinyl studio.

Use Node.js 22.18+ and Bun. Install with `bun install --frozen-lockfile`, then run `bun run dev`. Open `http://localhost:3000`.

The frontend uses the Bun version declared in `package.json` and `bun.lock` as its only lockfile. `vercel.json` runs install and build through `npx --yes bun@1.4.4`, so Vercel's older preinstalled Bun cannot reject the newer lockfile format. Installation uses `--frozen-lockfile`. Keep the Bun version in these two files aligned when upgrading. Do not generate a root `package-lock.json`; the separately deployed multiplayer Worker uses npm in `workers/multiplayer/`.

`bun run test` runs the game, exclusive artist filter, audio, preferences, and service worker regression tests. `bun run lint` checks the project. `bun run build` creates the production build and a versioned service worker. Offline behavior is enabled only in production; verify it with `bun run build` and `bun run start`, then reopen after the offline-ready message in Settings.

Online solo play uses commercial song previews from the iTunes Search API, without OAuth or an API key. The Commercial Mix combines familiar artists across genres; artist search resolves real artist IDs and excludes recordings credited to other artist IDs. Clips stream directly from Apple’s preview CDN for 1–30 seconds. The Offline originals crate still plays 24 browser-generated demos without a network connection. Music library syncing and full-song subscription playback are not connected. Configure the site origin with `NEXT_PUBLIC_SITE_URL`; Firebase still provides optional Google sign-in and profile sync. See [music rights and expansion policy](docs/MUSIC_RIGHTS.md).

Open **Settings** from the header to adjust audio, haptics, appearance, motion, companions, and installation. Preferences and guest progression are saved locally. See [BRAND.md](BRAND.md) for brand assets, interaction details, and hidden grooves.

Choose **Your music → Artists** for real artists, **Genres** for mixes, or search for songs. Track, Artist and Genre guessing are available. Year mode remains hidden: provider dates can represent reissues, and every original demo dates to 2026. Original demos and commercial previews have separate validation; commercial records never assert original composition or game-use rights.

The interface uses shadcn/ui, Phosphor icons, Three.js contour animation, and React Bits interactions, shapes, and Sound Lab exports. It follows the system theme and reduced-motion preference, with persistent overrides. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for credits and licenses.

The PWA caches its shell, catalog metadata, and studio sounds. Commercial audio is never placed in the service worker cache. Choose Offline originals for games without streaming. Updates can be applied in Settings between sets. Supported browsers also offer fullscreen, native media controls, and home-screen installation.

The skippable three-step welcome introduces the studio through interactive Three.js objects. Replay it from **Settings → Replay the intro**; an active round pauses safely. Both the intro and its 3D bundle work offline after the app reports offline readiness. Apple install icons use Next.js file-based PNG metadata with fingerprinted URLs and traditional fallback filenames.

## Multiplayer (private rooms)

Wavelet now includes a separate **Play with friends** lobby at `/multiplayer`: 2–8 listeners can join via an eight-character invite code, mark ready, and compete across Track, Artist, or Genre challenges. The Cloudflare PartyServer Worker is server-authoritative for answers, deadlines, and scores; solo play is unchanged.

Multiplayer requires a separately deployed Worker and `NEXT_PUBLIC_WAVELET_MULTIPLAYER_URL` to be set in the Vercel project. See [Multiplayer setup, architecture, and validation](docs/MULTIPLAYER.md). The option is intentionally disabled when the Worker URL is not configured. Multiplayer continues to use the original catalog; commercial previews are currently a solo feature.

## Repeatable shared challenges

Create a challenge link from an original mix, then explicitly start it. Links contain only a versioned original-catalogue identifier, seed, approved track IDs and game settings. The recipient hears the same ordered tracks; replay preserves them. Unsupported versions or tracks are rejected. Scores are local practice results, not a verified leaderboard. Challenge links continue to support the original catalog only. Choose Offline originals before creating a link; commercial preview crates do not produce share links.
