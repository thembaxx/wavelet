# Wavelet

**Little clips. Big music energy.**

Wavelet is the product name throughout the game, metadata, install manifest, icons, and account callback. The small-wave name fits short song clips and the playful audio studio. The repository and existing player saves retain their identities.

The app icon is an original folded teal-and-lime **w** with soft depth, inspired by the supplied app-icon references. The full-bleed artwork is in `public/brand/wavelet-master.png`; the header uses a small WebP export. `public/icon.svg` is a simplified ribbon for tiny browser icons. The maskable icon has additional padding for operating-system crops.

| Element | Value |
| --- | --- |
| Deep jade | `#176B56` |
| Forest ink | `#203D32` |
| Soft pistachio | `#DEEDC5` |
| Warm ivory | `#F7F8F2` |
| After hours background | `#102721` |
| Typeface | Satoshi variable, locally hosted |

Satoshi comes from [Fontshare](https://www.fontshare.com/fonts/satoshi). Its Free Font License is included beside the font in `public/fonts/`.

The header keeps profile and Settings. Appearance, sound, haptics, motion, canvas sizing, companion selection, dance video, music connection, install guidance, and keyboard help live in Settings. Round setup stays with Play. The shadcn/ui setup separates guessing mode from the music crate, with advanced round rules in their own popup. Artist selection produces an exclusive crate; short crates produce shorter sets and never borrow other artists. Your last public crate is restored locally. Squircles shape app tiles, controls, and popup surfaces; browsers without corner-shape support retain rounded corners. Settings persist per browser. Existing player progression keeps the `vinyl_rush_progression_v2` key so returning players retain their saves.

Motion uses a restrained GSAP title sequence, spring interactions, animated dialogs, progressive settings reveals, and an actual React Bits ClickSpark on Play. A Three.js topographic shader adapts React Bits Topography with slow drift and pointer parallax. Shape Magic’s Bloom adds a small six-petal decoration. The background runs at up to 30 fps, pauses in hidden tabs, and has a Settings toggle. Sound effects include six exports rendered by the official React Bits Sound Lab engine; see THIRD_PARTY_NOTICES.md. Reduced motion follows the device by default, freezes decorative 3D animation, removes celebratory particles and logo bounce, and pauses the cameo video. Audio effects and haptics are independent of music clips, with a master mute and volume control.

Hidden grooves for testing: tap the Wavelet logo five times in succession, type `groove` while the unfocused setup screen is active, or tap the 3D companion three times. Discoveries show a short vinyl burst and play the Wavelet chime when enabled. They do not change score or player progression.

Search and AI discovery use the canonical site origin, Open Graph and Twitter images, application JSON-LD, robots, sitemap, `/llms.txt`, `/llms-full.txt`, and the `/llm.txt` alias. The public origin defaults to the repository's published URL and can be configured with `NEXT_PUBLIC_SITE_URL`.

Appearance follows the device by default, with explicit Daylight and After hours overrides. A script applies the saved theme before the first paint; HTML, body, loading and error surfaces, browser theme-color, and the Three.js paper share the same colors. Safe-area padding supports notches and installed app windows. The manifest uses warm ivory for the system-controlled launch splash; browsers do not expose a dynamic per-theme splash color.

The production build generates a service worker versioned with the Next.js build ID. It saves the app shell and its bundles, public catalog requests, UI sounds, and up to 20 previously played previews. Uncached recordings and account connections still require a network; procedural practice grooves are not original recordings. Authentication callbacks and private API endpoints bypass the cache. Updates wait for the user to apply them from Settings after a set. Install guidance adapts to iOS and browser support. Fullscreen and headset controls are available where supported, and switching away pauses a round. Resuming restarts the unanswered clip; lock-screen metadata hides the song identity until it is revealed.
