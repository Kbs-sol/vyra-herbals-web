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
 * `metaName` is the Meta Pixel standard-event name; `ga4Name` is the GA4
 * recommended event name (they diverge — GA4 uses snake_case, Meta uses
 * CamelCase). If either is missing we skip that side.
 */
export function dispatch(ga4Name: string | null, metaName: string | null, params: Record<string, any> = {}) {
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
    window.dataLayer.push({ event: ga4Name || metaName || 'analytics_event', ...params });
  }

  // Meta Pixel (both primary and optional ads pixel)
  if (metaName && window.fbq) {
    const std = ['AddPaymentInfo','AddToCart','AddToWishlist','CompleteRegistration','Contact','CustomizeProduct','Donate','FindLocation','InitiateCheckout','Lead','Purchase','Schedule','Search','StartTrial','SubmitApplication','Subscribe','ViewContent'];
    const method = std.includes(metaName) ? 'track' : 'trackCustom';
    try {
      window.fbq(method, metaName, params);
      if (META_ADS_PIXEL_ID) window.fbq('trackSingle', META_ADS_PIXEL_ID, metaName, params);
    } catch (err) {
      console.warn('[analytics] fbq failed:', err);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[analytics] GA4=${ga4Name || '-'} · Meta=${metaName || '-'}`, params);
  }
}

// -----------------------------------------------------------------------------
// E-commerce event helpers — call these from the app
// -----------------------------------------------------------------------------

export function viewItem(item: AnalyticsItem & { currency?: string; value?: number }) {
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
  dispatch('view_item', 'ViewContent', payload);
}

export function addToCart(item: AnalyticsItem & { currency?: string; value?: number }) {
  const value = Number(item.value ?? (Number(item.price ?? 0) * Number(item.quantity ?? 1)));
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
  dispatch('add_to_cart', 'AddToCart', payload);
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
  dispatch('add_to_wishlist', 'AddToWishlist', {
    currency: 'INR',
    value: Number(item.price ?? 0),
    items: [{ item_id: String(item.item_id), item_name: item.item_name, quantity: 1, price: item.price }],
    content_type: 'product',
    content_ids: [String(item.item_id)],
    content_name: item.item_name,
  });
}

export function beginCheckout(payload: EcomPayload) {
  dispatch('begin_checkout', 'InitiateCheckout', {
    currency: payload.currency || 'INR',
    value: Number(payload.value ?? 0),
    items: payload.items || [],
    coupon: payload.coupon,
    num_items: (payload.items || []).reduce((n, i) => n + (i.quantity || 1), 0),
    content_type: 'product',
    content_ids: (payload.items || []).map((i) => String(i.item_id)),
  });
}

export function addPaymentInfo(payload: EcomPayload & { payment_type?: string }) {
  dispatch('add_payment_info', 'AddPaymentInfo', {
    currency: payload.currency || 'INR',
    value: Number(payload.value ?? 0),
    payment_type: payload.payment_type,
    items: payload.items || [],
  });
}

export function purchase(payload: EcomPayload & { transaction_id: string; tax?: number; shipping?: number; coupon?: string }) {
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
  });
}

export function search(query: string) {
  dispatch('search', 'Search', { search_term: query });
}

export function signUp(method?: string) {
  dispatch('sign_up', 'CompleteRegistration', { method: method || 'phone' });
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
  };
  const [ga4Name, metaName] = map[eventName] || [null, eventName];
  dispatch(ga4Name, metaName, eventData);
};

/** @deprecated Handled centrally by AnalyticsLoader. */
export const pageview = () => {
  if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'PageView');
  if (typeof window !== 'undefined' && window.dataLayer) window.dataLayer.push({ event: 'pageview' });
};
