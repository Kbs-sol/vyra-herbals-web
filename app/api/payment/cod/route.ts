import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

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
      status: 'placed',
      user_id: orderData.userId,
      created_at: new Date().toISOString()
    };
    const { data: inserted, error } = await supabase.from('orders').insert([orderPayload]).select();
    if (error) {
      console.error('COD order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = inserted?.[0];

    // Clear cart for the user
    if (orderData.userId) {
      await supabase.from('cart').delete().eq('user_id', orderData.userId);
    }

    return NextResponse.json({ order_id: order?.id });
  } catch (err) {
    console.error('COD order exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
