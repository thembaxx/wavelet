import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/brand';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: getSiteUrl().href, changeFrequency: 'weekly', priority: 1 }];
}
