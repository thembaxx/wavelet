import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { BRAND, getSiteUrl } from '@/lib/brand';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const satoshi = localFont({
  src: '../public/fonts/Satoshi-Variable.woff2',
  weight: '300 900',
  variable: '--font-satoshi',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f2' },
    { media: '(prefers-color-scheme: dark)', color: '#102721' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: BRAND.title, template: '%s | Wavelet' },
  description: BRAND.description,
  applicationName: BRAND.name,
  category: 'games',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: BRAND.name,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: BRAND.title,
    description: BRAND.description,
    siteName: BRAND.name,
    locale: 'en_US',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.title,
    description: BRAND.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${satoshi.variable} antialiased`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /></head>
      <body
        suppressHydrationWarning
        data-state="title"
        className="font-sans overflow-hidden"
      >
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: BRAND.name,
          description: BRAND.description,
          url: getSiteUrl().href,
          image: new URL('/opengraph-image', getSiteUrl()).href,
          applicationCategory: 'GameApplication',
          genre: 'Music quiz',
          operatingSystem: 'Any',
          inLanguage: 'en',
          isAccessibleForFree: true,
          browserRequirements: 'JavaScript, Web Audio, and WebGL enabled',
        }).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  );
}
