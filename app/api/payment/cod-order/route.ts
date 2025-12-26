import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../src/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderData } = body || {};
    if (!orderData) return NextResponse.json({ error: 'orderData required' }, { status: 400 });

    const supabase = createServerSupabase();
    // Insert a new order with payment_method = cod
    const orderPayload = {
      items: orderData.orderItems,
      total_amount: orderData.totalAmount,
      transaction_price: orderData.transactionPrice,
      shipping_data: orderData.shippingData,
      payment_method: 'cod',
      status: 'placed'
    };
    const { data: inserted, error } = await supabase.from('orders').insert([orderPayload]).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const order = inserted?.[0];
    return NextResponse.json({ order_id: order?.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
