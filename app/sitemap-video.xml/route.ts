import { NextResponse } from 'next/server';
import { getHeroVideo } from '@/utils/heroVideo';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

/**
 * Google video sitemap — https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps
 *
 * Lists only videos that are actually embedded on the listed page. Today that
 * is the homepage hero video. (The review_video_* slots in /admin/media are
 * not rendered on any public page yet, so they are intentionally NOT listed.)
 *
 * With no hero video configured this returns a valid, empty <urlset>.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const v = await getHeroVideo();

  const entries = v
    ? `  <url>
    <loc>${esc(v.pageUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${esc(v.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${esc(v.title.slice(0, 100))}</video:title>
      <video:description>${esc(v.description.slice(0, 2048))}</video:description>
      <video:player_loc>${esc(v.playerUrl)}</video:player_loc>
      <video:publication_date>${esc(v.uploadDate)}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
    </video:video>
  </url>
`
    : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries}</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=900, stale-while-revalidate=3600',
    },
  });
}
