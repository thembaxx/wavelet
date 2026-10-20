# Wavelet

**Little clips. Big music energy.**

Wavelet is the product name throughout the game, metadata, install manifest, icons, and account callback. The small-wave name fits short song clips and the playful audio studio. The repository and existing player saves retain their identities.

The app icon is an original folded teal-and-lime **w** with soft depth, inspired by the supplied app-icon references. The full-bleed artwork is in `public/brand/wavelet-master.png`; the header uses a small WebP export. `public/icon.svg` is a simplified ribbon for tiny browser icons. The maskable icon has additional padding for operating-system crops.

| Element | Value |
| --- | --- |
| Lagoon | `#12786C` |
| Deep ink | `#142F2B` |
| Acid lime | `#EDFF8C` |
| Warm paper | `#FFFCF3` |
| Typeface | Satoshi variable, locally hosted |

Satoshi comes from [Fontshare](https://www.fontshare.com/fonts/satoshi). Its Free Font License is included beside the font in `public/fonts/`.

The header keeps profile and Settings. Appearance, sound, haptics, motion, canvas sizing, companion selection, dance video, music connection, install guidance, and keyboard help live in Settings. Round setup stays with Play. Settings persist per browser. Existing player progression keeps the `vinyl_rush_progression_v2` key so returning players retain their saves.

Motion uses a restrained GSAP title sequence, spring interactions, animated dialogs, and progressive settings reveals. Reduced motion follows the device by default, freezes decorative 3D animation, removes celebratory particles and logo bounce, and pauses the cameo video. Audio effects and haptics are independent of music clips, with a master mute and volume control.

Hidden grooves for testing: tap the Wavelet logo five times in succession, type `groove` while the unfocused setup screen is active, or tap the 3D companion three times. Discoveries show a short vinyl burst and play the Wavelet chime when enabled. They do not change score or player progression.

Search and AI discovery use the canonical site origin, Open Graph and Twitter images, application JSON-LD, robots, sitemap, `/llms.txt`, `/llms-full.txt`, and the `/llm.txt` alias. The public origin defaults to the repository's published URL and can be configured with `NEXT_PUBLIC_SITE_URL`.
