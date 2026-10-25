'use client';

/**
 * Landing page Shiprocket redirects the buyer to after checkout:
 *   /shiprocket/return?oid=<order id>&ost=SUCCESS
 * It asks our server to finalize the order (racing Shiprocket's webhook; the
 * server is idempotent) and then forwards to the normal /order-placed page.
 */
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_PATH } from '@/constants';
import { useCart } from '../Contexts/CartContext';

const ShiprocketReturn: React.FC = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { clearCart } = useCart();
  const [message, setMessage] = useState('Confirming your order...');
  const oid = params.get('oid') || '';
  const ost = (params.get('ost') || '').toUpperCase();

  useEffect(() => {
    if (!oid || ost !== 'SUCCESS') {
      setMessage(ost && ost !== 'SUCCESS' ? 'Your payment was not completed.' : 'We could not find your order.');
      const t = setTimeout(() => router.replace('/cart'), 2500);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    (async () => {
      // The webhook may still be in flight; retry a few times before giving up.
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        try {
          const res = await fetch(`${API_PATH}/shiprocket/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oid }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json?.order_id) {
            // A Buy Now of one product must not empty a cart the buyer still has.
            if (json.scope !== 'direct') clearCart();
            const email = json.signed_in_order || !json.email ? '' : `?email=${encodeURIComponent(json.email)}`;
            router.replace(`/order-placed/${json.order_id}${email}`);
            return;
          }
          if (res.status === 404) break; // Shiprocket does not know / has not completed this order
        } catch { /* network blip: retry */ }
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
      if (!cancelled) {
        setMessage('Your order is being confirmed. Check My Orders in a minute or two - you will also get a WhatsApp confirmation.');
        setTimeout(() => router.replace('/profile#orders'), 4000);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oid, ost]);

  return (
    <div className="container py-5 text-center" role="status" aria-live="polite">
      <h1 className="h4 mb-3">{message}</h1>
      <p className="text-muted">Please do not close this page.</p>
    </div>
  );
};

export default ShiprocketReturn;
