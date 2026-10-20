# Wavelet

Little clips. Big music energy. A responsive music guessing game with short song previews, four challenges, and an interactive 3D vinyl studio.

Use Node.js 22.18+ and Bun. Install with `bun install --frozen-lockfile`, then run `bun run dev`. Open `http://localhost:3000`.

`bun run test` runs the game, exclusive artist filter, audio, preferences, and service worker regression tests. `bun run lint` checks the project. `bun run build` creates the production build and a versioned service worker. Offline behavior is enabled only in production; verify it with `bun run build` and `bun run start`, then reopen after the offline-ready message in Settings.

Guest play uses the public catalog and a curated fallback. Optional Spotify OAuth requires `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and an allowed callback URL. Configure the public site origin through `NEXT_PUBLIC_SITE_URL`; see `.env.example`. The existing Firebase project configuration provides optional Google sign-in and profile sync.

Open **Settings** from the header to adjust audio, haptics, appearance, motion, companions, and installation. Preferences and guest progression are saved locally. See [BRAND.md](BRAND.md) for brand assets, interaction details, and hidden grooves.

Choose **Your music → Artists** for songs exclusively by one artist. Artist identity is checked at the API and playlist boundaries; a small catalog produces a shorter set. Other crates, all four challenges, difficulty, self-scored play, progression, and music connections remain available.

The interface uses shadcn/ui, Phosphor icons, Three.js contour animation, and React Bits interactions, shapes, and Sound Lab exports. It follows the system theme and reduced-motion preference, with persistent overrides. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for credits and licenses.

The PWA caches its shell, public catalog responses, studio sounds, and up to 20 played previews. Uncached previews and account services require a connection. Updates can be applied in Settings between sets. Supported browsers also offer fullscreen, native media controls, and home-screen installation.
