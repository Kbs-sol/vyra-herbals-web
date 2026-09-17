import { NextRequest, NextResponse } from 'next/server';
import { getAllSiteMedia, getSiteMediaUrl, MEDIA_SLOT_META, type MediaSlot } from '@/utils/siteMedia';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min edge cache — only changes on admin edits

/**
 * Public read-only site-media lookup.
 *   /api/site-media                → { data: { slot: effectiveUrl, … } }
 *   /api/site-media?key=hero_video → { url: '<effective url>' }
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key) {
    if (!(key in MEDIA_SLOT_META)) {
      return NextResponse.json({ success: false, error: 'unknown slot' }, { status: 400 });
    }
    const u = await getSiteMediaUrl(key as MediaSlot);
    return NextResponse.json({ success: true, key, url: u });
  }
  const all = await getAllSiteMedia();
  const flat: Record<string, string> = {};
  for (const [slot, entry] of Object.entries(all)) {
    flat[slot] = entry.effective;
  }
  return NextResponse.json({ success: true, data: flat });
}
