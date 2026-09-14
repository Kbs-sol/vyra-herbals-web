/**
 * Central analytics helper.
 *
 * The SEO audit's #1 CRITICAL finding was "0 tracked conversions" — GA4
 * loaded, `trackEvent` existed, but nothing in the app ever called it.
 * This file now exports narrow, well-named e-commerce helpers so call-sites
 * (Add-to-cart button, cart page, checkout page, order-placed page) drop in
 * with a single import.
 *
 * Rules for callers:
 *   - Use the named helpers (`viewItem`, `addToCart`, `beginCheckout`,
 *     `purchase`) — NOT `trackEvent` with a magic string.
 *   - `purchase()` must be fired exactly once per order. Idempotency lives
 *     on the /order-placed page (see how it's wired there).
 *   - `value` fields are numeric rupee amounts.
 *   - Server-side Conversions API is emitted from src/utils/metaCapi.ts —
 *     browser side alone loses 20–40% of events. See SYSTEM_LITERACY.md.
 */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || 'G-K0F7N513MS';
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';
export const META_ADS_PIXEL_ID = process.env.NEXT_PUBLIC_META_ADS_PIXEL_ID || '';

// Kept for backward compatibility — a few old imports reference `FB_PIXEL_ID`.
export const FB_PIXEL_ID = META_PIXEL_ID;

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: any;
    clarity?: (...args: any[]) => void;
  }
}

// -----------------------------------------------------------------------------
// Types — kept loose because product rows come from an untyped Supabase table.
// -----------------------------------------------------------------------------

export interface AnalyticsItem {
  item_id: string | number;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  item_variant?: string;
  quantity?: number;
  price?: number;
}

export interface EcomPayload {
  currency?: string;
  value?: number;
  items?: AnalyticsItem[];
  [k: string]: any;
}

// -----------------------------------------------------------------------------
// Raw dispatch — used by the named helpers below.
// -----------------------------------------------------------------------------

/**
 * Build a stable event_id for a browser-side Meta Pixel event that also
 * matches the server-side CAPI event's `event_id`. Meta de-duplicates the
 * pair using `event_id` + `event_name` + `pixel_id`, so BOTH sides must
 * carry the same value.
 *
 * For known-stable identifiers (order_id, session_id + product_id), pass
 * them explicitly; otherwise the helper will generate one and store it in
 * sessionStorage so a subsequent server-side call from the same page load
 * can retrieve it via `getStoredEventId()`.
 */
export function buildEventId(prefix: string, ...parts: Array<string | number | undefined>): string {
  const clean = parts.filter(Boolean).map(String).join(':');
  // Short random suffix keeps repeats-within-a-session distinguishable while
  // remaining short enough for logging.
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as any).randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${clean ? clean.replace(/[^a-zA-Z0-9]+/g, '') + '_' : ''}${rand}`;
}

export function storeEventId(key: string, eventId: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`_vh_evt_${key}`, eventId);
  } catch {
    // Private-mode Safari throws on sessionStorage.set — non-fatal.
  }
}

export function getStoredEventId(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return sessionStorage.getItem(`_vh_evt_${key}`) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * `metaName` is the Meta Pixel standard-event name; `ga4Name` is the GA4
 * recommended event name (they diverge — GA4 uses snake_case, Meta uses
 * CamelCase). If either is missing we skip that side.
 *
 * Pass `opts.eventId` when the event has a matching server-side CAPI send.
 * Meta's browser Pixel accepts it as the third `fbq('track', ...)` argument's
 * `eventID` property — that's the dedup key server side.
 */
export function dispatch(
  ga4Name: string | null,
  metaName: string | null,
  params: Record<string, any> = {},
  opts: { eventId?: string } = {}
) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (ga4Name && window.gtag) {
    try {
      window.gtag('event', ga4Name, params);
    } catch (err) {
      console.warn('[analytics] gtag failed:', err);
    }
  }

  // GTM dataLayer (kept alongside gtag for anyone using GTM-based custom triggers)
  if (window.dataLayer) {
    window.dataLayer.push({ event: ga4Name || metaName || 'analytics_event', ...params, ...(opts.eventId ? { event_id: opts.eventId } : {}) });
  }

  // Meta Pixel (both primary and optional ads pixel)
  if (metaName && window.fbq) {
    const std = ['AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration','Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout','Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication','Subscribe','ViewContent'];
    const method = std.includes(metaName) ? 'track' : 'trackCustom';
    // fbq's signature: fbq(method, name, params?, options?) — the options object
    // is where `eventID` goes so Meta can de-dup against the CAPI event.
    const fbqOpts = opts.eventId ? { eventID: opts.eventId } : undefined;
    try {
      if (fbqOpts) window.fbq(method, metaName, params, fbqOpts);
      else window.fbq(method, metaName, params);
      if (META_ADS_PIXEL_ID) {
        if (fbqOpts) window.fbq('trackSingle', META_ADS_PIXEL_ID, metaName, params, fbqOpts);
        else window.fbq('trackSingle', META_ADS_PIXEL_ID, metaName, params);
      }
    } catch (err) {
      console.warn('[analytics] fbq failed:', err);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[analytics] GA4=${ga4Name || '-'} · Meta=${metaName || '-'} · event_id=${opts.eventId || '-'}`, params);
  }
}

