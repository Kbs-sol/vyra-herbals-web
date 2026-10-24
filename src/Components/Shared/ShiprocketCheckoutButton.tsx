'use client';

/**
 * "Pay with Shiprocket" - opens Shiprocket's hosted checkout (OTP login, saved
 * addresses, UPI / cards / wallets / COD) on top of the cart.
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Renders nothing unless NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED === 'true', so
 * the existing Easebuzz / COD checkout stays the only option until the owner
 * flips the flag. If Shiprocket is unreachable, the visitor is sent to the
 * native /checkout page (the "fallbackUrl" Shiprocket's docs require).
 */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_PATH } from '@/constants';
import { supabase } from '@/utils/supabaseClient';
import { useCart } from '../Contexts/CartContext';

const ENABLED = process.env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED === 'true';
const SCRIPT_SRC = 'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const STYLE_HREF = 'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';

declare global {
  interface Window {
    HeadlessCheckout?: {
      addToCart: (event: Event | React.MouseEvent, token: string, opts?: { fallbackUrl?: string }, cb?: (r: any) => void) => void;
    };
  }
}

let loader: Promise<void> | null = null;
function loadShiprocket(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.HeadlessCheckout) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${STYLE_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = STYLE_HREF;
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.HeadlessCheckout ? resolve() : reject(new Error('HeadlessCheckout missing')));
    s.onerror = () => reject(new Error('Shiprocket script failed to load'));
    document.head.appendChild(s);
  }).catch((e) => {
    loader = null; // allow a retry on the next click
    throw e;
  });
  return loader;
}

const ShiprocketCheckoutButton: React.FC = () => {
  const { cartItems, appliedCoupon } = useCart();
  const [busy, setBusy] = useState(false);

  // Warm the script so the click is instant on a normal connection.
  useEffect(() => {
    if (ENABLED) loadShiprocket().catch(() => {});
  }, []);

  if (!ENABLED) return null;

  const onClick = async (event: React.MouseEvent) => {
    if (busy || !cartItems?.length) return;
    setBusy(true);
    const fallbackUrl = `${window.location.origin}/checkout`;
    try {
      await loadShiprocket();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* guest checkout is allowed */ }

      const res = await fetch(`${API_PATH}/shiprocket/token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: cartItems.map((i: any) => ({ id: i.id, quantity: i.quantity })),
          couponCode: appliedCoupon?.code || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.token) throw new Error(json?.error || 'Could not start checkout');

      window.HeadlessCheckout!.addToCart(event, json.token, { fallbackUrl }, () => setBusy(false));
      // The iframe owns the screen from here; re-enable shortly in case it is closed.
      setTimeout(() => setBusy(false), 4000);
    } catch (e) {
      setBusy(false);
      toast.error('Shiprocket checkout is unavailable - using standard checkout.', { position: 'bottom-center', autoClose: 2500 });
      window.location.href = fallbackUrl;
    }
  };

  return (
    <button
      type="button"
      id="shiprocket-checkout-button"
      className="w-100 rounded-1 buy-button mt-2 btn"
      style={{ backgroundColor: '#fff', color: '#704a0d', border: '2px solid #704a0d', fontWeight: 600 }}
      onClick={onClick}
      disabled={busy || !cartItems?.length}
      aria-label="Checkout with Shiprocket: UPI, cards, wallets and cash on delivery"
    >
      {busy ? 'Opening secure checkout...' : 'Express Checkout (UPI / Cards / COD)'}
    </button>
  );
};

export default ShiprocketCheckoutButton;
