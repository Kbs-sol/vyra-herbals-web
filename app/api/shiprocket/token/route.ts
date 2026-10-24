import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { getAuthedUser } from '@/utils/apiAuth';
import { enforceRateLimit } from '@/utils/rateLimit';
import { validateCoupon } from '@/utils/coupons';
import { isInactiveStatus } from '@/utils/catalogue';
import { createCheckoutSession, getShiprocketConfig, sanitizeCartLines } from '@/utils/shiprocketCheckout';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';

/**
 * Start a Shiprocket Checkout session for the visitor's cart.
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * The browser only sends {id, quantity} pairs. Prices never come from the
 * client: Shiprocket reads them from our catalogue (/api/shiprocket/catalog/*),
 * and the order is re-priced from the database when it is finalized. Guests are
 * allowed - Shiprocket's own OTP login identifies the buyer - and a signed-in
 * visitor's account is remembered so the order lands in their order history.
 */
export async function POST(req: Request) {
  const cfg = getShiprocketConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: 'Shiprocket Checkout is not enabled.' }, { status: 503 });
  }

  const limited = enforceRateLimit(req, 'shiprocket:token', 20, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const lines = sanitizeCartLines(body?.items);
    if (!lines.length) return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });

    const supabase = createServerSupabase();

    const { data: rows, error } = await supabase
      .from('products')
      .select('*')
      .in('id', lines.map((l) => l.id));
    if (error) {
      console.error('[shiprocket/token] product lookup failed:', error.message);
      return NextResponse.json({ error: 'Could not verify your cart. Please try again.' }, { status: 502 });
    }
    const byId = new Map((rows || []).map((p: any) => [Number(p.id), p]));
    for (const l of lines) {
      const p = byId.get(l.id);
      if (!p || isInactiveStatus(p.status)) {
        return NextResponse.json({ error: 'An item in your cart is no longer available.' }, { status: 400 });
      }
    }

    const user = await getAuthedUser(req, supabase);

    // Our own coupon becomes Shiprocket's fixed cart discount. Re-validated here
    // from database prices; the client never supplies an amount.
    let discount: { code: string; amount: number } | null = null;
    if (body?.couponCode) {
      const result = await validateCoupon(
        supabase,
        String(body.couponCode),
        lines.map((l) => ({ id: l.id, price: Number(byId.get(l.id).price) || 0, quantity: l.quantity })),
        user?.id || null,
      );
      if (result.ok && result.discount > 0) discount = { code: result.coupon.code, amount: result.discount };
    }

    const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || new URL(req.url).origin).replace(/\/$/, '');
    const session = await createCheckoutSession(cfg, {
      lines,
      redirectUrl: `${origin}/shiprocket/return`,
      discount,
    });
    if (!session.ok || !session.data) {
      console.error('[shiprocket/token] session failed:', session.status, session.error);
      return NextResponse.json({ error: 'Shiprocket checkout is unavailable right now.' }, { status: 502 });
    }

    // Remember who started this checkout so the finished order can be attached
    // to their account. Best effort - the order is still created without it.
    if (session.data.srOrderId && (user?.id || discount)) {
      try {
        await supabase.from('order_sessions').insert([
          {
            txn_id: `SR-${session.data.srOrderId}`,
            payload: { source: 'shiprocket', userId: user?.id || null, couponCode: discount?.code || null },
          },
        ]);
      } catch (e) {
        console.warn('[shiprocket/token] could not store session link:', (e as Error).message);
      }
    }

    return NextResponse.json({ token: session.data.token, expires_at: session.data.expiresAt || null });
  } catch (err) {
    console.error('[shiprocket/token] exception:', err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