// -----------------------------------------------------------------------------
// E-commerce event helpers — call these from the app
// -----------------------------------------------------------------------------

export function viewItem(item: AnalyticsItem & { currency?: string; value?: number; eventId?: string }) {
  const eventId = item.eventId || buildEventId('vc', item.item_id);
  storeEventId(`view_${item.item_id}`, eventId);
  const payload = {
    currency: item.currency || 'INR',
    value: Number(item.value ?? item.price ?? 0),
    items: [
      {
        item_id: String(item.item_id),
        item_name: item.item_name,
        item_category: item.item_category,
        item_brand: item.item_brand || 'Vyra Herbals',
        price: item.price,
        quantity: item.quantity ?? 1,
      },
    ],
    content_type: 'product',
    content_ids: [String(item.item_id)],
    content_name: item.item_name,
    content_category: item.item_category,
  };
  dispatch('view_item', 'ViewContent', payload, { eventId });
  // Fire-and-forget CAPI mirror
  sendCapiMirror('ViewContent', { event_id: eventId, product_id: item.item_id, product_title: item.item_name, category: item.item_category, price: item.price });
}

export function addToCart(item: AnalyticsItem & { currency?: string; value?: number; eventId?: string }) {
  const value = Number(item.value ?? (Number(item.price ?? 0) * Number(item.quantity ?? 1)));
  const eventId = item.eventId || buildEventId('atc', item.item_id);
  storeEventId(`atc_${item.item_id}`, eventId);
  const payload = {
    currency: item.currency || 'INR',
    value,
    items: [
      {
        item_id: String(item.item_id),
        item_name: item.item_name,
        item_category: item.item_category,
        item_brand: item.item_brand || 'Vyra Herbals',
        price: item.price,
        quantity: item.quantity ?? 1,
      },
    ],
    content_type: 'product',
    content_ids: [String(item.item_id)],
    content_name: item.item_name,
    content_category: item.item_category,
  };
  dispatch('add_to_cart', 'AddToCart', payload, { eventId });
  sendCapiMirror('AddToCart', {
    event_id: eventId,
    product_id: item.item_id,
    product_title: item.item_name,
    category: item.item_category,
    price: Number(item.price ?? 0),
    quantity: item.quantity ?? 1,
  });
}

export function removeFromCart(item: AnalyticsItem & { value?: number; currency?: string }) {
  dispatch('remove_from_cart', null, {
    currency: item.currency || 'INR',
    value: Number(item.value ?? (Number(item.price ?? 0) * Number(item.quantity ?? 1))),
    items: [
      {
        item_id: String(item.item_id),
        item_name: item.item_name,
        item_category: item.item_category,
        quantity: item.quantity ?? 1,
        price: item.price,
      },
    ],
  });
}

export function viewCart(payload: EcomPayload) {
  dispatch('view_cart', null, {
    currency: payload.currency || 'INR',
    value: Number(payload.value ?? 0),
    items: payload.items || [],
  });
}

