/**
 * Shiprocket Checkout ("SRC", formerly Fastrr) - pure helpers.
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Implements Shiprocket's "Custom Website" integration as published in
 * "API Doc - SRC Custom Integration" (Postman). In short:
 *
 *   1. Catalogue (we expose, Shiprocket pulls)
 *        GET /api/shiprocket/catalog/products            ?page=1&limit=100
 *        GET /api/shiprocket/catalog/collections         ?page=1&limit=100
 *        GET /api/shiprocket/catalog/collection-products ?collection_id=..&page=1&limit=100
 *   2. Checkout session (we call Shiprocket)
 *        POST {base}/api/v1/access-token/checkout   headers X-Api-Key, X-Api-HMAC-SHA256
 *        -> result.token, then the browser calls HeadlessCheckout.addToCart(event, token, {fallbackUrl})
 *   3. Order result
 *        - Shiprocket POSTs the order to our registered webhook (may repeat), and
 *        - redirects the buyer to redirect_url?oid=..&ost=SUCCESS
 *        - failsafe: POST {base}/api/v1/custom-platform-order/details  {order_id, timestamp}
 *        - failsafe: POST {base}/api/v1/custom-platform-order/details/list
 *
 * SECURITY MODEL: the docs do not describe a signature on the inbound webhook, so
 * we never trust its body. The webhook (and the redirect) only supply an order id;
 * the order itself is always re-fetched from Shiprocket's authenticated Order
 * Details API using our key + secret. A forged webhook therefore cannot create an
 * order - at worst it makes us do one harmless lookup.
 *
 * This file only depends on node:crypto so it is unit-testable in isolation.
 */
import { createHmac } from 'node:crypto';

export const DEFAULT_API_BASE = 'https://checkout-api.shiprocket.com';
export const STAGING_API_BASE = 'https://fastrr-api-dev.pickrr.com';
export const UI_SCRIPT_URL = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
export const UI_STYLE_URL = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
// Shiprocket documents a separate staging UI bundle; loading the production one
// against staging credentials would fail, so the UI urls follow the API base.
export const STAGING_UI_SCRIPT_URL = 'https://customcheckoutfastrr.netlify.app/assets/js/channels/shopify.js';
export const STAGING_UI_STYLE_URL = 'https://customcheckoutfastrr.netlify.app/assets/styles/shopify.css';

export type ShiprocketEnvironment = 'production' | 'staging';

export const environmentForBase = (apiBase: string): ShiprocketEnvironment =>
  apiBase.replace(/\/$/, '') === STAGING_API_BASE ? 'staging' : 'production';

export function uiUrlsFor(apiBase: string): { env: ShiprocketEnvironment; scriptUrl: string; styleUrl: string } {
  const env = environmentForBase(apiBase);
  return env === 'staging'
    ? { env, scriptUrl: STAGING_UI_SCRIPT_URL, styleUrl: STAGING_UI_STYLE_URL }
    : { env, scriptUrl: UI_SCRIPT_URL, styleUrl: UI_STYLE_URL };
}

/**
 * Shiprocket requires products[].id and products[].variants[].id to be unique
 * "long" values. Our products have a single variant, so the variant id is the
 * product id shifted by a constant. That keeps the two id spaces disjoint and
 * lets us map a variant straight back to a product row without a lookup table.
 */
export const VARIANT_ID_OFFSET = 9_000_000_000;

export const variantIdForProduct = (productId: number | string): number => Number(productId) + VARIANT_ID_OFFSET;

export const productIdForVariant = (variantId: number | string): number | null => {
  const v = Number(variantId);
  if (!Number.isFinite(v)) return null;
  // Accept a bare product id too, so a catalogue synced before this offset still resolves.
  const pid = v >= VARIANT_ID_OFFSET ? v - VARIANT_ID_OFFSET : v;
  return Number.isInteger(pid) && pid > 0 ? pid : null;
};

