/**
 * Analytics helper — GTM-first architecture.
 *
 * SINGLE SOURCE OF TRUTH: All analytics vendors (GA4, Meta Pixel, Microsoft
 * Clarity, Google Ads, TikTok Pixel, LinkedIn Insight, etc.) are configured
 * INSIDE Google Tag Manager (container GTM-MHSG926J). Do NOT hardcode any
 * vendor snippet in the app. The app's only responsibility is to push
 * well-structured events into `window.dataLayer`; GTM tags then fan those
 * events out to every configured vendor.
 *
 * Why this matters:
 *  - Double-loading GA4 or Meta Pixel outside GTM (as the app did before)
 *    causes duplicate PageView / Purchase events and inflated conversion
 *    numbers in GA4 and Meta Ads Manager.
 *  - Managing tags in GTM alone means marketing can add / pause / debug
 *    vendors without any code change.
 *
 * Event payload conventions (GA4 Enhanced Ecommerce compatible):
 *  - Ecommerce events push `{ event, ecommerce: { currency, value, items } }`.
 *  - A `null`-ing push (`ecommerce: null`) is emitted BEFORE each ecommerce
 *    event, per Google's guidance, so the previous event's items don't leak
 *    into the next one.
 *  - Meta Pixel-style params (`content_ids`, `content_type`, `content_name`)
 *    are also included so a Meta Pixel tag in GTM can consume the same
 *    dataLayer push without a separate code path.
 */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MHSG926J';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

type Primitive = string | number | boolean | null | undefined;

export interface EcommerceItem {
  item_id: string | number;
  item_name?: string;
  item_category?: string;
  item_brand?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  [key: string]: Primitive;
}

/**
 * Push a raw event to the dataLayer. Prefer the typed helpers below.
 */
export const pushToDataLayer = (payload: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[dataLayer]', payload);
  }
};

/**
 * Reset the `ecommerce` object before pushing a new ecommerce event.
 * Required by GA4 so successive events don't inherit each other's items.
 */
const resetEcommerce = () => {
  pushToDataLayer({ ecommerce: null });
};

/**
 * Meta Pixel standard event name → GA4 recommended event name.
 * When a caller passes the Meta name we also emit the GA4 name so GTM
 * triggers configured with either convention keep working.
 */
const META_TO_GA4: Record<string, string> = {
  AddPaymentInfo: 'add_payment_info',
  AddToCart: 'add_to_cart',
  AddToWishlist: 'add_to_wishlist',
  CompleteRegistration: 'sign_up',
  Contact: 'contact',
  InitiateCheckout: 'begin_checkout',
  Lead: 'generate_lead',
  Purchase: 'purchase',
  Search: 'search',
  Subscribe: 'subscribe',
  ViewContent: 'view_item',
  PageView: 'page_view',
};

// Reverse map, populated once, for callers that use the GA4 convention.
const GA4_TO_META: Record<string, string> = Object.fromEntries(
  Object.entries(META_TO_GA4).map(([meta, ga4]) => [ga4, meta])
);

/**
 * Push a custom or standard event to GTM.
 *
 * `eventName` is the GTM trigger name AND — when it matches a GA4 recommended
 * event or a Meta standard event — the tag name each vendor will forward.
 *
 * Recommended event names (used by GA4 & Meta both):
 *   page_view, view_item, view_item_list, select_item,
 *   add_to_cart, remove_from_cart, view_cart,
 *   begin_checkout, add_shipping_info, add_payment_info, purchase,
 *   search, add_to_wishlist, sign_up, login, generate_lead
 *
 * Legacy Meta names (Purchase, AddToCart, ViewContent, InitiateCheckout, …)
 * are ALSO accepted; each call fires the caller's name AND its equivalent in
 * the other convention, so GTM triggers built with either name keep working.
 */