export function addToWishlist(item: AnalyticsItem) {
  const eventId = buildEventId('atw', item.item_id);
  dispatch('add_to_wishlist', 'AddToWishlist', {
    currency: 'INR',
    value: Number(item.price ?? 0),
    items: [{ item_id: String(item.item_id), item_name: item.item_name, quantity: 1, price: item.price }],
    content_type: 'product',
    content_ids: [String(item.item_id)],
    content_name: item.item_name,
  }, { eventId });
  sendCapiMirror('AddToWishlist', {
    event_id: eventId,
    product_id: item.item_id,
    product_title: item.item_name,
    price: Number(item.price ?? 0),
  });
}

export function beginCheckout(payload: EcomPayload & { eventId?: string }) {
  const eventId = payload.eventId || buildEventId('ic');
  storeEventId('ic', eventId);
  dispatch('begin_checkout', 'InitiateCheckout', {
    currency: payload.currency || 'INR',
    value: Number(payload.value ?? 0),
    items: payload.items || [],
    coupon: payload.coupon,
    num_items: (payload.items || []).reduce((n, i) => n + (i.quantity || 1), 0),
    content_type: 'product',
    content_ids: (payload.items || []).map((i) => String(i.item_id)),
  }, { eventId });
  sendCapiMirror('InitiateCheckout', {
    event_id: eventId,
    total: Number(payload.value ?? 0),
    items: (payload.items || []).map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, price: Number(i.price ?? 0) })),
  });
}

export function addPaymentInfo(payload: EcomPayload & { payment_type?: string; eventId?: string }) {
  const eventId = payload.eventId || buildEventId('api');
  dispatch('add_payment_info', 'AddPaymentInfo', {
    currency: payload.currency || 'INR',
    value: Number(payload.value ?? 0),
    payment_type: payload.payment_type,
    items: payload.items || [],
  }, { eventId });
  sendCapiMirror('AddPaymentInfo', {
    event_id: eventId,
    total: Number(payload.value ?? 0),
    items: (payload.items || []).map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, price: Number(i.price ?? 0) })),
  });
}

export function purchase(payload: EcomPayload & { transaction_id: string; tax?: number; shipping?: number; coupon?: string; eventId?: string }) {
  // Purchase uses `order_<transaction_id>` as its event_id so the server-side
  // CAPI Purchase (fired from src/utils/orderFinalize.ts) can dedupe against
  // it without any extra coordination.
  const eventId = payload.eventId || `order_${payload.transaction_id}`;
  dispatch('purchase', 'Purchase', {
    transaction_id: payload.transaction_id,
    currency: payload.currency || 'INR',
    value: Number(payload.value ?? 0),
    tax: payload.tax,
    shipping: payload.shipping,
    coupon: payload.coupon,
    items: payload.items || [],
    content_type: 'product',
    content_ids: (payload.items || []).map((i) => String(i.item_id)),
    num_items: (payload.items || []).reduce((n, i) => n + (i.quantity || 1), 0),
  }, { eventId });
  // NB: no browser-side CAPI mirror for Purchase — the SERVER fires that from
  // orderFinalize.ts where we have the full customer PII + txn integrity.
}

export function search(query: string) {
  const eventId = buildEventId('search');
  dispatch('search', 'Search', { search_term: query }, { eventId });
  sendCapiMirror('Search', { event_id: eventId, query });
}

export function signUp(method?: string) {
  const eventId = buildEventId('cr');
  dispatch('sign_up', 'CompleteRegistration', { method: method || 'phone' }, { eventId });
  sendCapiMirror('CompleteRegistration', { event_id: eventId, method: method || 'phone' });
}

// -----------------------------------------------------------------------------
// Browser → server CAPI mirror
// -----------------------------------------------------------------------------

