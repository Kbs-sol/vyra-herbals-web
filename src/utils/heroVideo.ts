import { getSiteMediaEntry, toYouTubeId } from '@/utils/siteMedia';
import { BRAND_DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, videoObjectJsonLd } from '@/utils/seo';

/**
 * Server-side description of the homepage hero video, shared by:
 *   - the VideoObject JSON-LD on the homepage (app/page.tsx)
 *   - the Google video sitemap (app/sitemap-video.xml/route.ts)
 *
 * Returns null when no hero video is configured, so callers emit nothing
 * rather than structured data that points at a video that is not on the page.
 */

export interface HeroVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  playerUrl: string; // https://www.youtube.com/embed/<id>
  watchUrl: string;
  uploadDate: string; // ISO 8601
  pageUrl: string; // page the video is embedded on
}

const DEFAULT_TITLE = 'Vyra Herbals — 100% natural handmade herbal hair oil, made in India';

/** Best-effort real title via YouTube oEmbed (no API key). Never throws. */
async function fetchYouTubeTitle(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    return json?.title?.trim() || null;
  } catch {
    return null;
  }
}

export async function getHeroVideo(): Promise<HeroVideoInfo | null> {
  const entry = await getSiteMediaEntry('hero_video');
  const id = toYouTubeId(entry.url);
  // toYouTubeId returns the raw string when it cannot parse; require a real ID.
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;

  const title = (await fetchYouTubeTitle(id)) || DEFAULT_TITLE;
  // Google requires an upload date. Prefer an explicit `uploaded_at`, else the
  // date the admin last saved the slot, else today.
  const uploadDate = (entry.uploadedAt || entry.updatedAt || new Date().toISOString()).slice(0, 10);

  return {
    id,
    title,
    description: `${title}. ${BRAND_DEFAULT_DESCRIPTION}`.slice(0, 2000),
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    playerUrl: `https://www.youtube.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    uploadDate,
    pageUrl: SITE_URL,
  };
}

export function heroVideoJsonLd(v: HeroVideoInfo) {
  return videoObjectJsonLd({
    name: v.title,
    description: v.description,
    thumbnailUrl: v.thumbnailUrl,
    uploadDate: v.uploadDate,
    embedUrl: v.playerUrl,
    publisher: SITE_NAME,
  });
}
