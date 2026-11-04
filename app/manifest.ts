import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.title,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    categories: ["games", "music", "entertainment"],
    lang: "en",
    dir: "ltr",
    display_override: ["standalone", "minimal-ui"],
    prefer_related_applications: false,
    background_color: "#f7f8f2",
    theme_color: "#f7f8f2",
    shortcuts: [
      {
        name: "Start a new set",
        short_name: "New set",
        description: "Open your Wavelet music studio",
        url: "/",
        icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
