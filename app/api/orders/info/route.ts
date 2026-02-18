import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const order_id = url.searchParams.get('order_id');
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 });

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .limit(1);
    if (error) {
      console.error('Order info error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = data?.[0];

    if (!order) {
      return NextResponse.json({ status: 'error', message: 'Order not found' }, { status: 404 });
    }

    // Normalize data for frontend
    // Map shipping_data (DB) -> shipping_address (Frontend expectation)
    // Ensure it is stringified because frontend calls JSON.parse()
    let shippingAddressStr = order.shipping_address;
    if (!shippingAddressStr && order.shipping_data) {
      shippingAddressStr = typeof order.shipping_data === 'string'
        ? order.shipping_data
        : JSON.stringify(order.shipping_data);
    }

    const mappedOrder = {
      ...order,
      shipping_address: shippingAddressStr,
      products: order.items || order.products || [], // Normalize items
      // Ensure other fields match if needed
    };

    return NextResponse.json({
      status: 'success',
      data: mappedOrder
    });
  } catch (err) {
    console.error('Order info exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