export interface ShiprocketConfig {
  /** Credentials present AND not switched off by the env kill switch. This is what makes Shiprocket the default. */
  enabled: boolean;
  /** Credentials present (server side). */
  configured: boolean;
  /** Owner switched Shiprocket off via env (SHIPROCKET_CHECKOUT_ENABLED=false). */
  killed: boolean;
  apiKey: string;
  apiSecret: string;
  apiBase: string;
}

const OFF_VALUES = new Set(['false', '0', 'off', 'no', 'disabled']);

/** True when a flag value explicitly says "off". Unset / blank / anything else is NOT off. */
export const isOffValue = (v: unknown): boolean => OFF_VALUES.has(String(v ?? '').trim().toLowerCase());

/**
 * Read lazily so a missing var never breaks unrelated routes at build time.
 *
 * Default behaviour: once the API key + secret are present Shiprocket is the
 * primary checkout. There is no "turn it on" flag to forget. To switch it off
 * without removing keys set SHIPROCKET_CHECKOUT_ENABLED=false (the older
 * NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED=false is honoured too). A second,
 * no-redeploy kill switch lives in the site_settings table (see shiprocketRuntime).
 */
export function getShiprocketConfig(env: Record<string, string | undefined> = process.env): ShiprocketConfig {
  const apiKey = (env.SHIPROCKET_CHECKOUT_API_KEY || '').trim();
  const apiSecret = (env.SHIPROCKET_CHECKOUT_API_SECRET || '').trim();
  const apiBase = (env.SHIPROCKET_CHECKOUT_API_BASE || DEFAULT_API_BASE).trim().replace(/\/$/, '');
  const killed = isOffValue(env.SHIPROCKET_CHECKOUT_ENABLED) || isOffValue(env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED);
  const configured = !!apiKey && !!apiSecret;
  return { enabled: configured && !killed, configured, killed, apiKey, apiSecret, apiBase };
}

// ---------------------------------------------------------------------------
// HMAC (X-Api-HMAC-SHA256 = base64(HMAC-SHA256(secret, rawBody)))
// ---------------------------------------------------------------------------

export function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('base64');
}

// ---------------------------------------------------------------------------
// Outbound calls to Shiprocket
// ---------------------------------------------------------------------------

export interface SrCallResult<T = any> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

