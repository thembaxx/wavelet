import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/'] },
    sitemap: new URL('/sitemap.xml', getSiteUrl()).href,
  };
}
