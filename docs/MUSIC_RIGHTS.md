# Wavelet's zero-fee music policy (free beta)

Wavelet must not require a paid music license or a streaming subscription to work. **Being free is not itself a copyright exemption.**

## What ships

- `lib/cleared-catalog.ts` declares **24 newly written original procedural demo loops**. Their melodies are expressed as MIDI note arrays, synthesized in the browser by Web Audio; no songs are sampled, embedded or fetched from third-party providers.
- Six genre crates are available: Pop, R&B/Soul, Hip-Hop/Rap, Electronic, Afrobeats and Alternative. In-game artist aliases (`Wavelet / ...`) are fictional studio project labels, **not claims that named external artists recorded these tracks**.
- Every loop has 2026 as its creation/release year. Year guessing and decade crates are hidden because they would not offer an honest challenge.
- `/api/songs` and `/api/artists` only serve the committed demo catalog. The API and solo game filter tracks through `isFreeGameTrack`; the Worker independently demands matching original preview IDs and game-use declarations. The browser audio engine will not open an arbitrary HTTPS preview.
- Spotify and Apple Music account sync are disabled. Spotify's developer policy disallows music trivia games, and an Apple Music preview is not a general-purpose game license.
- The new service worker no longer caches third-party previews; switching its cache namespace removes the old audio and catalog caches on activation.
- Multiplayer records a deduplicated **play intent** per listener/round within a room. These counts are not accurate stream invoices, not a paid royalty report, and are not shipped to analytics.

No claim is made that these loops represent chart hits. The original music is only a playable technical/demo catalog and is not a substitute for famous songs.

## Rights registry rules for future additions

Before any external track can be enabled, record and review:

1. The composition author/publisher and master recording owner (both separate rights).
2. Exact license ID/document evidence, its signer, expiry and conditions.
3. Explicit permission for **on-demand, short-clip interactive music trivia**, including multiplayer playback on each client and any caching.
4. Allowed territories, attribution, redistribution, reporting and commercial/noncommercial restrictions.
5. Whether each user/device counts as a billable play, and permitted maximum uses.

A Creative Commons label alone is insufficient if it only applies to the composition or has NonCommercial/NoDerivatives conditions conflicting with the game. Public-domain **composition** does not establish public-domain status for the **recording**.

Do not enable Jamendo's *non-commercial developer API*, stock music packs, or other catalog integrations based solely on a free price tier. Require written rights/contract review for this particular use case. Avoid claims of official licensing without evidence.

## Replacing the beta catalog

The demo `wavelet-original:` scheme is a local provider abstraction and has no network endpoint. To add a separately cleared provider, build an explicit new adapter and rights validation gate at **API, playlist, Worker and audio-engine boundaries**. Do not allow remote catalog responses to self-assert licensing with a user-editable flag. A verified, allowlisted rights manifest must decide eligibility.

Before launch, separately audit any nonmusic media or UX sound assets, as this registry is intentionally scoped only to trivia audio. Get qualified legal review before commercially licensing third-party recordings.

## QA checklist

- Unknown or legacy `https://audio-ssl.itunes.apple.com/...` preview URLs never play.
- An old cached/song-account track without the right manifest can never enter a solo round or multiplayer match.
- Offline catalog fallback only includes the original tracks.
- Original loops are different between tracks, can replay and stop, and obey mute, volume and reduced-media policies.
- All three enabled multiplayer modes have at least four distinct answer labels.
- No Spotify OAuth, Apple Music playback, iTunes song search, or preview-caching traffic is needed to complete a game.
