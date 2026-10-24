/**
 * Shiprocket Checkout ("Fastrr") - server-side helpers.
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Integration model ("custom / headless" channel):
 *
 *   1. Browser asks OUR server for a checkout token  (POST /api/shiprocket/token)
 *   2. Our server signs the cart with HMAC-SHA256 and calls
 *        POST {SHIPROCKET_CHECKOUT_API_BASE}/api/v1/access-token/checkout
 *      -> returns a short-lived token
 *   3. Browser calls window.HeadlessCheckout.addToCart(event, token, {fallbackUrl})
 *      (script: https://checkout-ui.shiprocket.com/assets/js/channels/custom.js)
 *      which opens Shiprocket's hosted checkout in an iframe (phone OTP login,
 *      saved addresses, UPI / cards / wallets / COD).
 *   4. Shiprocket pulls our catalogue      (GET /api/shiprocket/catalog/*)
 *   5. Shiprocket pushes the finished order (POST /api/shiprocket/webhook/order)
 *      -> we create the row in `orders`, book the iCarry shipment, send the
 *         WhatsApp confirmation and the Meta CAPI Purchase - exactly like the
 *         existing COD / Easebuzz flows.
 *
 * This file is deliberately dependency-free (only node:crypto) so the signing
 * and mapping logic can be unit-tested in isolation.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SHIPROCKET_SIGNATURE_HEADER = 'x-api-hmac-sha256';
export const SHIPROCKET_KEY_HEADER = 'x-api-key';

export interface ShiprocketConfig {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  apiBase: string;
}

/** Read config lazily so a missing var never breaks unrelated routes at build time. */
export function getShiprocketConfig(): ShiprocketConfig {
  const apiKey = (process.env.SHIPROCKET_CHECKOUT_API_KEY || '').trim();
  const apiSecret = (process.env.SHIPROCKET_CHECKOUT_API_SECRET || '').trim();
  const apiBase = (process.env.SHIPROCKET_CHECKOUT_API_BASE || 'https://checkout-api.shiprocket.com').replace(/\/$/, '');
  const flag = (process.env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED || '').trim().toLowerCase() === 'true';
  return { enabled: flag && !!apiKey && !!apiSecret, apiKey, apiSecret, apiBase };
}

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

/** base64(HMAC-SHA256(secret, payload)) - the format used in X-Api-HMAC-SHA256. */
export function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verify an inbound Shiprocket request (catalogue pull or order webhook).
 *
 * POST requests sign the raw body. For GET catalogue pulls there is no body, so
 * we accept a signature over any of: the raw query string (with / without the
 * leading "?"), the path + query, or the empty string. This keeps us tolerant of
 * the exact convention while still requiring knowledge of the shared secret.
 * Constant-time comparison; the optional X-Api-Key is checked when supplied.
 */