export const trackEvent = (
  eventName: string,
  eventData: Record<string, any> = {}
) => {
  const isEcommerce =
    'ecommerce' in eventData ||
    Array.isArray(eventData.items) ||
    typeof eventData.value === 'number';

  // If the caller passed a flat GA4-style payload (value/currency/items/...),
  // wrap it in an `ecommerce` object so GA4 tags in GTM can pick it up
  // directly, while keeping the flat fields for Meta Pixel tags.
  let payload: Record<string, any> = { event: eventName, ...eventData };

  if (isEcommerce && !('ecommerce' in eventData)) {
    const { value, currency, items, tax, shipping, coupon, transaction_id, ...rest } =
      eventData as Record<string, any>;
    payload = {
      event: eventName,
      ...rest,
      ecommerce: {
        currency: currency || 'INR',
        ...(typeof value === 'number' ? { value } : {}),
        ...(tax !== undefined ? { tax } : {}),
        ...(shipping !== undefined ? { shipping } : {}),
        ...(coupon !== undefined ? { coupon } : {}),
        ...(transaction_id !== undefined ? { transaction_id } : {}),
        ...(Array.isArray(items) ? { items } : {}),
      },
      // Flat fields kept for legacy Meta Pixel tag templates.
      ...(typeof value === 'number' ? { value } : {}),
      ...(currency ? { currency } : {}),
    };
  }

  if (isEcommerce) resetEcommerce();
  pushToDataLayer(payload);

  // Fire the alias in the other naming convention (Meta ⇄ GA4) as a
  // separate dataLayer event so triggers configured with either name catch
  // it. Payload body is identical — only `event` changes.
  const alias = META_TO_GA4[eventName] || GA4_TO_META[eventName];
  if (alias && alias !== eventName) {
    pushToDataLayer({ ...payload, event: alias });
  }
};

/**
 * Client-side route change pageview. Called by `RouteChangeTracker` after
 * every Next.js App Router navigation so single-page navigations show up in
 * GA4 / Meta Pixel / Clarity through GTM.
 */
export const pageview = (url?: string) => {
  pushToDataLayer({
    event: 'page_view',
    page_path:
      url ||
      (typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : undefined),
    page_location:
      typeof window !== 'undefined' ? window.location.href : undefined,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  });
};

// -----------------------------------------------------------------------
// Convenience wrappers for the events the storefront actually fires.
// They keep call sites terse and guarantee a consistent payload shape.
// -----------------------------------------------------------------------

export const trackViewItem = (item: EcommerceItem, value?: number) =>
  trackEvent('view_item', {
    // GA4 ecommerce
    value: value ?? item.price ?? 0,
    currency: 'INR',
    items: [item],
    // Meta Pixel flat fields (mapped by the GTM Meta Pixel tag).
    content_type: 'product',
    content_ids: [item.item_id],
    content_name: item.item_name,
  });

export const trackAddToCart = (
  item: EcommerceItem,
  quantity: number = 1,
  value?: number
) =>
  trackEvent('add_to_cart', {
    value: value ?? (item.price || 0) * quantity,
    currency: 'INR',
    items: [{ ...item, quantity }],
    content_type: 'product',
    content_ids: [item.item_id],
    content_name: item.item_name,
    quantity,
  });

export const trackBeginCheckout = (
  items: EcommerceItem[],
  value: number,
  coupon?: string
) =>
  trackEvent('begin_checkout', {
    value,
    currency: 'INR',
    items,
    coupon,
    content_type: 'product',
    content_ids: items.map((i) => i.item_id),
    num_items: items.length,
  });

export const trackPurchase = (params: {
  transaction_id: string;
  value: number;
  currency?: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  items?: EcommerceItem[];
}) =>
  trackEvent('purchase', {
    transaction_id: params.transaction_id,
    value: params.value,
    currency: params.currency || 'INR',
    tax: params.tax,
    shipping: params.shipping,
    coupon: params.coupon,
    items: params.items || [],
    content_type: 'product',
    content_ids: (params.items || []).map((i) => i.item_id),
    num_items: (params.items || []).length,
  });
