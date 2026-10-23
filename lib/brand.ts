export const BRAND = {
  name: "Wavelet",
  title: "Wavelet — The Music Guessing Game",
  tagline: "Little clips. Big music energy.",
  description:
    "How well do you know your music? Guess the track, artist, genre, or year from short song clips. Pick a crate, drop the needle, and find your groove with Wavelet.",
  productionUrl: "https://wavelet-azure.vercel.app",
} as const;

export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return new URL(url.origin);
    } catch {
      /* Fall back to the repository's published site. */
    }
  }
  return new URL(BRAND.productionUrl);
}