/** Signed POST to Shiprocket. The body string that is signed is the exact body that is sent. */
export async function srPost<T = any>(
  cfg: Pick<ShiprocketConfig, 'apiKey' | 'apiSecret' | 'apiBase'>,
  path: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000,
  opts: { addTimestamp?: boolean } = {},
): Promise<SrCallResult<T>> {
  const addTimestamp = opts.addTimestamp !== false;
  const body = JSON.stringify(addTimestamp ? { ...payload, timestamp: new Date().toISOString() } : payload);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${cfg.apiBase}${path}`, {
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
    if (res.ok && json?.ok !== false) return { ok: true, status: res.status, data: json };
    const msg = json?.error?.message || json?.error || json?.message || json?.result?.message || `Shiprocket returned ${res.status}`;
    return { ok: false, status: res.status, error: String(typeof msg === 'string' ? msg : JSON.stringify(msg)).slice(0, 300) };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? 'Shiprocket timed out' : (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

export interface CartLine {
  /** Our product id. */
  id: number;
  quantity: number;
}

/** Clamp + dedupe a client supplied cart. Prices are never read from the client. */
export function sanitizeCartLines(input: unknown, maxQty = 10, maxLines = 30): CartLine[] {
  if (!Array.isArray(input)) return [];
  const merged = new Map<number, number>();
  for (const raw of input.slice(0, maxLines)) {
    const id = Number((raw as any)?.id ?? (raw as any)?.product_id);
    const qty = Math.floor(Number((raw as any)?.quantity));
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
    merged.set(id, Math.min(maxQty, (merged.get(id) || 0) + qty));
  }
  return [...merged].map(([id, quantity]) => ({ id, quantity }));
}

export interface CheckoutSession {
  token: string;
  expiresAt?: string;
  srOrderId?: string;
}

/** POST /api/v1/access-token/checkout - creates the hosted-checkout session for a cart. */
export async function createCheckoutSession(
  cfg: ShiprocketConfig,
  args: {
    lines: CartLine[];
    redirectUrl: string;
    /** Our own coupon, applied as Shiprocket's fixed cart discount (overrides SR-side coupons). */
    discount?: { code: string; amount: number } | null;
    customAttributes?: Record<string, string>;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<SrCallResult<CheckoutSession>> {
  const cart_data: Record<string, unknown> = {
    items: args.lines.map((l) => ({ variant_id: String(variantIdForProduct(l.id)), quantity: l.quantity })),
    mobile_app: false,
  };
  if (args.customAttributes && Object.keys(args.customAttributes).length) cart_data.custom_attributes = args.customAttributes;
  if (args.discount && args.discount.amount > 0) {
    cart_data.cart_discount = { coupon_code: args.discount.code, amount: Number(args.discount.amount.toFixed(2)) };
  }
  const r = await srPost(cfg, '/api/v1/access-token/checkout', { cart_data, redirect_url: args.redirectUrl }, fetchImpl);
  if (!r.ok) return { ok: false, status: r.status, error: r.error };
  const result = r.data?.result;
  const token = result?.token;
  if (!token) return { ok: false, status: r.status, error: 'Shiprocket returned no token' };
  return {
    ok: true,
    status: r.status,
    data: { token: String(token), expiresAt: result?.expires_at, srOrderId: result?.data?.order_id },
  };
}

/** POST /api/v1/custom-platform-order/details - the authoritative order record. */
export async function fetchOrderDetails(
  cfg: ShiprocketConfig,
  srOrderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SrCallResult<any>> {
  const r = await srPost(cfg, '/api/v1/custom-platform-order/details', { order_id: srOrderId }, fetchImpl, 10000);
  if (!r.ok) return r;
  return { ok: true, status: r.status, data: r.data?.result ?? null };
}

/** POST /api/v1/custom-platform-order/details/list - for the pending-order failsafe job. */
export async function fetchOrderList(
  cfg: ShiprocketConfig,
  args: { startDate: string; endDate: string; status?: 'SUCCESS' | 'INITIATED'; page?: number; limit?: number },
  fetchImpl: typeof fetch = fetch,
): Promise<SrCallResult<{ total: number; data: Array<{ id: string; status: string }> }>> {
  const r = await srPost(
    cfg,
    '/api/v1/custom-platform-order/details/list',
    { startDate: args.startDate, endDate: args.endDate, status: args.status, limit: args.limit ?? 100, page: args.page ?? 0 },
    fetchImpl,
    10000,
  );
  if (!r.ok) return r;
  return { ok: true, status: r.status, data: r.data?.result };
}

/**
 * Catalogue push webhooks (our site -> Shiprocket). Shiprocket also PULLS our
 * catalogue, so these only keep its cache fresh after a price / stock change.
 * The body is the bare product / collection object (no extra fields).
 */
export async function pushProductWebhook(
  cfg: ShiprocketConfig,
  product: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<SrCallResult> {
  return srPost(cfg, '/wh/v1/custom/product', product, fetchImpl, 6000, { addTimestamp: false });
}

export async function pushCollectionWebhook(
  cfg: ShiprocketConfig,
  collection: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<SrCallResult> {
  return srPost(cfg, '/wh/v1/custom/collection', collection, fetchImpl, 6000, { addTimestamp: false });
}

// ---------------------------------------------------------------------------
// Catalogue mapping (our rows -> Shiprocket schema)
// ---------------------------------------------------------------------------

const absolute = (url: string | null | undefined, origin: string): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export interface SrCatalogProduct {
  id: number;
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
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    sku: string;
    quantity: number;
    created_at: string;
    updated_at: string;
    taxable: boolean;
    grams: number;
    weight: number;
    weight_unit: string;
    image: { src: string };
  }>;
  image: { src: string };
}

export function mapProductToShiprocket(p: any, origin: string): SrCatalogProduct {
  const price = Number(p.price) || 0;
  const mrp = Number(p.regular_price) || 0;
  const img = absolute(p.image_url || (Array.isArray(p.images) ? p.images[0] : ''), origin);
  const created = p.created_at || '2024-01-01T00:00:00Z';
  const updated = p.updated_at || created;
  const stock = p.stock_quantity;
  // Parcel weight used by iCarry bookings is 499 g (src/utils/shipping.ts).
  const grams = Number(p.weight_grams) > 0 ? Number(p.weight_grams) : 499;
  const desc = String(p.description || '');
  return {
    id: Number(p.id),
    title: String(p.title || ''),
    body_html: desc ? `<p>${desc.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : '',
    vendor: String(p.brand || 'Vyra Herbals'),
    product_type: String(p.category || ''),
    created_at: created,
    handle: String(p.handle || ''),
    updated_at: updated,
    tags: String(p.category || ''),
    status: 'active',
    variants: [
      {
        id: variantIdForProduct(p.id),
        title: 'Default Title',
        price: price.toFixed(2),
        compare_at_price: mrp > price ? mrp.toFixed(2) : null,
        sku: String(p.sku || p.handle || p.id),
        // NULL stock means "not tracked" for this store, so advertise plenty.
        quantity: typeof stock === 'number' && stock >= 0 ? stock : 100,
        created_at: created,
        updated_at: updated,
        taxable: true,
        grams,
        weight: grams / 1000,
        weight_unit: 'kg',
        image: { src: img },
      },
    ],
    image: { src: img },
  };
}

