import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

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
      welcome_coupon_discount: welcomeCouponDiscount
    };
    const { data: inserted, error } = await supabase.from('orders').insert([orderPayload]).select();
    if (error) {
      console.error('COD order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = inserted?.[0];

    // 2. Create Shipment automatically
    let trackingId = '';
    try {
      const { createShipment } = await import('@/utils/shipping');
      const shipmentResult = await createShipment({ ...orderPayload, id: order.id });
      console.log(`[COD Order] Shipment creation result for order ${order.id}:`, shipmentResult);
      if (shipmentResult.success) {
        trackingId = shipmentResult.trackingId || '';
        // Update order with tracking ID and other details
        const { error: updateError } = await supabase.from('orders').update({
          tracking_id: trackingId,
          shipment_id: shipmentResult.shipment_id,
          awb_code: shipmentResult.awb_code,
          courier_name: shipmentResult.courier_name,
          label_url: shipmentResult.label_url,
          delivery_status: 'Booked'
        }).eq('id', order.id);

        if (updateError) {
          console.error(`[COD Order] Failed to update order ${order.id} with tracking info:`, updateError);
        }
      } else {
        console.error(`[COD Order] Shipment creation failed for order ${order.id}:`, shipmentResult.message);
      }
    } catch (shipError) {
      console.error('[COD Order] Shipment creation exception:', shipError);
    }

    // 3. Clear cart for the user
    if (orderData.userId) {
      await supabase.from('cart').delete().eq('user_id', orderData.userId);
    }

    return NextResponse.json({ order_id: order?.id });
  } catch (err) {
    console.error('COD order exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
