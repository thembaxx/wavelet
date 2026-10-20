import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { BRAND, getSiteUrl } from '@/lib/brand';
import './globals.css';

const satoshi = localFont({
  src: '../public/fonts/Satoshi-Variable.woff2',
  weight: '300 900',
  variable: '--font-satoshi',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#F1F1F1',
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
      className={`${satoshi.variable} bg-[#F1F1F1] text-[#000000] antialiased`}
    >
      <body
        suppressHydrationWarning
        data-state="title"
        className="bg-[#F1F1F1] font-sans text-[#000000] overflow-hidden"
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