export interface SrCollection {
  id: number;
  updated_at: string;
  body_html: string;
  handle: string;
  image: { src: string };
  title: string;
  created_at: string;
}

/** Stable positive 31-bit id for a collection that has no numeric id of its own. */
export function stableNumericId(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2_000_000_000 + 1;
}

export function mapCategoryToCollection(c: any, origin: string): SrCollection {
  const handle = String(c.slug || c.handle || c.name || '');
  const created = c.created_at || '2024-01-01T00:00:00Z';
  return {
    id: Number.isFinite(Number(c.id)) && Number(c.id) > 0 ? Number(c.id) : stableNumericId(handle),
    updated_at: c.updated_at || created,
    body_html: c.description ? `<p>${String(c.description).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : '',
    handle,
    image: { src: absolute(c.image_url, origin) },
    title: String(c.name || c.title || handle),
    created_at: created,
  };
}

/** 1-based page + limit clamp shared by the three catalogue routes. */
export function parsePaging(search: URLSearchParams, maxLimit = 100): { page: number; limit: number; from: number; to: number } {
  const page = Math.max(1, Math.floor(Number(search.get('page'))) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(search.get('limit'))) || 100));
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit };
}

// ---------------------------------------------------------------------------
// Order mapping (Shiprocket order JSON -> what we need to create an `orders` row)
// ---------------------------------------------------------------------------

export interface MappedShiprocketOrder {
  srOrderId: string;
  txnId: string;
  status: string;
  /** True only when Shiprocket reports the order as complete (and, if prepaid, paid). */
  isComplete: boolean;
  skipReason?: string;
  lines: CartLine[];
  paymentMethod: 'cod' | 'online';
  /** What the customer owed in total (items - discounts + shipping + COD fee). */
  totalPayable: number;
  /** What was collected online (0 for pure COD). */
  amountPaid: number;
  subtotal: number;
  shippingCharges: number;
  codCharges: number;
  couponCodes: string[];
  couponDiscount: number;
  email: string;
  phone: string;
  shipping: Record<string, any>;
}

const digits10 = (v: unknown): string => String(v ?? '').replace(/\D/g, '').slice(-10);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number): number => Math.round(n * 100) / 100;

/**
 * Accepts either the webhook body (the order itself) or the Order Details API
 * response (`{ ok, result: {...} }`). Returns null when there is no order id.
 */
export function mapShiprocketOrder(raw: any): MappedShiprocketOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw.result && typeof raw.result === 'object' ? raw.result : raw;

  const srOrderId = String(o.order_id ?? '').trim();
  if (!srOrderId) return null;

  const rawItems: any[] = Array.isArray(o.cart_data?.items) ? o.cart_data.items : [];
  const merged = new Map<number, number>();
  for (const it of rawItems) {
    const pid = productIdForVariant(it?.variant_id);
    const qty = Math.floor(num(it?.quantity));
    if (pid && qty > 0) merged.set(pid, Math.min(99, (merged.get(pid) || 0) + qty));
  }
  const lines = [...merged].map(([id, quantity]) => ({ id, quantity }));

  const ship = o.shipping_address || {};
  const fullName = [ship.first_name, ship.last_name].map((s: any) => String(s ?? '').trim()).filter(Boolean).join(' ');
  // The address block carries a MASKED phone ("6302xxxxxx"); the top-level phone is the real one.
  const phone = digits10(o.phone) || digits10(ship.phone);
  const email = String(o.email || ship.email || '').trim();

  const paymentType = String(o.payment_type ?? '').toUpperCase();
  const paymentMethod: 'cod' | 'online' = paymentType === 'PREPAID' ? 'online' : 'cod';

  const payments: any[] = Array.isArray(o.payments) ? o.payments : [];
  const paidFromPayments = payments
    .filter((p) => /success/i.test(String(p?.payment_status ?? '')))
    .reduce((s, p) => s + num(p?.amount_received ?? p?.amount), 0);

  const totalPayable = money(num(o.total_amount_payable));
  const amountPaid = paymentMethod === 'online' ? money(paidFromPayments > 0 ? paidFromPayments : totalPayable) : money(paidFromPayments);

  const status = String(o.status ?? '').toUpperCase();
  const paymentStatus = String(o.payment_status ?? '');
  let skipReason: string | undefined;
  if (status !== 'SUCCESS') skipReason = `status=${status || 'unknown'}`;
  else if (paymentMethod === 'online' && paymentStatus && !/success/i.test(paymentStatus)) skipReason = `payment_status=${paymentStatus}`;
  else if (!lines.length) skipReason = 'no_recognised_items';

  return {
    srOrderId,
    txnId: `SR-${srOrderId}`,
    status,
    isComplete: !skipReason,
    skipReason,
    lines,
    paymentMethod,
    totalPayable,
    amountPaid,
    subtotal: money(num(o.subtotal_price)),
    shippingCharges: money(num(o.shipping_charges)),
    codCharges: money(num(o.cod_charges)),
    couponCodes: Array.isArray(o.coupon_codes) ? o.coupon_codes.map((c: any) => String(c)) : [],
    couponDiscount: money(num(o.coupon_discount)),
    email,
    phone,
    shipping: {
      fullName,
      phone,
      email,
      houseNumber: String(ship.line1 ?? '').trim(),
      area: String(ship.line2 ?? '').trim(),
      landmark: String(ship.landmark ?? '').trim(),
      pincode: String(ship.pincode ?? '').replace(/\D/g, '').slice(0, 6),
      city: String(ship.city ?? '').trim(),
      state: String(ship.state ?? '').trim(),
      country: String(ship.country ?? 'India').trim() || 'India',
      checkoutSource: 'shiprocket',
      srOrderId,
      srFastrrOrderId: o.fastrr_order_id != null ? String(o.fastrr_order_id) : undefined,
      srShippingPlan: o.shipping_plan || undefined,
      srShippingCharges: money(num(o.shipping_charges)),
      srCodCharges: money(num(o.cod_charges)),
      srRtoPrediction: o.rto_prediction || undefined,
      srEdd: o.edd || undefined,
    },
  };
}
