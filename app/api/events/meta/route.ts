import { NextResponse } from 'next/server';
import {
  extractCapiContext,
  capiViewContent,
  capiAddToCart,
  capiInitiateCheckout,
  capiSearch,
  capiCompleteRegistration,
  capiLead,
  sendCapiEvent,
  type CapiEventName,
} from '@/utils/metaCapi';

/**
 * /api/events/meta — server-side mirror for the browser Meta Pixel.
 *
 * Purpose
 * -------
 * The browser Pixel loses 20–40% of events to iOS ITP, ad-blockers, CSP,
 * and now DPDP consent gating. This endpoint receives a lightweight beacon
 * from the browser (fired via `navigator.sendBeacon` from analytics.ts's
 * `sendCapiMirror`), then re-fires the SAME event server-side via Meta's
 * Conversions API. Meta de-duplicates the pair using `event_id`.
 *
 * Security posture
 * ----------------
 * - No PII is ever accepted from the browser body (email/phone). If the
 *   caller wants a match on those, they must be logged in and we look up
 *   the row from Supabase using the session cookie. Emails / phones sent
 *   from the client are IGNORED — we don't trust untrusted user_data.
 * - Rate-limited per-IP to soft-cap malicious flooding of Meta's Graph.
 * - Runs in Node runtime because `metaCapi.ts` uses `node:crypto`.
 *
 * Contract (POST JSON)
 * --------------------
 *   {
 *     "event_name": "AddToCart" | "ViewContent" | "InitiateCheckout" | ...,
 *     "event_id": "<same id the browser used>",
 *     "event_source_url": "https://vyraherbals.com/product/hair-oil-100ml",
 *     ...event-specific fields (product_id, total, items, query, method, source)
 *   }
 *
 * Responses:
 *   200 { ok: true }               — event forwarded (or silently skipped)
 *   400 { ok: false, error: "..." } — malformed payload
 *   429 { ok: false }              — rate-limited
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// In-process rate limiter (small allowance; a legit user fires < 20 events/min).
// This is a lightweight defence — the real ceiling is Meta's own dedup + rate
// limits. On serverless the map is per-instance which is fine here.
// -----------------------------------------------------------------------------

const RATE: Map<string, { count: number; reset: number }> = new Map();
const WINDOW_MS = 60_000;
const LIMIT = 60;

function limited(ip: string): boolean {
  const now = Date.now();
  const bucket = RATE.get(ip);
  if (!bucket || bucket.reset < now) {
    RATE.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > LIMIT;
}

// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  const ctx = extractCapiContext(req);
  const ip = ctx.ip || 'unknown';
  if (limited(ip)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const event_name = String(body?.event_name || '') as CapiEventName;
  const event_id = String(body?.event_id || '');
  const event_source_url: string | undefined = typeof body?.event_source_url === 'string' ? body.event_source_url : req.headers.get('referer') || undefined;

  if (!event_name || !event_id) {
    return NextResponse.json({ ok: false, error: 'missing_event_name_or_id' }, { status: 400 });
  }

  // Common request context. We do NOT accept any PII from the caller.
  const requestCtx = {
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    fbp: ctx.fbp,
    fbc: ctx.fbc,
    sourceUrl: event_source_url,
  };

  try {
    let result;
    switch (event_name) {
      case 'ViewContent':
        result = await capiViewContent({
          event_id,
          product_id: body.product_id,
          product_title: body.product_title,
          category: body.category,
          price: Number(body.price ?? 0) || undefined,
          ...requestCtx,
        });
        break;

      case 'AddToCart':
        result = await capiAddToCart({
          event_id,
          product_id: body.product_id,
          product_title: body.product_title,
          category: body.category,
          price: Number(body.price ?? 0),
          quantity: Number(body.quantity ?? 1),
          ...requestCtx,
        });
        break;

      case 'AddToWishlist':
        result = await sendCapiEvent({
          event_name: 'AddToWishlist',
          event_id,
          event_source_url,
          user_data: {
            country: 'in',
            client_ip_address: requestCtx.ip,
            client_user_agent: requestCtx.userAgent,
            fbp: requestCtx.fbp,
            fbc: requestCtx.fbc,
          },
          custom_data: {
            currency: 'INR',
            value: Number(body.price ?? 0),
            content_type: 'product',
            content_ids: [String(body.product_id)],
            content_name: body.product_title,
          },
        });
        break;

      case 'InitiateCheckout':
        result = await capiInitiateCheckout({
          event_id,
          total: Number(body.total ?? 0),
          items: Array.isArray(body.items) ? body.items : [],
          ...requestCtx,
        });
        break;

      case 'AddPaymentInfo':
        result = await sendCapiEvent({
          event_name: 'AddPaymentInfo',
          event_id,
          event_source_url,
          user_data: {
            country: 'in',
            client_ip_address: requestCtx.ip,
            client_user_agent: requestCtx.userAgent,
            fbp: requestCtx.fbp,
            fbc: requestCtx.fbc,
          },
          custom_data: {
            currency: 'INR',
            value: Number(body.total ?? 0),
            content_type: 'product',
            content_ids: (body.items || []).map((i: any) => String(i.id)),
            contents: (body.items || []).map((i: any) => ({ id: String(i.id), quantity: i.quantity ?? 1, item_price: i.price })),
            num_items: (body.items || []).reduce((n: number, i: any) => n + (i.quantity || 1), 0),
          },
        });
        break;

      case 'Search':
        result = await capiSearch({
          event_id,
          query: String(body.query || ''),
          ...requestCtx,
        });
        break;

      case 'CompleteRegistration':
        result = await capiCompleteRegistration({
          event_id,
          method: body.method,
          ...requestCtx,
        });
        break;

      case 'Lead':
      case 'Contact':
      case 'Subscribe':
        result = await capiLead({
          event_id,
          source: body.source,
          value: Number(body.value ?? 0),
          ...requestCtx,
        });
        break;

      case 'Purchase':
        // Purchase MUST be fired server-side from orderFinalize.ts where we
        // have verified totals + customer PII. Ignoring a browser mirror
        // avoids attribution risk from a spoofed value.
        return NextResponse.json({ ok: true, skipped: 'purchase_is_server_only' });

      default:
        // Unknown events are silently accepted → 200 so the beacon doesn't retry.
        return NextResponse.json({ ok: true, skipped: 'unknown_event' });
    }

    if (!result?.ok) {
      // 200 anyway — never let a Meta outage break user flows / cause the
      // sendBeacon to retry (it does not retry, but keepalive fetches might).
      return NextResponse.json({ ok: false, error: result?.error || 'send_failed' }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Absolute belt-and-braces — this route must never surface 5xx.
    console.warn('[api/events/meta] unexpected error:', (err as Error).message);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 200 });
  }
}

// GET is used by uptime checks; return a tiny JSON.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: '/api/events/meta' });
}
