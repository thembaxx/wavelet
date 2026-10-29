# Wavelet music sources

## Commercial previews (online solo)

Online solo explicitly requests `/api/songs?source=itunes`. The server searches the iTunes catalog or looks up artist IDs in the South African storefront. It returns song title, artist identity, album, provider release date, artwork and store link only for results with an HTTPS preview on Apple’s audio CDN. Reissues with the same title and artist are deduplicated. The browser streams clips directly and stops them after the chosen 1–30 seconds. No audio is downloaded into the repository, proxied by Wavelet, or cached by its service worker.

`lib/preview-catalog.ts` validates provider metadata and URLs; `lib/itunes-catalog.ts` owns bounded, cached API calls. A failed commercial search is shown as unavailable, never silently replaced with a demo. Stream errors offer replay or skip rather than synthesizing unrelated notes.

These records are identified as `source: "itunes"`; they do **not** claim original authorship, royalty-free status or verified game-use permission. Apple’s [Search API documentation and terms](https://performance-partners.apple.com/search-api) describe previews as promotional content and restrict independent entertainment use. This implementation does not establish a music-trivia license or a personal-use exemption.

Music-account OAuth, personal library syncing and full-track subscription playback remain disconnected. Search API availability and preview access depend on the provider, storefront and network. Provider release dates can describe a reissue; Year mode stays hidden.

## Original demos (offline, shared challenges and multiplayer)

`lib/cleared-catalog.ts` retains 24 original procedural loops, generated in the browser with Web Audio. Fictional `Wavelet / ...` names are studio project labels, not outside recording artists. The original registry, validation and shared challenge format are unchanged.

Choose **Your music → Genres → Offline originals** to play without streaming or create a repeatable shared challenge. `/api/songs` without a provider parameter continues to return originals for existing clients and the multiplayer Worker. Commercial preview crates are currently solo-only; their share-link button is disabled.

## Validation

- Original loops continue to require exact canonical metadata and original IDs.
- Commercial records require a stable iTunes track ID and an allowlisted HTTPS preview URL; arbitrary URLs and missing previews are rejected.
- Artist crates use provider identity, preventing tribute/cover artists from entering a selected artist’s crate.
- Metadata is cached for an hour to reduce Search API requests. Audio stays outside the app’s service worker cache.
- Buffering does not consume the selected snippet duration. Stop, replay, mute, volume, load timeouts, playback rejection and late playback promises are covered by focused tests.
