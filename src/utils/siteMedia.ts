/**
 * Site-media resolver
 * -------------------
 * A tiny lookup helper that reads the `site_settings` table (key `media_<slot>`)
 * and falls back to a hard-coded / env-var default when the DB has no override.
 *
 *   getSiteMediaUrl('hero_video')
 *     → 1. `site_settings.value.url` for key `media_hero_video`, else
 *     → 2. process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_ID (URL or 11-char ID),
 *          else empty string.
 *
 * Because `site_settings` is JSONB, each media slot stores an object:
 *   { url: string, kind: 'youtube-id' | 'youtube-url' | 'mp4' | 'image', updated_at: ISO }
 *
 * Slots supported (keep this list in sync with the admin UI):
 *   - hero_video               → homepage hero YouTube video
 *   - review_video_1..5        → up to 5 testimonial/review videos
 *   - founder_image            → founder story photo (/about page)
 *   - og_image                 → default social-share image
 *
 * NOTE: This module is safe to import from server components. It reads via
 * the service-role Supabase client. Callers on the CLIENT side should hit
 * `/api/site-media?key=<slot>` instead (public read endpoint).
 */

import { createServerSupabase } from '@/utils/supabaseClient';

export type MediaSlot =
  | 'hero_video'
  | 'review_video_1'
  | 'review_video_2'
  | 'review_video_3'
  | 'review_video_4'
  | 'review_video_5'
  | 'founder_image'
  | 'og_image';

export interface SiteMediaValue {
  url: string;
  kind?: 'youtube-id' | 'youtube-url' | 'mp4' | 'image';
  updated_at?: string;
}

export const MEDIA_SLOT_META: Record<MediaSlot, {
  label: string;
  description: string;
  defaultKind: SiteMediaValue['kind'];
  fallbackEnv?: string;
  fallbackHardcoded?: string;
}> = {
  hero_video: {
    label: 'Homepage hero video',
    description: 'Plays on the homepage above the fold. Accepts a YouTube video ID (11 chars) or full URL.',
    defaultKind: 'youtube-id',
    fallbackEnv: 'NEXT_PUBLIC_HOME_HERO_VIDEO_ID',
  },
  review_video_1: {
    label: 'Review / testimonial video #1',
    description: 'Optional. Shown on the reviews carousel and product pages. YouTube ID or URL.',
    defaultKind: 'youtube-id',
  },
  review_video_2: {
    label: 'Review / testimonial video #2',
    description: 'Optional. Slot 2 of 5.',
    defaultKind: 'youtube-id',
  },
  review_video_3: {
    label: 'Review / testimonial video #3',
    description: 'Optional. Slot 3 of 5.',
    defaultKind: 'youtube-id',
  },
  review_video_4: {
    label: 'Review / testimonial video #4',
    description: 'Optional. Slot 4 of 5.',
    defaultKind: 'youtube-id',
  },
  review_video_5: {
    label: 'Review / testimonial video #5',
    description: 'Optional. Slot 5 of 5.',
    defaultKind: 'youtube-id',
  },
  founder_image: {
    label: 'Founder photo (/about page)',
    description: 'Public URL to the founder-story photo. JPG/PNG/WebP.',
    defaultKind: 'image',
    fallbackHardcoded: '/assets/images/vyra-founder.jpeg',
  },
  og_image: {
    label: 'Default social share image (OG)',
    description: 'Fallback OpenGraph image for pages that do not set their own.',
    defaultKind: 'image',
    fallbackHardcoded: '/assets/images/banner/og-image.jpg',
  },
};

const ALL_SLOTS: MediaSlot[] = Object.keys(MEDIA_SLOT_META) as MediaSlot[];

function resolveFallback(slot: MediaSlot): string {
  const meta = MEDIA_SLOT_META[slot];
  if (meta.fallbackEnv) {
    const v = process.env[meta.fallbackEnv];
    if (v) return v;
  }
  return meta.fallbackHardcoded || '';
}

/**
 * Server-side: fetch a single slot's URL. Falls back to env/hardcoded when
 * the DB row is missing or the override URL is blank.
 */
export async function getSiteMediaUrl(slot: MediaSlot): Promise<string> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', `media_${slot}`)
      .maybeSingle();
    if (error) {
      // Table missing (42P01) or transient error → silently fall through.
      // eslint-disable-next-line no-console
      if (error.code !== '42P01') console.warn('[siteMedia] read error:', error.message);
      return resolveFallback(slot);
    }
    const value = data?.value as SiteMediaValue | null | undefined;
    const url = (value?.url || '').trim();
    return url || resolveFallback(slot);
  } catch (e) {
    return resolveFallback(slot);
  }
}

/**
 * Server-side: fetch every slot at once (used by the admin Media Library page
 * and the /api/site-media list endpoint).
 */
export async function getAllSiteMedia(): Promise<Record<MediaSlot, {
  url: string;
  effective: string;
  hasOverride: boolean;
  fallbackFrom: 'env' | 'hardcoded' | 'none';
  meta: typeof MEDIA_SLOT_META[MediaSlot];
}>> {
  const result: any = {};
  let rows: Array<{ key: string; value: SiteMediaValue }> = [];
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .like('key', 'media_%');
    rows = (data as any[]) || [];
  } catch {
    rows = [];
  }
  const byKey = new Map(rows.map((r) => [r.key, r.value] as const));

  for (const slot of ALL_SLOTS) {
    const meta = MEDIA_SLOT_META[slot];
    const override = byKey.get(`media_${slot}`);
    const overrideUrl = (override?.url || '').trim();
    const fallback = resolveFallback(slot);
    result[slot] = {
      url: overrideUrl,
      effective: overrideUrl || fallback,
      hasOverride: !!overrideUrl,
      fallbackFrom: meta.fallbackEnv ? 'env' : meta.fallbackHardcoded ? 'hardcoded' : 'none',
      meta,
    };
  }
  return result;
}

/**
 * Convert a stored value into an embeddable YouTube ID.
 * Accepts raw 11-char id, youtu.be short, watch?v=…, or /embed/… URLs.
 */
export function toYouTubeId(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const watch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = s.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return s;
}