export function verifyShiprocketRequest(
  cfg: Pick<ShiprocketConfig, 'apiKey' | 'apiSecret'>,
  args: { signature: string | null; apiKey?: string | null; rawBody?: string; search?: string; pathAndQuery?: string },
): boolean {
  if (!cfg.apiSecret || !args.signature) return false;
  if (args.apiKey && cfg.apiKey && !safeEqual(args.apiKey, cfg.apiKey)) return false;

  const search = args.search || '';
  const candidates = new Set<string>();
  if (args.rawBody !== undefined && args.rawBody !== '') candidates.add(args.rawBody);
  else {
    candidates.add('');
    if (search) {
      candidates.add(search);
      candidates.add(search.replace(/^\?/, ''));
    }
    if (args.pathAndQuery) candidates.add(args.pathAndQuery);
  }
  for (const c of candidates) {
    if (safeEqual(signPayload(cfg.apiSecret, c), args.signature.trim())) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Access token (cart -> hosted checkout)
// ---------------------------------------------------------------------------

export interface CartLine {
  id: number | string;
  quantity: number;
}

/** Clamp + dedupe the client supplied cart. Never trusts prices (SR re-reads our catalogue). */
export function sanitizeCartLines(input: unknown, maxQty = 10, maxLines = 30): CartLine[] {
  if (!Array.isArray(input)) return [];
  const merged = new Map<string, number>();
  for (const raw of input.slice(0, maxLines)) {
    const id = String((raw as any)?.id ?? (raw as any)?.product_id ?? '').trim();
    const qty = Math.floor(Number((raw as any)?.quantity));
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || !Number.isFinite(qty) || qty <= 0) continue;
    merged.set(id, Math.min(maxQty, (merged.get(id) || 0) + qty));
  }
  return [...merged].map(([id, quantity]) => ({ id, quantity }));
}

export interface AccessTokenResult {
  ok: boolean;
  token?: string;
  status?: number;
  error?: string;
}

export async function requestAccessToken(
  cfg: ShiprocketConfig,
  lines: CartLine[],
  redirectUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AccessTokenResult> {
  const body = JSON.stringify({
    cart_data: { items: lines.map((l) => ({ variant_id: String(l.id), quantity: l.quantity })) },
    redirect_url: redirectUrl,
    timestamp: new Date().toISOString(),
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(`${cfg.apiBase}/api/v1/access-token/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': cfg.apiKey,
        'X-Api-HMAC-SHA256': signPayload(cfg.apiSecret, body),
      },
      body,
      signal: ctrl.signal,
    });
    const json: any = await res.json().catch(() => ({}));
    const token = json?.result?.token ?? json?.token ?? json?.data?.token ?? json?.result?.access_token ?? json?.access_token;
    if (res.ok && token) return { ok: true, token: String(token), status: res.status };
    return {
      ok: false,
      status: res.status,
      error: String(json?.result?.message || json?.message || json?.result || json?.error || `Shiprocket returned ${res.status}`).slice(0, 300),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? 'Shiprocket timed out' : (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Catalogue mapping (our products -> Shiprocket product schema)
// ---------------------------------------------------------------------------

export interface SrCatalogProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  tags: string;
  status: 'active';
  variants: Array<{
    id: string;
    title: string;
    price: string;
    compare_at_price: string | null;
    sku: string;
    quantity: number;
    created_at: string;
    updated_at: string;
    image: { src: string };
    weight: number;
  }>;
  image: { src: string };
}

const absolute = (url: string | null | undefined, origin: string): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export function mapProductToShiprocket(p: any, origin: string): SrCatalogProduct {
  const price = Number(p.price) || 0;
  const mrp = Number(p.regular_price) || 0;
  const img = absolute(p.image_url || (Array.isArray(p.images) ? p.images[0] : ''), origin);
  const created = p.created_at || new Date(0).toISOString();
  const updated = p.updated_at || created;
  const stock = p.stock_quantity;
  return {
    id: String(p.id),
    title: String(p.title || ''),
    body_html: String(p.description || ''),
    vendor: String(p.brand || 'Vyra Herbals'),
    product_type: String(p.category || ''),
    created_at: created,
    handle: String(p.handle || ''),
    updated_at: updated,
    tags: '',
    status: 'active',
    variants: [
      {
        id: String(p.id),
        title: 'Default Title',
        price: price.toFixed(2),
        compare_at_price: mrp > price ? mrp.toFixed(2) : null,
        sku: String(p.sku || p.handle || p.id),
        // Treat NULL stock as "plenty" - the store does not track stock on every row.
        quantity: typeof stock === 'number' && stock >= 0 ? stock : 100,
        created_at: created,
        updated_at: updated,
        image: { src: img },
        weight: Number(p.weight) > 0 ? Number(p.weight) : 0.25,
      },
    ],
    image: { src: img },
  };
}

// ---------------------------------------------------------------------------
// Order webhook mapping (Shiprocket order -> our `orders` row)
// ---------------------------------------------------------------------------

export interface MappedShiprocketOrder {
  srOrderId: string;
  txnId: string;
  lines: CartLine[];
  paymentMethod: 'cod' | 'online';
  totalPayable: number;
  amountPaid: number;
  shipping: Record<string, any>;
  email: string;
  phone: string;
  skip?: string;
}

const FAILED = /fail|cancel|abandon|declin|expire|pending_payment|unpaid/i;

const digits10 = (v: unknown): string => String(v ?? '').replace(/\D/g, '').slice(-10);

export function mapShiprocketOrder(payload: any): MappedShiprocketOrder | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload.order && typeof payload.order === 'object' ? payload.order : payload;

  const srOrderId = String(root.order_id ?? root.id ?? root.sr_order_id ?? root.checkout_order_id ?? '').trim();
  if (!srOrderId) return null;

  const rawItems: any[] =
    root.cart_data?.items || root.items || root.line_items || root.products || [];
  const lines = sanitizeCartLines(
    rawItems.map((i: any) => ({ id: i.variant_id ?? i.product_id ?? i.id, quantity: i.quantity ?? i.qty })),
    99,
  );

  const ship = root.shipping_address || root.shippingAddress || root.address || {};
  const first = String(ship.first_name ?? ship.firstName ?? '').trim();
  const last = String(ship.last_name ?? ship.lastName ?? '').trim();
  const fullName = String(ship.name || `${first} ${last}`).trim() || String(root.customer_name || root.name || '').trim();
  const phone = digits10(ship.phone ?? root.phone ?? root.customer_phone);
  const email = String(ship.email ?? root.email ?? root.customer_email ?? '').trim();
  const address1 = String(ship.address1 ?? ship.address_line_1 ?? ship.address ?? '').trim();
  const address2 = String(ship.address2 ?? ship.address_line_2 ?? '').trim();

  const rawPay = String(root.payment_type ?? root.payment_method ?? root.paymentType ?? '').toUpperCase();
  const paymentMethod: 'cod' | 'online' = /COD|CASH/.test(rawPay) ? 'cod' : 'online';

  const totalPayable = Number(
    root.total_amount_payable ?? root.total_amount ?? root.total_price ?? root.amount ?? 0,
  ) || 0;
  const explicitPaid = Number(root.amount_paid ?? root.paid_amount ?? root.prepaid_amount);
  const amountPaid = paymentMethod === 'online' ? totalPayable : Number.isFinite(explicitPaid) && explicitPaid > 0 ? explicitPaid : 0;

  const status = String(root.status ?? root.order_status ?? root.payment_status ?? '');
  const skip = status && FAILED.test(status) ? `status=${status}` : undefined;

  return {
    srOrderId,
    txnId: `SR-${srOrderId}`,
    lines,
    paymentMethod,
    totalPayable,
    amountPaid,
    email,
    phone,
    skip,
    shipping: {
      fullName,
      phone,
      email,
      houseNumber: address1,
      area: address2,
      landmark: String(ship.landmark ?? '').trim(),
      pincode: String(ship.pincode ?? ship.zip ?? ship.postal_code ?? '').replace(/\D/g, '').slice(0, 6),
      city: String(ship.city ?? '').trim(),
      state: String(ship.state ?? '').trim(),
      country: String(ship.country ?? 'India').trim() || 'India',
      checkoutSource: 'shiprocket',
      srOrderId,
    },
  };
}
