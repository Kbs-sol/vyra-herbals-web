import { recordCouponUsage } from '@/utils/coupons';
import { syncOrderShipment } from '@/utils/orderShipment';
import {
  notifyOrderPlaced,
  notifyPaymentConfirmed,
} from '@/services/communications/integration/orderNotifications';
import { SUCCESSFUL_ORDER_STATUSES } from '@/utils/orderStatus';
import { capiPurchase } from '@/utils/metaCapi';
import {
  fetchOrderDetails,
  mapShiprocketOrder,
  type ShiprocketConfig,
  type MappedShiprocketOrder,
} from '@/utils/shiprocketCheckout';

/**
 * Turn a completed Shiprocket Checkout order into a durable row in `orders`.
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 *
 * Called from three places that must never disagree, so they share this one
 * function: the order webhook, the buyer's redirect back to the site, and the
 * pending-order cron failsafe. All three may fire for the same order (Shiprocket
 * documents that webhooks can repeat), so it is idempotent on
 * `orders.txn_id = "SR-<shiprocket order id>"`.
 *
 * Trust model: the caller only supplies an order id. The order itself is fetched
 * from Shiprocket's authenticated Order Details API - never taken from a
 * request body - so a forged webhook cannot create an order.
 *
 * Item prices come from OUR `products` table, not from Shiprocket, and the
 * Shiprocket subtotal is compared to ours so a catalogue drift is logged.
 */

export type SrFinalizeResult =
  | { ok: true; order: any; alreadyExisted: boolean; scope: 'cart' | 'direct'; sideEffects: () => Promise<void> }
  | { ok: false; reason: string; retryable: boolean };

const SR_SESSION_PREFIX = 'SR-';

const isUniqueViolation = (err: any): boolean =>
  err?.code === '23505' || /duplicate key|unique constraint/i.test(String(err?.message || ''));

/** Link written by /api/shiprocket/token: which signed-in user started this checkout. */
async function loadSession(
  supabase: any,
  txnId: string,
): Promise<{ userId: string | null; couponCode: string | null; scope: 'cart' | 'direct' }> {
  try {
    const { data } = await supabase
      .from('order_sessions')
      .select('payload')
      .eq('txn_id', txnId)
      .order('created_at', { ascending: false })
      .limit(1);
    const payload = data?.[0]?.payload;
    return {
      userId: payload?.userId ? String(payload.userId) : null,
      couponCode: payload?.couponCode ? String(payload.couponCode) : null,
      // 'direct' = a Buy Now of one product: the buyer's saved cart must survive it.
      scope: payload?.scope === 'direct' ? 'direct' : 'cart',
    };
  } catch {
    return { userId: null, couponCode: null, scope: 'cart' };
  }
}

/** Fallback when no session was stored: match the email Shiprocket collected to an account. */
async function userIdByEmail(supabase: any, email: string): Promise<string | null> {
  if (!email) return null;
  try {
    const { data } = await supabase.from('users').select('id').ilike('email', email).limit(1);
    return data?.[0]?.id ? String(data[0].id) : null;
  } catch {
    return null;
  }
}

async function loadProducts(supabase: any, ids: number[]): Promise<Map<number, any>> {
  const { data, error } = await supabase.from('products').select('*').in('id', ids);
  if (error) throw new Error(`product lookup failed: ${error.message}`);
  return new Map((data || []).map((p: any) => [Number(p.id), p]));
}

