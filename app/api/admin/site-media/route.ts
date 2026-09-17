import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAdminJwtSecret } from '@/utils/serverEnv';
import { MEDIA_SLOT_META, getAllSiteMedia, type MediaSlot } from '@/utils/siteMedia';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin CRUD for site media slots (hero video, review videos, founder image,
 * default OG image). Storage lives in `site_settings` with keys of the form
 * `media_<slot>`. Value is JSONB: { url: string, kind?: string, updated_at?: ISO }
 *
 * When no row exists for a slot, the frontend resolver falls back to the
 * hardcoded / env-var default declared in `src/utils/siteMedia.ts`.
 */

async function verifyAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, getAdminJwtSecret());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

const VALID_SLOTS = new Set(Object.keys(MEDIA_SLOT_META));

// GET  → list every slot with current DB override + effective (fallback-aware) URL
export async function GET(_request: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const all = await getAllSiteMedia();
    return NextResponse.json({ success: true, data: all });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to load' }, { status: 500 });
  }
}

// PUT  → upsert a slot's URL. Body: { slot, url, kind? }. Empty url clears the override.
export async function PUT(request: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const slot = body.slot as MediaSlot;
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const kind = typeof body.kind === 'string' ? body.kind : MEDIA_SLOT_META[slot]?.defaultKind;

    if (!slot || !VALID_SLOTS.has(slot)) {
      return NextResponse.json({ success: false, error: `Invalid slot. Allowed: ${Array.from(VALID_SLOTS).join(', ')}` }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Empty URL = clear the override (delete the row so the fallback kicks back in)
    if (!url) {
      const { error: delErr } = await supabase
        .from('site_settings')
        .delete()
        .eq('key', `media_${slot}`);
      if (delErr && delErr.code !== '42P01') {
        console.error('[site-media] delete error:', delErr);
        return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, cleared: true, slot });
    }

    const payload = {
      key: `media_${slot}`,
      value: { url, kind, updated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('site_settings')
      .upsert(payload, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      console.error('[site-media] upsert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'site_settings table missing. Run once in Supabase SQL editor: CREATE TABLE site_settings (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());',
        }, { status: 500 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
