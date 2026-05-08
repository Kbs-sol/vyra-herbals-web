import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { validateCoupon, recordCouponUsage } from '@/utils/coupons';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderData } = body || {};
    console.log('COD Order Request:', {
      userId: orderData?.userId,
      totalAmount: orderData?.totalAmount
    });

    if (!orderData) return NextResponse.json({ error: 'orderData required' }, { status: 400 });

    const supabase = createServerSupabase();

    // --- Welcome Coupon Server-Side Validation ---
    let welcomeCouponApplied = false;
    let welcomeCouponDiscount = 0;

    if (orderData.welcomeCouponApplied && orderData.userId) {
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
        .eq('user_id', orderData.userId);

      if (couponConfig?.enabled && (orderCount || 0) === 0) {
        const discountPercent = couponConfig.discount_percent || 10;
        // Recalculate discount server-side from items
        const itemsTotal = (orderData.orderItems || []).reduce(
          (sum: number, item: any) => sum + (item.price * item.quantity), 0
        );
        welcomeCouponDiscount = Math.round(itemsTotal * discountPercent / 100);
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
        orderData.userId || null
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

    // Generate IDs manually since DB defaults seem missing
    const now = new Date();
    const generatedId = now.getTime(); // Simple unique int8
    const generatedOrderId = `ORD-${generatedId}`;

    const orderPayload = {
      id: generatedId,
      order_id: generatedOrderId,
      items: orderData.orderItems,
      total_amount: orderData.totalAmount,
      transaction_price: orderData.transactionPrice,
      shipping_data: orderData.shippingData,
      payment_method: 'cod',
      status: 'placed',
      user_id: orderData.userId,
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

    // 2. Create Shipment in iCarry. The order is already stamped 'Pending Sync', so
    //    if this call times out the row is still recoverable via /api/orders/sync-shipment.
    //    Wrapped in a 25s race so we never blow the 30s function budget.
    const { syncOrderShipment } = await import('@/utils/orderShipment');
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
        orderData.userId || null,
        order?.id || null,
        appliedCouponDiscount
      );
    }

    // 4. Clear cart for the user
    if (orderData.userId) {
      await supabase.from('cart').delete().eq('user_id', orderData.userId);
    }

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
