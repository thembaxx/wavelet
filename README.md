# Wavelet

Little clips. Big music energy. A responsive music guessing game with short song previews, four challenges, and an interactive 3D vinyl studio.

Use Node.js 22.18+ and Bun. Install with `bun install --frozen-lockfile`, then run `bun run dev`. Open `http://localhost:3000`.

`bun run test` runs the game and preference regression tests. `bun run lint` checks the project. `bun run build` creates the production build.

Guest play uses the public catalog and a curated fallback. Optional Spotify OAuth requires `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and an allowed callback URL. Configure the public site origin through `NEXT_PUBLIC_SITE_URL`; see `.env.example`. The existing Firebase project configuration provides optional Google sign-in and profile sync.

Open **Settings** from the header to adjust audio, haptics, appearance, motion, companions, and installation. Preferences and guest progression are saved locally. See [BRAND.md](BRAND.md) for brand assets, interaction details, and hidden grooves.
