import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const order_id = url.searchParams.get('order_id');
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 });

    const supabase = createServerSupabase();

    // 1. Get user from auth token
    const authHeader = req.headers.get('Authorization');
    let user: any = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError) user = authUser;
    }

    // 2. Fetch order
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .limit(1);

    if (error) {
      console.error('Order info error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = orders?.[0];
    if (!order) {
      return NextResponse.json({ status: 'error', message: 'Order not found' }, { status: 404 });
    }

    // 3. Security check: Ensure user owns this order
    // Allow if:
    // a. Order belongs to this user ID
    // b. User's email matches the shipping email (for legacy or guest orders)
    // c. User is an admin (role 2)
    let isAuthorized = false;

    // Check role if user exists
    let userRole = 1;
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      userRole = userData?.role || 1;
    }

    const shippingData = typeof order.shipping_data === 'string'
      ? JSON.parse(order.shipping_data)
      : order.shipping_data;

    if (user) {
      if (order.user_id === user.id) isAuthorized = true;
      else if (userRole === 2) isAuthorized = true; // Admin
      else if (user.email && shippingData && shippingData.email === user.email) isAuthorized = true;
    }

    // If still not authorized, check if it's a guest order or legacy view (less secure, but needed for some flows)
    // For now, if no auth token but ID matches, we return error if we want it "fail-proof"
    if (!isAuthorized && order.user_id) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
    }

    // Normalize data for frontend
    let shippingAddressStr = order.shipping_address;
    if (!shippingAddressStr && order.shipping_data) {
      shippingAddressStr = typeof order.shipping_data === 'string'
        ? order.shipping_data
        : JSON.stringify(order.shipping_data);
    }

    const mappedOrder = {
      ...order,
      shipping_address: shippingAddressStr,
      products: order.items || order.products || [],
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
