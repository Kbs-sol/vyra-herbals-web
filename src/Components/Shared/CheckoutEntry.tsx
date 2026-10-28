'use client';

/**
 * The website's checkout entry point (cart + product page "Buy Now").
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Primary path : Shiprocket Checkout (hosted iframe: OTP login, saved addresses,
 *                UPI / cards / wallets / COD). Used automatically once Shiprocket
 *                keys are configured on the server.
 * Fallback path: the existing native checkout (<Checkout/> -> Easebuzz / COD).
 *                Used when Shiprocket is not configured, switched off (env or
 *                /admin/shiprocket), its script or token call fails, or the
 *                visitor chooses it. WhatsApp ordering is a separate server flow
 *                that always uses Easebuzz and is not touched by any of this.
 *
 * Nothing here can block an order: every failure ends in the native checkout.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_PATH } from '@/constants';
import { supabase } from '@/utils/supabaseClient';
import { trackEvent } from '@/utils/analytics';
import Checkout from '@/PageComponents/Checkout';
import { useCart } from '../Contexts/CartContext';

interface SrStatus {
  enabled: boolean;
  scriptUrl?: string;
  styleUrl?: string;
}

declare global {
  interface Window {
    HeadlessCheckout?: {
      addToCart: (
        event: Event | React.MouseEvent,
        token: string,
        opts?: { fallbackUrl?: string },
        cb?: (r: any) => void,
      ) => void;
    };
  }
}

// ---- status (one request per page load, shared by every button on the page) ----
let statusPromise: Promise<SrStatus> | null = null;
function loadStatus(): Promise<SrStatus> {
  if (!statusPromise) {
    statusPromise = (async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(`${API_PATH}/shiprocket/status`, { signal: ctrl.signal });
        if (!res.ok) return { enabled: false };
        const j = await res.json();
        return j && j.enabled && j.scriptUrl ? (j as SrStatus) : { enabled: false };
      } catch {
        return { enabled: false };
      } finally {
        clearTimeout(t);
      }
    })();
  }
  return statusPromise;
}

// ---- Shiprocket script loader (url comes from the server: staging vs production) ----
let scriptLoader: Promise<void> | null = null;
function loadShiprocket(scriptUrl: string, styleUrl?: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.HeadlessCheckout) return Promise.resolve();
  if (scriptLoader) return scriptLoader;
  scriptLoader = new Promise<void>((resolve, reject) => {
    if (styleUrl && !document.querySelector(`link[href="${styleUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = styleUrl;
      document.head.appendChild(link);
    }
    const timer = setTimeout(() => reject(new Error('Shiprocket script timed out')), 8000);
    const s = document.createElement('script');
    s.src = scriptUrl;
    s.async = true;
    s.onload = () => {
      clearTimeout(timer);
      window.HeadlessCheckout ? resolve() : reject(new Error('HeadlessCheckout missing'));
    };
    s.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Shiprocket script failed to load'));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    scriptLoader = null; // allow a retry on the next click
    throw e;
  });
  return scriptLoader;
}

interface Props {
  cartItems: any[];
  /** Set for a "Buy Now" on a product page; null for the cart. */
  product: any | null;
  quantity?: number;
}

const CheckoutEntry: React.FC<Props> = ({ cartItems, product, quantity = 1 }) => {
  const { appliedCoupon } = useCart();
  const [status, setStatus] = useState<SrStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [nativeSignal, setNativeSignal] = useState(0);
  const [forceNative, setForceNative] = useState(false);

  const isDirect = !(cartItems && cartItems.length > 0) && !!product;
  const lines: Array<{ id: number; quantity: number }> = isDirect
    ? [{ id: product.id, quantity }]
    : (cartItems || []).map((i: any) => ({ id: i.id, quantity: i.quantity }));

  const openNative = useCallback(() => setNativeSignal((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    loadStatus().then((s) => {
      if (!alive) return;
      setStatus(s);
      if (s.enabled && s.scriptUrl) loadShiprocket(s.scriptUrl, s.styleUrl).catch(() => {}); // warm up
    });
    return () => {
      alive = false;
    };
  }, []);

  // Shiprocket's own "fallbackUrl" lands here (?native=1): go straight to the native flow.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('native') === '1') {
      setForceNative(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('native');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      setTimeout(openNative, 150);
    }
  }, [openNative]);

  const useShiprocket = !!status?.enabled && !forceNative;

  const onShiprocketClick = async (event: React.MouseEvent) => {
    if (busy || !lines.length) return;
    setBusy(true);
    const fallbackUrl = `${window.location.origin}${window.location.pathname}?native=1`;
    try {
      await loadShiprocket(status!.scriptUrl!, status!.styleUrl);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* guests may check out through Shiprocket */ }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      let res: Response;
      try {
        res = await fetch(`${API_PATH}/shiprocket/token`, {
          method: 'POST',
          headers,
          signal: ctrl.signal,
          body: JSON.stringify({
            items: lines,
            scope: isDirect ? 'direct' : 'cart',
            // A coupon is validated against the cart it was applied to, so only cart checkouts carry it.
            couponCode: !isDirect ? appliedCoupon?.code || null : null,
          }),
        });
      } finally {
        clearTimeout(timer);
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.token) throw new Error(json?.error || `token ${res.status}`);

      const value = lines.length
        ? (isDirect ? [{ price: Number(product.price) || 0, quantity }] : cartItems).reduce(
            (t: number, i: any) => t + Number(i.price || 0) * Number(i.quantity || 1),
            0,
          )
        : 0;
      trackEvent('InitiateCheckout', {
        content_ids: lines.map((l) => String(l.id)),
        content_type: 'product',
        value,
        currency: 'INR',
        num_items: lines.reduce((n, l) => n + l.quantity, 0),
      });

      window.HeadlessCheckout!.addToCart(event, json.token, { fallbackUrl }, () => setBusy(false));
      setTimeout(() => setBusy(false), 4000); // the iframe owns the screen; re-enable if it is closed
    } catch (e) {
      console.warn('[checkout] Shiprocket unavailable, using native checkout:', (e as Error).message);
      setBusy(false);
      toast.info('Opening standard checkout...', { position: 'bottom-center', autoClose: 1500 });
      openNative();
    }
  };

  const isCart = !isDirect;
  return (
    <>
      <Checkout
        cartItems={cartItems}
        product={product}
        quantity={quantity}
        hideTrigger={useShiprocket}
        openSignal={nativeSignal}
      />
      {useShiprocket && (
        <div id="checkout-entry">
          <button
            type="button"
            id="shiprocket-checkout-button"
            className="w-100 rounded-1 buy-button btn"
            style={{ backgroundColor: '#704a0d', color: '#fff', borderColor: '#704a0d' }}
            onClick={onShiprocketClick}
            disabled={busy || !lines.length}
            aria-label="Secure checkout: UPI, cards, wallets and cash on delivery"
          >
            {busy ? 'Opening secure checkout...' : isCart ? 'Proceed to Checkout' : 'Buy Now'}
          </button>
          <p className="text-center small mt-2 mb-0" style={{ color: '#6b7280' }}>
            UPI · Cards · Wallets · Cash on Delivery
            <br />
            <button
              type="button"
              id="native-checkout-link"
              className="btn btn-link p-0 small"
              style={{ color: '#6b7280', textDecoration: 'underline' }}
              onClick={openNative}
            >
              Problem checking out? Use standard checkout
            </button>
          </p>
        </div>
      )}
    </>
  );
};

export default CheckoutEntry;
