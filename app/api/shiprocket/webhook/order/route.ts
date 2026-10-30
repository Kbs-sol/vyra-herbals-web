import { NextResponse, after } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { enforceRateLimit } from '@/utils/rateLimit';
import { verifyWebhookToken } from '@/utils/shiprocketCheckout';
import { resolveShiprocketConfig } from '@/utils/shiprocketSettings';
import { finalizeShiprocketOrder } from '@/utils/shiprocketOrder';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 60;

/**
 * Order webhook - register this URL with Shiprocket:
 *   https://<your-domain>/api/shiprocket/webhook/order
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Shiprocket documents that webhooks "may be sent more than once", and the docs
 * describe no signature on them. So the body is treated purely as a hint: we
 * read the order id from it and then re-fetch the order from Shiprocket's
 * authenticated Order Details API. A forged request can therefore never create
 * or alter an order. Idempotent on txn_id = SR-<order id>.
 *
 * Response codes: 200 = handled (including "not a completed order, ignored");
 * 503 = a transient failure, so Shiprocket should redeliver. The pending-order
 * cron (/api/cron/shiprocket-pending) is the second safety net.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'shiprocket:webhook', 120, 60 * 1000);
  if (limited) return limited;

  const supabase = createServerSupabase();
  const cfg = await resolveShiprocketConfig(supabase);
  if (!cfg.configured) return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 });

  // Optional shared secret. Add a header `x-webhook-token: <token>` in Shiprocket
  // (Settings > Webhooks > Headers) and save the same token in /admin/shiprocket.
  // The order is still re-verified with Shiprocket either way; this just stops
  // strangers from making us spend API calls.
  const tokenHeader = req.headers.get('x-webhook-token') || req.headers.get('x-api-key');
  if (!verifyWebhookToken(tokenHeader, cfg.webhookToken)) {
    return NextResponse.json({ ok: false, error: 'bad token' }, { status: 401 });
  }

  const body: any = await req.json().catch(() => null);
  const srOrderId = String(body?.order_id ?? body?.result?.order_id ?? '').trim();
  if (!srOrderId) return NextResponse.json({ ok: false, error: 'order_id missing' }, { status: 400 });

  // Cheap pre-filter: only completed orders are worth a lookup.
  const hinted = String(body?.status ?? '').toUpperCase();
  if (hinted && hinted !== 'SUCCESS') return NextResponse.json({ ok: true, ignored: `status=${hinted}` });

  const result = await finalizeShiprocketOrder(supabase, cfg, srOrderId);

  if (!result.ok) {
    console.warn(`[shiprocket/webhook] order ${srOrderId} not finalized: ${result.reason}`);
    return NextResponse.json({ ok: !result.retryable, reason: result.reason }, { status: result.retryable ? 503 : 200 });
  }

  // Answer Shiprocket now; book the courier / send WhatsApp / fire CAPI afterwards.
  after(result.sideEffects);
  return NextResponse.json({ ok: true, order_id: result.order.id, duplicate: result.alreadyExisted });
}
