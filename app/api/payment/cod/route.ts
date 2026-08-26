import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { validateCoupon, recordCouponUsage } from '@/utils/coupons';
import { syncOrderShipment } from '@/utils/orderShipment';
import { notifyOrderPlaced } from '@/services/communications/integration/orderNotifications';
import { requireUser } from '@/utils/apiAuth';
import { enforceRateLimit } from '@/utils/rateLimit';
import { COD_Charges } from '@/constants';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
// Must stay >= the 25s iCarry race below plus DB + notification overhead.
// NOTE: this export OVERRIDES the value in vercel.json — vercel.json said 60
// while this said 30, and 30 was winning, so a slow iCarry booking killed the
// function before it could save the tracking id.
export const maxDuration = 60;

/**
 * Place a cash-on-delivery order.
 *
 * This route creates a real, shippable order with no payment step, so it needs
 * to be at least as strict as the paid flow:
 *
 *   * It requires a signed-in customer, and the order is attached to the token's
 *     user id — not to a `userId` in the body. Previously it was completely
 *     unauthenticated, so anyone could POST goods to any address for free.
 *   * Prices come from the `products` table. The client's `totalAmount` and
 *     `transactionPrice` are recomputed and overwritten rather than trusted.
 */

/** Recompute the basket value from database prices. */
async function computeItemsTotal(
  supabase: any,
  items: any[]
): Promise<{ itemsTotal: number } | { error: string }> {
  const ids = Array.from(
    new Set(
      items
        .map((item: any) => Number(item?.id))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    )
  );

  if (ids.length === 0) return { error: 'Order items are missing product identifiers.' };

  const { data: products, error } = await supabase
    .from('products')
    .select('id, price')
    .in('id', ids);

  if (error) {
    console.error('[COD] price lookup failed:', error.message);
    return { error: 'Could not verify prices. Please try again.' };
  }

  const priceById = new Map<number, number>();
  for (const row of products || []) priceById.set(Number(row.id), Number(row.price) || 0);

  let itemsTotal = 0;
  for (const item of items) {
    const price = priceById.get(Number(item?.id));
    if (price === undefined) return { error: 'One of the items in your cart is no longer available.' };
    const quantity = Math.floor(Number(item?.quantity) || 0);
    if (quantity <= 0 || quantity > 99) return { error: 'Invalid quantity in your cart.' };
    itemsTotal += price * quantity;
  }

  itemsTotal = Math.round(itemsTotal);
  if (itemsTotal <= 0) return { error: 'Order total must be greater than zero.' };

  return { itemsTotal };
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase();

    const auth = await requireUser(req, supabase);
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    // Placing an order is expensive downstream (iCarry booking, SMS), so cap
    // how fast one account can create them.
    const limited = enforceRateLimit(req, 'payment:cod', 10, 10 * 60 * 1000, userId);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const { orderData } = body || {};

    if (!orderData) return NextResponse.json({ error: 'orderData required' }, { status: 400 });

    const orderItems = Array.isArray(orderData.orderItems) ? orderData.orderItems : [];
    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }

    const totals = await computeItemsTotal(supabase, orderItems);
    if ('error' in totals) {
      return NextResponse.json({ error: totals.error }, { status: 400 });
    }

    // --- Welcome Coupon Server-Side Validation ---
    let welcomeCouponApplied = false;
    let welcomeCouponDiscount = 0;

    if (orderData.welcomeCouponApplied && userId) {
      // 1. Check if welcome coupon is enabled
      const { data: settingsRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'welcome_coupon')
        .maybeSingle();

      const couponConfig = settingsRow?.value;

      // 2. Check if user has zero previous orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (couponConfig?.enabled && (orderCount || 0) === 0) {
        const discountPercent = couponConfig.discount_percent || 10;
        // Recalculate discount server-side from items
        welcomeCouponDiscount = Math.round((totals.itemsTotal * discountPercent) / 100);
        welcomeCouponApplied = true;
        console.log(`[COD] Welcome coupon applied: ${discountPercent}% = ₹${welcomeCouponDiscount} off`);
      } else {
        console.log('[COD] Welcome coupon validation failed - user has orders or coupon disabled');
      }
    }

    // --- Custom Coupon Server-Side Validation ---
    // Re-validate the coupon code from the cart to recompute the discount
    // server-side. The client-supplied discount amount is never trusted.
    let appliedCouponCode: string | null = null;
    let appliedCouponDiscount = 0;
    let appliedCouponId: number | null = null;
    if (orderData.couponCode) {
      const result = await validateCoupon(
        supabase,
        orderData.couponCode,
        orderData.orderItems || [],
        userId || null
      );
      if (result.ok) {
        appliedCouponCode = result.coupon.code;
        appliedCouponDiscount = result.discount;
        appliedCouponId = result.coupon.id;
        console.log(`[COD] Custom coupon applied: ${appliedCouponCode} = ₹${appliedCouponDiscount} off`);
      } else {
        console.log(`[COD] Custom coupon rejected: ${result.reason}`);
      }
    }

    // Final amount owed, computed entirely from database prices plus the
    // server-validated discounts. The client's `totalAmount` is discarded.
    const totalDiscount = Math.min(
      welcomeCouponDiscount + appliedCouponDiscount,
      totals.itemsTotal
    );
    const payable = Math.max(0, totals.itemsTotal - totalDiscount);
    const authoritativeTotal = payable + COD_Charges;

    // Generate IDs manually since DB defaults seem missing.
    // A bare millisecond timestamp collides when two orders land in the same
    // millisecond, and the insert then fails on the primary key. Mixing in a
    // few random digits keeps the id sortable by time while making a clash
    // vanishingly unlikely.
    const now = new Date();
    const generatedId = now.getTime() * 1000 + Math.floor(Math.random() * 1000);
    const generatedOrderId = `ORD-${generatedId}`;

    const orderPayload = {
      id: generatedId,
      order_id: generatedOrderId,
      items: orderItems,
      total_amount: authoritativeTotal,
      // COD collects nothing online; the courier collects `total_amount`.
      transaction_price: 0,
      shipping_data: orderData.shippingData,
      payment_method: 'cod',
      status: 'placed',
      user_id: userId,
      created_at: now.toISOString(),
      order_date: now.toISOString(),
      welcome_coupon_applied: welcomeCouponApplied,
      welcome_coupon_discount: welcomeCouponDiscount,
      coupon_code: appliedCouponCode,
      coupon_discount: appliedCouponDiscount,
      delivery_status: 'Pending Sync',
    };
    const { data: inserted, error } = await supabase.from('orders').insert([orderPayload]).select();
    if (error) {
      console.error('COD order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = inserted?.[0];

    // Confirm the order over WhatsApp before we spend up to 25s talking to
    // iCarry, so a slow courier API can't delay the customer's confirmation.
    // Never throws — a notification problem must not fail a placed order.
    await notifyOrderPlaced(order);

    // 2. Create Shipment in iCarry. The order is already stamped 'Pending Sync', so
    //    if this call times out the row is still recoverable via /api/orders/sync-shipment.
    //    Wrapped in a 25s race so we never blow the 30s function budget.
    let shipmentSync: any = { success: false, message: 'not attempted' };
    try {
        shipmentSync = await Promise.race([
            syncOrderShipment(supabase, order),
            new Promise((resolve) =>
                setTimeout(
                    () => resolve({ success: false, message: 'iCarry sync ceiling hit in COD handler' }),
                    25000
                )
            ),
        ]);
    } catch (syncErr) {
        console.error(`[COD] iCarry sync threw for order ${order?.id}:`, syncErr);
        shipmentSync = { success: false, message: (syncErr as Error).message || 'sync exception' };
    }
    const trackingId = shipmentSync.success ? shipmentSync.trackingId : '';

    // 3. Record coupon usage (after order is durably created)
    if (appliedCouponId && appliedCouponDiscount > 0) {
      await recordCouponUsage(
        supabase,
        appliedCouponId,
        userId || null,
        order?.id || null,
        appliedCouponDiscount
      );
    }

    // 4. Clear cart for the user
    if (userId) {
      await supabase.from('cart').delete().eq('user_id', userId);
    }

    // 5. Cart cleared above; the "order placed" WhatsApp notification already
    //    went out at step 1 via notifyOrderPlaced(). There used to be a second
    //    automationEngine.emit({type:'ORDER_PLACED'}) here, which meant every
    //    COD order raised the same event twice — two Supabase round trips inside
    //    the function budget, for a message the queue's dedupe_key then threw
    //    away. It also read `shippingData.phone` directly, which breaks on rows
    //    whose shipping_data is stored as a JSON string.

    return NextResponse.json({
      order_id: order?.id,
      tracking_id: trackingId || null,
      shipment: shipmentSync.success
        ? { status: 'created', shipment_id: (shipmentSync as any).shipmentId || null }
        : { status: 'pending', message: shipmentSync.message },
    });
  } catch (err) {
    console.error('COD order exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
