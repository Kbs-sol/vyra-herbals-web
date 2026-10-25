import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { enforceRateLimit } from '@/utils/rateLimit';
import { getShiprocketConfig } from '@/utils/shiprocketCheckout';
import { finalizeShiprocketOrder } from '@/utils/shiprocketOrder';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 60;

/**
 * Called by /shiprocket/return after Shiprocket redirects the buyer back with
 * ?oid=<order id>&ost=SUCCESS. It races the webhook; whichever arrives first
 * creates the order and the other finds it (idempotent). The order id is the
 * credential here: it is a 24-char random id known only to the buyer's browser
 * and Shiprocket, and the order is verified against Shiprocket before use.
 */
export async function POST(req: Request) {
  const cfg = getShiprocketConfig();
  if (!cfg.configured) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const limited = enforceRateLimit(req, 'shiprocket:finalize', 20, 10 * 60 * 1000);
  if (limited) return limited;

  const body: any = await req.json().catch(() => ({}));
  const oid = String(body?.oid || '').trim();
  if (!oid) return NextResponse.json({ error: 'oid required' }, { status: 400 });

  const supabase = createServerSupabase();
  const result = await finalizeShiprocketOrder(supabase, cfg, oid);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason, retryable: result.retryable }, { status: result.retryable ? 503 : 404 });
  }

  // The buyer is waiting on this response, but only the durable order matters to
  // them: run the courier / WhatsApp / CAPI work to completion before returning
  // only when this call created the order (the webhook may have done it already).
  if (!result.alreadyExisted) await result.sideEffects();

  const ship = result.order?.shipping_data || {};
  return NextResponse.json({
    order_id: result.order.id,
    email: ship.email || null,
    signed_in_order: !!result.order.user_id,
    scope: result.scope,
  });
}
