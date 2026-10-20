import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#0D0914',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Vinyl Rush 30s — 3D Isometric Song Quiz',
  description:
    'A 3D isometric music-guessing party game with physics-driven vinyl turntables, real song snippets, animated mood gradients, reactive mascot GrooveBot, and Spotify & Apple Music integration.',
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
      'A 3D isometric music-guessing party game with physics-driven vinyl turntables, real song snippets, animated mood gradients, reactive mascot GrooveBot, and Spotify & Apple Music integration.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinyl Rush 30s — 3D Isometric Song Quiz',
    description:
      'A 3D isometric music-guessing party game with physics-driven vinyl turntables, real song snippets, animated mood gradients, reactive mascot GrooveBot, and Spotify & Apple Music integration.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${jetbrainsMono.variable} bg-[#0D0914] text-white antialiased`}
    >
      <body
        suppressHydrationWarning
        data-state="title"
        className="bg-[#0D0914] font-sans text-white overflow-hidden"
      >
        {children}
      </body>
    </html>
  );
}
