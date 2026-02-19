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
    // Insert a new order with payment_method = cod
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
      order_date: now.toISOString() // Populate order_date as well
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
      if (shipmentResult.success) {
        trackingId = shipmentResult.trackingId || '';
        // Update order with tracking ID and other details
        await supabase.from('orders').update({
          tracking_id: trackingId,
          shipment_id: shipmentResult.shipment_id,
          awb_code: shipmentResult.awb_code,
          courier_name: shipmentResult.courier_name,
          label_url: shipmentResult.label_url,
          delivery_status: 'Booked'
        }).eq('id', order.id);
      }
    } catch (shipError) {
      console.error('Shipment creation failed:', shipError);
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
