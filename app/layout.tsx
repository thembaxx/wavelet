import type { Metadata, Viewport } from 'next';
import { Urbanist, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#F1F1F1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Vinyl Rush 30s — 3D Isometric Song Quiz',
  description:
    'A mobile-first 3D isometric music-guessing game with physics-driven turntables, real song snippets, tactile sound and haptic feedback, and Spotify & Apple Music integration.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VinylRush',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Vinyl Rush 30s — 3D Isometric Song Quiz',
    description:
      'A mobile-first 3D isometric music-guessing game with physics-driven turntables, real song snippets, tactile sound and haptic feedback, and Spotify & Apple Music integration.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinyl Rush 30s — 3D Isometric Song Quiz',
    description:
      'A mobile-first 3D isometric music-guessing game with physics-driven turntables, real song snippets, tactile sound and haptic feedback, and Spotify & Apple Music integration.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${urbanist.variable} ${jetbrainsMono.variable} bg-[#F1F1F1] text-[#000000] antialiased`}
    >
      <body
        suppressHydrationWarning
        data-state="title"
        className="bg-[#F1F1F1] font-sans text-[#000000] overflow-hidden"
      >
        {children}
      </body>
    </html>
  );
}
