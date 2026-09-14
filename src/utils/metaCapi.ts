/**
 * Meta Conversions API (CAPI) — server-side backup for the browser Meta Pixel.
 *
 * Why this exists
 * ---------------
 * Meta's browser Pixel is blocked or partial on ~20-40% of sessions today
 * because of Safari's Intelligent Tracking Prevention, iOS 14+ ATT,
 * ad-blockers, and now DPDP-driven consent banners. Every blocked event is
 * a lost signal for Meta's attribution + ad optimisation. CAPI fixes this
 * by POSTing the same event server-side, and Meta de-duplicates the pair
 * using `event_id` + `event_name` + `pixel_id`.
 *
 * How to use
 * ----------
 * Alongside every browser-side `dispatch(...)` call for a KEY event
 * (Purchase, InitiateCheckout, AddToCart, ViewContent, Lead,
 * CompleteRegistration), fire the matching helper (`capiPurchase`,
 * `capiInitiateCheckout`, `capiAddToCart`, `capiViewContent`,
 * `capiLead`, `capiCompleteRegistration`) from the corresponding server
 * route with the SAME `event_id`. The event_id is any UUID that survives
 * the round-trip — we typically use:
 *   - `order_<id>` for Purchase (order id is stable + unique)
 *   - a stable session UUID for the others (`buildEventId('atc', productId)`)
 *
 * The browser side must call `fbq('track', 'EventName', params, { eventID })`
 * — this SDK signature is what wires the dedup key. See
 * src/utils/analytics.ts → `dispatch()` which now accepts an `event_id`.
 *
 * Env vars
 * --------
 *   META_CAPI_ACCESS_TOKEN         REQUIRED — from Events Manager → Settings
 *   NEXT_PUBLIC_META_PIXEL_ID      REQUIRED — the Pixel ID to attribute to
 *   META_CAPI_TEST_EVENT_CODE      Optional — start with "TEST" for QA
 *   META_ADS_PIXEL_ID              Optional — second (ads) pixel; server-side
 *                                            events fire against this too
 *   META_CAPI_API_VERSION          Optional — defaults to v18.0
 *
 * If any required var is missing, the send is a no-op that logs a warning;
 * we NEVER throw, because a broken CAPI attempt must not fail a checkout.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from 'node:crypto';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
  content_name?: string;
  content_category?: string;
  contents?: Array<{ id: string | number; quantity: number; item_price?: number }>;
  num_items?: number;
  order_id?: string;
  search_string?: string;
  status?: string;
  [k: string]: any;
}

export type CapiEventName =
  | 'Purchase'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Lead'
  | 'ViewContent'
  | 'CompleteRegistration'
  | 'Search'
  | 'Contact'
  | 'Subscribe';

export interface CapiEvent {
  event_name: CapiEventName;
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
  const clean = String(input).trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/** Meta requires phone in E.164 digits only (no plus, no dashes, no spaces). */
function normalisePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  // Indian numbers: strip leading 0 if it's a 11-digit 0-prefixed local number.
  // If they are 10 digits and start with 6–9, prefix 91.
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

