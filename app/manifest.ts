import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '365 Vinyl Rush — 3D Isometric Music Quiz',
    short_name: 'VinylRush',
    description:
      '3D isometric music-guessing studio with Track, Artist, Genre, and Year modes, physics turntable, reactive mascot, and Spotify & Apple Music integration.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F1F1F1',
    theme_color: '#F1F1F1',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
