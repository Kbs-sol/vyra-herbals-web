'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import { FaCheckCircle, FaTimesCircle, FaWhatsapp, FaInstagram, FaRegCopy, FaCheck } from 'react-icons/fa';
import { API_PATH } from '../constants';
import LoadingIndicator from '../Components/Common/LoadingIndicator';
import { supabase } from '@/utils/supabaseClient';
import { useCart } from '../Components/Contexts/CartContext';
import { trackEvent } from '@/utils/analytics';
import { isSuccessfulOrderStatus } from '@/utils/orderStatus';

interface OrderInfo {
  id: number | string;
  order_id?: string;
  txn_id?: string;
  total_amount?: number;
  order_amount?: number;
  payment_method?: string;
  status?: string;
  shipment_id?: string | number | null;
  tracking_id?: string | null;
  awb_code?: string | null;
  courier_name?: string | null;
  delivery_status?: string;
  created_at?: string;
  order_date?: string;
  items?: any[];
  products?: any[];
  shipping_address?: string;
  shipping_data?: any;
}

const formatAddress = (raw: any) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    if (parsed.address && !parsed.houseNumber) {
      return {
        name: parsed.fullName || 'Customer',
        mobile: parsed.phone || parsed.mobile || 'N/A',
        email: parsed.email || 'Not provided',
        address: parsed.address,
      };
    }
    const { fullName, phone, email, houseNumber, area, pincode, city, state, country } = parsed;
    const addressLine = [houseNumber, area, city, state]
      .filter((p) => p && String(p).trim())
      .join(', ');
    const tail = [pincode, country].filter((p) => p && String(p).trim()).join(', ');
    return {
      name: fullName || 'Customer',
      mobile: phone || 'N/A',
      email: email || 'Not provided',
      address: tail ? `${addressLine} - ${tail}` : addressLine,
    };
  } catch {
    return { name: 'Customer', mobile: 'N/A', email: 'Not provided', address: '—' };
  }
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const OrderPlaced = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params?.orderId || '');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { cartItems, clearCart } = useCart();

  // Reset the "Copied!" flag shortly after each copy so the button goes back to
  // its normal state without needing another render trigger.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    // If the user landed here from a successful payment, the surl callback
    // should have already created the order. If for any reason that callback
    // failed (closed tab, dropped network, function timeout), we still stored
    // the pending txnid in localStorage — ask /api/payment/reconcile to
    // verify with Easebuzz and finalize the order before we try to render it.
    const reconcileIfPending = async () => {
      try {
        const raw = localStorage.getItem('vyra_pending_txn');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const txnId = parsed?.txnId;
        if (!txnId) return;
        await fetch(`${API_PATH}/payment/reconcile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txnid: String(txnId) }),
        }).catch(() => null);
        localStorage.removeItem('vyra_pending_txn');
      } catch {
        // Best-effort only. If reconcile is unreachable, the cron sweep will
        // still pick up the stuck transaction within a few minutes.
      }
    };

    (async () => {
      try {
        await reconcileIfPending();

        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
        const res = await fetch(`${API_PATH}/orders/info?order_id=${encodeURIComponent(orderId)}`, { headers });
        const json = await res.json();
        if (cancelled) return;
        if (json.status !== 'success' || !json.data) {
          setErrorMsg(json.message || 'Order not found.');
          setLoading(false);
          return;
        }
        const data = json.data;
        setOrder(data);
        setLoading(false);

        // If the AWB hasn't synced yet (sync timed out during finalize), retry
        // shipment sync once and refetch so the customer sees a tracking number
        // without manually refreshing.
        if (!data.awb_code && isSuccessfulOrderStatus(data.status)) {
          try {
            await fetch(`${API_PATH}/orders/sync-shipment`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ order_id: orderId }),
            });
            const res2 = await fetch(`${API_PATH}/orders/info?order_id=${encodeURIComponent(orderId)}`, { headers });
            const json2 = await res2.json();
            if (!cancelled && json2.status === 'success' && json2.data) {
              setOrder(json2.data);
            }
          } catch {
            // Best-effort; the profile page also retries sync on load.
          }
        }

        // Only a genuinely placed (paid) order is a conversion. Firing Purchase
        // for a failed/abandoned payment would corrupt analytics + the pixel and
        // wrongly clear the user's cart, so we bail out early for those.
        if (!isSuccessfulOrderStatus(data.status)) {
          return;
        }

        // One-time conversion event for analytics (Meta Pixel `Purchase` + GA4
        // `purchase` fire together via the mapping in src/utils/analytics.ts).
        // Sending the full `items` array is what powers GA4's e-commerce
        // reports — without it revenue-by-SKU stays empty.
        const orderItems = (data.items || data.products || []).map((p: any) => ({
          item_id: String(p.product_id || p.id),
          item_name: p.title || p.name || p.product_name || 'Vyra product',
          item_category: p.category || undefined,
          item_brand: 'Vyra Herbals',
          quantity: Number(p.quantity || p.qty || 1),
          price: Number(p.price || p.unit_price || 0),
        }));
        trackEvent('Purchase', {
          transaction_id: data.txn_id || String(data.id),
          value: Number(data.total_amount ?? data.order_amount ?? 0),
          currency: 'INR',
          num_items: orderItems.reduce((n: number, i: any) => n + (i.quantity || 1), 0),
          tax: Number(data.tax || 0) || undefined,
          shipping: Number(data.shipping_charges || data.shipping || 0) || undefined,
          coupon: data.coupon_code || undefined,
          items: orderItems,
          content_type: 'product',
          content_ids: orderItems.map((i: any) => i.item_id),
        });

        // Best-effort cart cleanup if any of the cart items match this order.
        if (cartItems.length > 0) {
          const map = new Map<any, number>(
            (data.items || data.products || []).map((p: any) => [
              p.product_id || p.id, Number(p.quantity || p.qty || 1),
            ]),
          );
          const matches = cartItems.every((c: any) =>
            map.get(c.product_id || c.id) === Number(c.quantity)
          );
          if (matches) clearCart();
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg((e as Error).message || 'Failed to load order.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <Wrapper>
        <div className="loading"><LoadingIndicator variant="spinner" /></div>
      </Wrapper>
    );
  }

  if (errorMsg || !order) {
    return (
      <Wrapper>
        <div className="container py-5">
          <div className="error-card">
            <h3 className="mb-3">We couldn't load your order.</h3>
            <p className="text-muted mb-4">{errorMsg || 'Please open your purchase history to confirm.'}</p>
            <button onClick={() => router.push('/profile#orders')} className="btn-primary-vyra">
              Go to My Orders
            </button>
          </div>
        </div>
      </Wrapper>
    );
  }

  // Defence in depth: this page must never claim success for a payment that
  // didn't actually go through. If the order we loaded isn't in a genuinely
  // placed/paid state, show the honest "payment not completed" view instead.
  if (!isSuccessfulOrderStatus(order.status)) {
    return (
      <Wrapper>
        <div className="container py-5">
          <div className="error-card">
            <FaTimesCircle className="failed-icon" />
            <h3 className="mb-2">Payment not completed</h3>
            <p className="text-muted mb-1">
              Your order was <strong>not placed</strong> because the payment wasn't completed.
            </p>
            <p className="text-muted mb-4">
              If any amount was deducted, it will be refunded automatically within 3–5 business days.
            </p>
            <div className="actions justify-content-center">
              <button onClick={() => router.push('/cart')} className="btn-primary-vyra">
                Try Payment Again
              </button>
              <button onClick={() => router.push('/profile#orders')} className="btn-outline-vyra">
                View My Orders
              </button>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  const addr = formatAddress(order.shipping_address || order.shipping_data);
  const items = order.items || order.products || [];
  const amount = Number(order.total_amount ?? order.order_amount ?? 0);
  const orderDate = formatDate(order.created_at || order.order_date);
  // The AWB is what the customer actually tracks with. It can legitimately be
  // missing for a few minutes after checkout (the courier is assigned by the
  // iCarry sync, which the effect above retries once), so the row degrades to a
  // "being generated" note rather than showing a blank value.
  const awb = String(order.awb_code || '').trim();

  // Until the AWB exists, the Order ID is the customer's only reference for
  // support, so it stands in rather than leaving them with nothing to quote.
  const orderIdDisplay = order.order_id || `ORD-${order.id}`;
  const reference = awb || orderIdDisplay;

  const copyReference = async () => {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
    } catch {
      // clipboard API needs HTTPS + permission; fall back to the legacy path so
      // the button still works on older/in-app browsers.
      try {
        const el = document.createElement('textarea');
        el.value = reference;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
      } catch {
        // Nothing more we can do — the number is still on screen to read.
      }
    }
  };

  return (
    <Wrapper>
      <div className="container py-5">
        <div className="success-card">
          <div className="text-center mb-4">
            <FaCheckCircle className="success-icon" />
            <h1 className="success-title">Order Placed Successfully!</h1>
            <p className="success-subtitle">Thank you for shopping with us. Here are your order details:</p>
            <p className="success-note">
              {awb
                ? 'Kindly note the AWB (tracking) number for further tracking.'
                : 'Kindly note the Order ID for further tracking.'}
            </p>
          </div>

          <Section>
            <h3 className="section-title">Order Information</h3>
            <Row
              label={awb ? 'AWB Number' : 'Order ID'}
              value={
                <span className="awb-wrap">
                  <span className="awb-value">{reference}</span>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={copyReference}
                    aria-label={awb ? 'Copy AWB number' : 'Copy Order ID'}
                  >
                    {copied ? <><FaCheck /> Copied</> : <><FaRegCopy /> Copy</>}
                  </button>
                </span>
              }
            />
            {!awb && (
              <p className="awb-pending">
                Your AWB (tracking) number is being generated — it will appear in My Orders shortly.
              </p>
            )}
            <Row label="Order Amount" value={`₹${amount}`} />
            <Row label="Order Date" value={orderDate} />
            <Row label="Payment Method" value={(order.payment_method || 'online').toUpperCase()} />
          </Section>

          <Section>
            <h3 className="section-title">Shipping Address</h3>
            <p className="addr-line"><strong>Name:</strong> {addr.name}</p>
            <p className="addr-line"><strong>Mobile:</strong> {addr.mobile}</p>
            <p className="addr-line"><strong>Email:</strong> {addr.email}</p>
            <p className="addr-line"><strong>Address:</strong> {addr.address}</p>
          </Section>

          <Section>
            <h3 className="section-title">Products</h3>
            {items.length === 0 ? (
              <p className="text-muted">No items recorded.</p>
            ) : (
              items.map((item: any, idx: number) => (
                <div key={item.product_id || item.id || idx} className="product-row">
                  <img
                    src={item.product_image || item.image_url || '/home-hair-oil.jpg'}
                    alt={item.product_title || item.title || 'Product'}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/home-hair-oil.jpg'; }}
                  />
                  <div className="product-meta">
                    <p className="product-title"><strong>Product Title:</strong> {item.product_title || item.title || 'Vyra Herbals Product'}</p>
                    <p className="product-line"><strong>Quantity:</strong> {item.quantity || item.qty || 1}</p>
                    <p className="product-line"><strong>Item Amount:</strong> ₹{item.price || 0}</p>
                  </div>
                </div>
              ))
            )}
          </Section>

          <ContactStrip>
            <p>
              If you have any queries, contact us via{' '}
              <a href="https://wa.me/919866082590" target="_blank" rel="noopener noreferrer">
                <FaWhatsapp /> <strong>WhatsApp: 9866082590</strong>
              </a>{' '}
              or{' '}
              <a href="https://www.instagram.com/vyraherbals" target="_blank" rel="noopener noreferrer">
                <FaInstagram /> <strong>Instagram: @vyraherbals</strong>
              </a>
              .
            </p>
          </ContactStrip>

          <div className="actions">
            <Link href={`/orders/${order.id}`} className="btn-primary-vyra">View Order</Link>
            <Link href="/search?searchtext=all" className="btn-outline-vyra">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <p className="kv-row"><strong>{label}:</strong> {value}</p>
);

const Section = ({ children }: { children: React.ReactNode }) => (
  <section className="block">{children}</section>
);

export default OrderPlaced;

const Wrapper = styled.div`
  background: #f4f6f8;
  min-height: 100vh;

  .loading {
    min-height: 60vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .error-card {
    background: #fff;
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    max-width: 540px;
    margin: 0 auto;
  }

  .failed-icon {
    color: #dc2626;
    font-size: 3.5rem;
    margin-bottom: 1rem;
  }

  .success-card {
    background: #fff;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    max-width: 760px;
    margin: 0 auto;
  }

  .success-icon {
    color: #16a34a;
    font-size: 4rem;
    margin-bottom: 0.75rem;
  }

  .success-title {
    color: #16a34a;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .success-subtitle {
    color: #555;
    margin-bottom: 0.25rem;
  }

  .success-note {
    color: #b91c1c;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .block {
    border-top: 1px solid #e5e7eb;
    padding: 1.5rem 0;
  }

  .section-title {
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #1f2937;
  }

  .kv-row,
  .addr-line {
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  .awb-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .awb-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 700;
    letter-spacing: 0.03em;
    word-break: break-all;
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #f4ead4;
    color: #704a0d;
    border: 1px solid #704a0d;
    border-radius: 6px;
    padding: 0.2rem 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .copy-btn:hover {
    background: #704a0d;
    color: #fff;
  }

  .awb-pending {
    color: #6b7280;
    font-style: italic;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .product-row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    margin-bottom: 0.75rem;
    background: #fafbfc;
  }

  .product-row img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #e5e7eb;
    padding: 4px;
    flex-shrink: 0;
  }

  .product-meta {
    flex-grow: 1;
  }

  .product-title {
    margin-bottom: 0.25rem;
    color: #111827;
  }

  .product-line {
    margin-bottom: 0.25rem;
    color: #4b5563;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn-primary-vyra {
    background: #704a0d;
    color: #fff;
    border: 1px solid #704a0d;
    padding: 0.6rem 1.4rem;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
  }

  .btn-primary-vyra:hover {
    background: #5e3f0a;
    color: #fff;
  }

  .btn-outline-vyra {
    background: transparent;
    color: #704a0d;
    border: 1px solid #704a0d;
    padding: 0.6rem 1.4rem;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
  }

  .btn-outline-vyra:hover {
    background: #f4ead4;
    color: #704a0d;
  }
`;

const ContactStrip = styled.div`
  border-top: 1px solid #e5e7eb;
  padding-top: 1.25rem;
  margin-top: 1rem;
  text-align: center;
  color: #4b5563;

  a {
    color: #704a0d;
    text-decoration: none;
    margin: 0 0.25rem;
  }

  a:hover {
    text-decoration: underline;
  }

  svg {
    margin-right: 0.25rem;
    vertical-align: middle;
  }
`;