function hashUserData(u: CapiUserData): Record<string, string | undefined> {
  return {
    em: sha256(u.email),
    ph: sha256(normalisePhone(u.phone)),
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

/**
 * Build a stable event_id that both the browser and server sides can generate
 * without coordination. Use the same call on both sides.
 *
 *   const id = buildEventId('atc', productId, userId);
 *   fbq('track', 'AddToCart', params, { eventID: id });
 *   await capiAddToCart({ event_id: id, ... });
 */
export function buildEventId(prefix: string, ...parts: Array<string | number | undefined>): string {
  const clean = parts.filter(Boolean).map(String).join(':');
  const hash = crypto.createHash('sha1').update(`${prefix}:${clean}:${Date.now()}`).digest('hex').slice(0, 16);
  return `${prefix}_${hash}`;
}

// -----------------------------------------------------------------------------
// Extract fbp / fbc / ip / UA from a Next.js Request
// -----------------------------------------------------------------------------

/**
 * Pull the four browser-side dedup keys out of a fetch Request. Callers should
 * pass the Request the App-Router route handler received.
 *
 * `fbp` is Meta's first-party cookie set by fbevents.js on load.
 * `fbc` is present when the visitor arrived from a Meta ad click (`fbclid`).
 */
export function extractCapiContext(req: Request | { headers: Headers | Record<string, string | string[] | undefined> }): {
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
} {
  const headers = req.headers instanceof Headers ? req.headers : new Headers(
    Object.entries(req.headers).reduce<Record<string, string>>((acc, [k, v]) => {
      if (Array.isArray(v)) acc[k] = v.join(',');
      else if (v !== undefined) acc[k] = String(v);
      return acc;
    }, {})
  );

  const cookieHeader = headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  for (const chunk of cookieHeader.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq === -1) continue;
    const k = chunk.slice(0, eq).trim();
    const v = chunk.slice(eq + 1).trim();
    if (k) cookies[k] = decodeURIComponent(v);
  }

  const ip =
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    (headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    undefined;

  return {
    fbp: cookies['_fbp'] || undefined,
    fbc: cookies['_fbc'] || undefined,
    ip: ip || undefined,
    userAgent: headers.get('user-agent') || undefined,
  };
}

// -----------------------------------------------------------------------------
// Core send
// -----------------------------------------------------------------------------

const API_VERSION = process.env.META_CAPI_API_VERSION || 'v18.0';

async function sendToPixel(pixelId: string, token: string, event: CapiEvent): Promise<{ ok: boolean; error?: string }> {
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;

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
    const url = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Meta's Graph API rarely takes long. If it does, don't block the caller.
      signal: AbortSignal.timeout(4000),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      console.warn(`[capi] ${pixelId} send failed:`, msg);
      return { ok: false, error: msg };
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[capi] ${event.event_name} → pixel ${pixelId} ok · event_id=${event.event_id}`);
    }
    return { ok: true };
  } catch (err) {
    console.warn(`[capi] ${pixelId} network error:`, (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}

export async function sendCapiEvent(event: CapiEvent): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const adsPixelId = process.env.META_ADS_PIXEL_ID || process.env.NEXT_PUBLIC_META_ADS_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const adsToken = process.env.META_ADS_CAPI_ACCESS_TOKEN || token;

  if (!pixelId || !token) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[capi] skipped — missing NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN');
    }
    return { ok: false, error: 'missing_credentials' };
  }

  // Fire against the primary pixel. If a distinct ads pixel is configured,
  // fan-out the event there too (fire-and-forget — one failure must not
  // shadow the other's success).
  const [primary, secondary] = await Promise.all([
    sendToPixel(pixelId, token, event),
    adsPixelId && adsPixelId !== pixelId && adsToken
      ? sendToPixel(adsPixelId, adsToken, event)
      : Promise.resolve({ ok: true } as { ok: boolean; error?: string }),
  ]);

  if (!primary.ok) return primary;
  if (!secondary.ok) {
    // Log but don't fail the caller — primary pixel already succeeded.
    console.warn('[capi] ads pixel send failed:', secondary.error);
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Convenience helpers — one per Meta standard event
// -----------------------------------------------------------------------------

interface CustomerContext {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  external_id?: string;
}

interface RequestContext {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  sourceUrl?: string;
}

/**
 * PURCHASE — the single most important CAPI signal for ad optimisation.
 * Fire from src/utils/orderFinalize.ts once payment is verified.
 */
export async function capiPurchase(params: {
  order_id: string | number;
  total: number;
  currency?: string;
  items: Array<{ id: string | number; quantity: number; price: number; category?: string; title?: string }>;
  customer: CustomerContext;
  event_id?: string;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'Purchase',
    event_id: params.event_id || `order_${params.order_id}`,
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
      value: Number(params.total),
      content_type: 'product',
      content_ids: params.items.map((i) => String(i.id)),
      contents: params.items.map((i) => ({ id: String(i.id), quantity: i.quantity, item_price: i.price })),
      num_items: params.items.reduce((n, i) => n + i.quantity, 0),
      order_id: String(params.order_id),
    },
  });
}

export async function capiInitiateCheckout(params: {
  event_id: string;
  total: number;
  currency?: string;
  items: Array<{ id: string | number; quantity: number; price: number }>;
  customer?: CustomerContext;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'InitiateCheckout',
    event_id: params.event_id,
    event_source_url: params.sourceUrl,
    user_data: {
      ...(params.customer || {}),
      country: params.customer?.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      currency: params.currency || 'INR',
      value: Number(params.total),
      content_type: 'product',
      content_ids: params.items.map((i) => String(i.id)),
      contents: params.items.map((i) => ({ id: String(i.id), quantity: i.quantity, item_price: i.price })),
      num_items: params.items.reduce((n, i) => n + i.quantity, 0),
    },
  });
}

export async function capiAddToCart(params: {
  event_id: string;
  product_id: string | number;
  product_title?: string;
  category?: string;
  price: number;
  quantity?: number;
  currency?: string;
  customer?: CustomerContext;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'AddToCart',
    event_id: params.event_id,
    event_source_url: params.sourceUrl,
    user_data: {
      ...(params.customer || {}),
      country: params.customer?.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      currency: params.currency || 'INR',
      value: Number(params.price) * Number(params.quantity ?? 1),
      content_type: 'product',
      content_ids: [String(params.product_id)],
      content_name: params.product_title,
      content_category: params.category,
      contents: [{ id: String(params.product_id), quantity: params.quantity ?? 1, item_price: params.price }],
    },
  });
}

export async function capiViewContent(params: {
  event_id: string;
  product_id: string | number;
  product_title?: string;
  category?: string;
  price?: number;
  currency?: string;
  customer?: CustomerContext;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'ViewContent',
    event_id: params.event_id,
    event_source_url: params.sourceUrl,
    user_data: {
      ...(params.customer || {}),
      country: params.customer?.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      currency: params.currency || 'INR',
      value: Number(params.price ?? 0),
      content_type: 'product',
      content_ids: [String(params.product_id)],
      content_name: params.product_title,
      content_category: params.category,
    },
  });
}

/**
 * LEAD — fire on newsletter signup, OTP request, WhatsApp click, contact
 * form. Meta optimises Lead campaigns against this signal specifically.
 */
export async function capiLead(params: {
  event_id: string;
  source?: string; // "newsletter" | "whatsapp" | "contact-form" | "otp"
  value?: number;
  customer?: CustomerContext;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'Lead',
    event_id: params.event_id,
    event_source_url: params.sourceUrl,
    user_data: {
      ...(params.customer || {}),
      country: params.customer?.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      currency: 'INR',
      value: Number(params.value ?? 0),
      content_category: params.source,
    },
  });
}

export async function capiCompleteRegistration(params: {
  event_id: string;
  method?: string;
  customer?: CustomerContext;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'CompleteRegistration',
    event_id: params.event_id,
    event_source_url: params.sourceUrl,
    user_data: {
      ...(params.customer || {}),
      country: params.customer?.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      content_category: params.method || 'phone',
      status: 'completed',
    },
  });
}

export async function capiSearch(params: {
  event_id: string;
  query: string;
  customer?: CustomerContext;
} & RequestContext) {
  return sendCapiEvent({
    event_name: 'Search',
    event_id: params.event_id,
    event_source_url: params.sourceUrl,
    user_data: {
      ...(params.customer || {}),
      country: params.customer?.country || 'in',
      client_ip_address: params.ip,
      client_user_agent: params.userAgent,
      fbp: params.fbp,
      fbc: params.fbc,
    },
    custom_data: {
      search_string: params.query,
    },
  });
}
