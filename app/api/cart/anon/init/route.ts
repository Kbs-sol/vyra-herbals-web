import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const COOKIE_NAME = 'anon_device_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days in seconds

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientFingerprint: string | undefined = body.fingerprint;

    const cookieStore = await cookies();
    let deviceId = cookieStore.get(COOKIE_NAME)?.value;

    // Use client fingerprint if provided and no cookie yet
    if (!deviceId && clientFingerprint && /^[a-f0-9]{64}$/.test(clientFingerprint)) {
      deviceId = clientFingerprint;
    }

    // Fallback: generate a random UUID-based device ID
    if (!deviceId) {
      deviceId = crypto.randomUUID().replace(/-/g, '');
    }

    const db = getSupabaseAdmin();

    // Upsert anon_carts row
    const { data: cart, error } = await db
      .from('anon_carts')
      .upsert(
        { device_id: deviceId, last_updated: new Date().toISOString() },
        { onConflict: 'device_id', ignoreDuplicates: false }
      )
      .select('id, items')
      .single();

    if (error) {
      console.error('[anon-cart-init] upsert error:', error);
      // Non-fatal — still set the cookie and return
    }

    const itemCount = Array.isArray(cart?.items) ? cart.items.length : 0;

    const response = NextResponse.json({ device_id: deviceId, cart_item_count: itemCount });
    response.cookies.set(COOKIE_NAME, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      // secure: true in production — Next.js sets this automatically in HTTPS environments
    });
    return response;
  } catch (err: any) {
    console.error('[anon-cart-init] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