/**
 * Fire a fire-and-forget POST to /api/events/meta so the same event that just
 * hit the browser Meta Pixel is also relayed via the server-side Conversions
 * API. The route pulls fbp/fbc/IP/UA from the request itself, so we only send
 * the event-specific payload here.
 *
 * We use `navigator.sendBeacon` when available (survives page unload from a
 * checkout redirect) and fall back to fetch with `keepalive: true`.
 *
 * Rules:
 *  - Never throw. A broken mirror must not affect UX.
 *  - Skip in dev when META_CAPI creds aren't set (the endpoint no-ops anyway
 *    but we save a request).
 */
function sendCapiMirror(event_name: string, payload: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    event_name,
    event_source_url: window.location.href,
    ...payload,
  });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/events/meta', blob);
      if (ok) return;
    }
    // Fallback
    fetch('/api/events/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => { /* swallow */ });
  } catch {
    // never propagate
  }
}

// -----------------------------------------------------------------------------
// Legacy exports — the `trackEvent` name is already imported in existing
// components. Keep it working during the transition; internally it routes
// through the named helpers above so GA4 + Meta both receive events.
// -----------------------------------------------------------------------------

/** @deprecated Use the named helpers above (`viewItem`, `addToCart`, etc). */
export const trackEvent = (eventName: string, eventData: Record<string, any> = {}) => {
  const map: Record<string, [string | null, string | null]> = {
    ViewContent: ['view_item', 'ViewContent'],
    AddToCart: ['add_to_cart', 'AddToCart'],
    AddToWishlist: ['add_to_wishlist', 'AddToWishlist'],
    InitiateCheckout: ['begin_checkout', 'InitiateCheckout'],
    AddPaymentInfo: ['add_payment_info', 'AddPaymentInfo'],
    Purchase: ['purchase', 'Purchase'],
    Search: ['search', 'Search'],
    CompleteRegistration: ['sign_up', 'CompleteRegistration'],
    Lead: ['generate_lead', 'Lead'],
  };
  const [ga4Name, metaName] = map[eventName] || [null, eventName];

  // For Purchase the caller passes `transaction_id`; we use `order_<txn>`
  // to match the server-side CAPI event_id.
  let eventId: string | undefined;
  if (eventName === 'Purchase' && eventData.transaction_id) {
    eventId = `order_${eventData.transaction_id}`;
  } else if (metaName) {
    // Everything else gets a fresh short id so the server can dedupe if the
    // browser also mirrors it.
    const idBase = eventData.content_ids?.[0] || eventData.transaction_id;
    eventId = buildEventId(metaName.slice(0, 4).toLowerCase(), idBase);
  }
  dispatch(ga4Name, metaName, eventData, { eventId });

  // Mirror the important events to CAPI (Purchase already handled server-side)
  if (eventId && metaName && metaName !== 'Purchase') {
    const mirrorPayload: Record<string, any> = { event_id: eventId };
    if (metaName === 'AddToCart' || metaName === 'ViewContent' || metaName === 'AddToWishlist') {
      mirrorPayload.product_id = eventData.content_ids?.[0] || eventData.item_id;
      mirrorPayload.product_title = eventData.content_name || eventData.item_name;
      mirrorPayload.category = eventData.content_category;
      mirrorPayload.price = eventData.value ?? 0;
      mirrorPayload.quantity = eventData.quantity ?? 1;
    } else if (metaName === 'InitiateCheckout' || metaName === 'AddPaymentInfo') {
      mirrorPayload.total = eventData.value ?? 0;
      mirrorPayload.items = (eventData.items || []).map((i: any) => ({
        id: i.item_id || i.id,
        quantity: i.quantity ?? 1,
        price: Number(i.price ?? 0),
      }));
    } else if (metaName === 'Search') {
      mirrorPayload.query = eventData.search_term;
    } else if (metaName === 'CompleteRegistration') {
      mirrorPayload.method = eventData.method;
    } else if (metaName === 'Lead') {
      mirrorPayload.source = eventData.source;
      mirrorPayload.value = eventData.value ?? 0;
    }
    sendCapiMirror(metaName, mirrorPayload);
  }
};

/** @deprecated Handled centrally by AnalyticsLoader. */
export const pageview = () => {
  if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'PageView');
  if (typeof window !== 'undefined' && window.dataLayer) window.dataLayer.push({ event: 'pageview' });
};