export async function finalizeShiprocketOrder(
  supabase: any,
  cfg: ShiprocketConfig,
  srOrderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SrFinalizeResult> {
  const id = String(srOrderId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return { ok: false, reason: 'invalid_order_id', retryable: false };
  const txnId = `${SR_SESSION_PREFIX}${id}`;

  // Idempotency first - cheap, and avoids an API round trip for repeat webhooks.
  const { data: existing, error: existingErr } = await supabase
    .from('orders')
    .select('*')
    .eq('txn_id', txnId)
    .in('status', SUCCESSFUL_ORDER_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1);
  if (existingErr) console.error('[shiprocket] existing order lookup failed:', existingErr.message);
  if (existing?.[0]) {
    const prior = await loadSession(supabase, txnId);
    return { ok: true, order: existing[0], alreadyExisted: true, scope: prior.scope, sideEffects: async () => {} };
  }

  // Authoritative record from Shiprocket.
  const details = await fetchOrderDetails(cfg, id, fetchImpl);
  if (!details.ok || !details.data) {
    // 4xx = Shiprocket does not know this order (forged / wrong id): do not retry.
    const retryable = !details.status || details.status >= 500 || details.status === 429;
    return { ok: false, reason: `details_unavailable: ${details.error || 'empty'}`, retryable };
  }

  const mapped: MappedShiprocketOrder | null = mapShiprocketOrder({ result: details.data });
  if (!mapped) return { ok: false, reason: 'unmappable_order', retryable: false };
  if (mapped.srOrderId !== id) return { ok: false, reason: 'order_id_mismatch', retryable: false };
  if (!mapped.isComplete) return { ok: false, reason: `not_complete: ${mapped.skipReason}`, retryable: false };

  let products: Map<number, any>;
  try {
    products = await loadProducts(supabase, mapped.lines.map((l) => l.id));
  } catch (e) {
    return { ok: false, reason: (e as Error).message, retryable: true };
  }

  const items: any[] = [];
  let itemsTotal = 0;
  for (const line of mapped.lines) {
    const p = products.get(line.id);
    if (!p) {
      console.error(`[shiprocket] order ${id}: product ${line.id} no longer exists`);
      return { ok: false, reason: `unknown_product_${line.id}`, retryable: false };
    }
    const price = Number(p.price) || 0;
    itemsTotal += price * line.quantity;
    items.push({
      id: p.id,
      quantity: line.quantity,
      price,
      regular_price: Number(p.regular_price) || price,
      title: p.title,
      handle: p.handle,
      sku: p.sku || '',
      category: p.category || undefined,
      image_url: p.image_url,
    });
  }
  if (mapped.subtotal > 0 && Math.abs(mapped.subtotal - itemsTotal) > 1) {
    // Not fatal: the customer already paid Shiprocket's total. But it means the
    // catalogue Shiprocket cached is stale, which someone should look at.
    console.warn(
      `[shiprocket] order ${id}: subtotal drift - Shiprocket ₹${mapped.subtotal} vs catalogue ₹${itemsTotal}`,
    );
  }

  const session = await loadSession(supabase, txnId);
  const userId = session.userId || (await userIdByEmail(supabase, mapped.email));

  const now = new Date();
  const generatedId = now.getTime() * 1000 + Math.floor(Math.random() * 1000);
  const productTitle = items
    .map((i) => `${i.quantity > 1 ? `${i.quantity} × ` : ''}${i.sku || i.handle || i.title}`)
    .join(', ');

  const couponCode = session.couponCode || mapped.couponCodes[0] || null;
  const orderPayload = {
    id: generatedId,
    order_id: `ORD-${generatedId}`,
    items,
    total_amount: mapped.totalPayable,
    // Online money actually collected by Shiprocket (0 for pure COD).
    transaction_price: mapped.amountPaid,
    shipping_data: { ...mapped.shipping, productTitle },
    payment_method: mapped.paymentMethod,
    status: 'placed',
    user_id: userId,
    txn_id: txnId,
    created_at: now.toISOString(),
    order_date: now.toISOString(),
    welcome_coupon_applied: false,
    welcome_coupon_discount: 0,
    coupon_code: couponCode,
    coupon_discount: mapped.couponDiscount,
    delivery_status: 'Pending Sync',
  };

  const { data: inserted, error: insertErr } = await supabase.from('orders').insert([orderPayload]).select();
  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      // A concurrent delivery of the same webhook won the race - return its row.
      const { data: winner } = await supabase.from('orders').select('*').eq('txn_id', txnId).limit(1);
      if (winner?.[0]) return { ok: true, order: winner[0], alreadyExisted: true, scope: session.scope, sideEffects: async () => {} };
    }
    console.error('[shiprocket] order insert failed:', insertErr);
    return { ok: false, reason: `order_creation_failed: ${insertErr.message}`, retryable: true };
  }
  const order = inserted?.[0];
  if (!order) return { ok: false, reason: 'order_creation_failed: no row returned', retryable: true };

  // Everything after the durable insert is a side effect. It is returned as a
  // thunk so the webhook can respond to Shiprocket fast and run it afterwards;
  // the redirect path just awaits it.
  const sideEffects = async () => {
    try {
      if (couponCode && mapped.couponDiscount > 0) {
        const { data: coupons } = await supabase.from('coupons').select('id, code').ilike('code', couponCode).limit(1);
        if (coupons?.[0]) await recordCouponUsage(supabase, coupons[0].id, userId, order.id, mapped.couponDiscount);
      }
    } catch (e) {
      console.warn('[shiprocket] coupon usage not recorded:', (e as Error).message);
    }

    // Only a real cart checkout empties the saved cart; a Buy Now must not wipe it.
    if (userId && session.scope === 'cart') {
      try {
        await supabase.from('cart').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('[shiprocket] cart clear failed:', (e as Error).message);
      }
    }

    await notifyOrderPlaced(order);
    if (order.payment_method === 'online') await notifyPaymentConfirmed(order);

    try {
      await Promise.race([
        syncOrderShipment(supabase, order),
        new Promise((resolve) => setTimeout(() => resolve({ success: false, message: 'iCarry sync ceiling' }), 25000)),
      ]);
    } catch (e) {
      // Leaves delivery_status 'Pending Sync'; /api/orders/sync-shipment retries it.
      console.error(`[shiprocket] iCarry sync threw for order ${order.id}:`, e);
    }

    try {
      const ship = order.shipping_data || {};
      const nameParts = String(ship.fullName || '').trim().split(/\s+/);
      await capiPurchase({
        // Same id the browser Pixel uses on /order-placed, so Meta dedupes the pair.
        order_id: txnId,
        total: Number(order.total_amount) || 0,
        currency: 'INR',
        items: items.map((i) => ({ id: String(i.id), quantity: i.quantity, price: i.price, title: i.title, category: i.category })),
        customer: {
          email: ship.email,
          phone: ship.phone,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || undefined,
          city: ship.city,
          state: ship.state,
          zip: ship.pincode,
          country: 'in',
          external_id: userId ? String(userId) : undefined,
        },
        // No visitor ip / user agent: this runs server-to-server from Shiprocket.
        sourceUrl: `${process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://vyraherbals.com'}/order-placed/${order.id}`,
      });
    } catch (e) {
      console.warn('[shiprocket] CAPI Purchase failed:', (e as Error).message);
    }
  };

  return { ok: true, order, alreadyExisted: false, scope: session.scope, sideEffects };
}
