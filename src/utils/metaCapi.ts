/**
 * Meta Conversions API (CAPI) — server-side backup for the browser Meta Pixel.
 *
 * Why this exists:
 *   Meta's browser Pixel is blocked or partial on ~20-40% of sessions today
 *   because of Safari's Intelligent Tracking Prevention, iOS 14+ ATT,
 *   ad-blockers, and now DPDP-driven consent banners. Every blocked event
 *   is a lost signal for Meta's attribution + ad optimisation. CAPI fixes
 *   this by POSTing the same event server-side, and Meta de-duplicates the
 *   pair using `event_id`.
 *
 * How to use:
 *   Alongside every browser-side `dispatch(...)` call for a KEY event
 *   (Purchase, InitiateCheckout, AddToCart, Lead, CompleteRegistration),
 *   fire `sendCapiEvent()` from the corresponding server route with the
 *   SAME `event_id`. The event_id is any UUID that survives the round-trip
 *   — we typically use the order id for Purchase, and a session-based UUID
 *   for the others.
 *
 * Env vars:
 *   META_CAPI_ACCESS_TOKEN         REQUIRED — from Events Manager → Settings
 *   NEXT_PUBLIC_META_PIXEL_ID      REQUIRED — the Pixel ID to attribute to
 *   META_CAPI_TEST_EVENT_CODE      Optional — start with "TEST" for QA
 *
 * If any required var is missing, the send is a no-op that logs a warning;
 * we NEVER throw, because a broken CAPI attempt must not fail a checkout.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from 'node:crypto';

interface CapiUserData {
  /** Email (any case, no whitespace) — hashed before sending. */
  email?: string;
  /** Phone in E.164 digits only — hashed before sending. */
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string; // ISO 3166-1 alpha-2, e.g. "in"
  external_id?: string; // your user id — hashed
  client_ip_address?: string;
  client_user_agent?: string;
  /** Meta's browser fbp / fbc cookie values — pulled from request headers. */
  fbp?: string;
  fbc?: string;
}

interface CapiCustomData {
  currency?: string;
  value?: number;
  content_type?: 'product' | 'product_group';
  content_ids?: (string | number)[];
  contents?: Array<{ id: string | number; quantity: number; item_price?: number }>;
  num_items?: number;
  order_id?: string;
  [k: string]: any;
}

export interface CapiEvent {
  event_name: 'Purchase' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Lead' | 'ViewContent' | 'CompleteRegistration' | 'Subscribe';
  /** Same UUID as the browser Pixel event so Meta can de-duplicate. */
  event_id: string;
  event_time?: number; // Unix seconds; defaults to now
  event_source_url?: string; // The URL where the event happened on the client
  action_source?: 'website';
  user_data: CapiUserData;
  custom_data?: CapiCustomData;
}

// -----------------------------------------------------------------------------
// Hashing — Meta requires SHA-256 lowercase-hex for PII fields.
// -----------------------------------------------------------------------------

function sha256(input?: string | null): string | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function hashUserData(u: CapiUserData): Record<string, string | undefined> {
  return {
    em: sha256(u.email),
    ph: sha256(u.phone?.replace(/\D/g, '')),
    fn: sha256(u.first_name),
    ln: sha256(u.last_name),
    ct: sha256(u.city),
    st: sha256(u.state),
    zp: sha256(u.zip),
    country: sha256(u.country),
    external_id: sha256(u.external_id),
    // Non-PII, kept as-is:
    client_ip_address: u.client_ip_address,
    client_user_agent: u.client_user_agent,
    fbp: u.fbp,
    fbc: u.fbc,
  };
}

// -----------------------------------------------------------------------------
// Send
// -----------------------------------------------------------------------------

export async function sendCapiEvent(event: CapiEvent): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!pixelId || !token) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[capi] skipped — missing NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN');
    }
    return { ok: false, error: 'missing_credentials' };
  }

  const payload: any = {
    data: [
      {
        event_name: event.event_name,
        event_time: event.event_time ?? Math.floor(Date.now() / 1000),
        event_id: event.event_id,
        event_source_url: event.event_source_url,
        action_source: event.action_source ?? 'website',
        user_data: hashUserData(event.user_data),
        custom_data: event.custom_data ?? {},
      },
    ],
  };
  if (testCode) payload.test_event_code = testCode;

  try {
    const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      console.warn('[capi] send failed:', msg);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[capi] network error:', (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}

// -----------------------------------------------------------------------------
// Convenience: Purchase event — the single most important CAPI signal.
// Call this from src/utils/orderFinalize.ts once payment is verified.
// -----------------------------------------------------------------------------

export async function capiPurchase(params: {
  order_id: string;
  total: number;
  currency?: string;
  items: Array<{ id: string | number; quantity: number; price: number }>;
  customer: { email?: string; phone?: string; first_name?: string; last_name?: string; city?: string; state?: string; zip?: string; country?: string; external_id?: string };
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  sourceUrl?: string;
}) {
  return sendCapiEvent({
    event_name: 'Purchase',
    event_id: `order_${params.order_id}`, // Must match the browser-side event_id
    event_source_url: params.sourceUrl,
    user_data: {
      ...params.customer,
      country: params.customer.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      currency: params.currency || 'INR',
      value: params.total,
      content_type: 'product',
      content_ids: params.items.map((i) => String(i.id)),
      contents: params.items.map((i) => ({ id: String(i.id), quantity: i.quantity, item_price: i.price })),
      num_items: params.items.reduce((n, i) => n + i.quantity, 0),
      order_id: params.order_id,
    },
  });
}
