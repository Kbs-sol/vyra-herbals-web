import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { getAuthedUser } from '@/utils/apiAuth';
import { enforceRateLimit } from '@/utils/rateLimit';

export const runtime = 'nodejs';

/**
 * Fetch a single order for the order-confirmation and order-detail views.
 *
 * The previous version returned the order whenever `order.user_id` was null —
 * so every guest-checkout order, including the customer's name, phone, email
 * and full shipping address, was readable by anyone who could supply an
 * order id (which are sequential timestamps). Guest access now requires the
 * caller to also prove they know the email the order was placed with.
 */

/** Case-insensitive, whitespace-tolerant email comparison. */
function sameEmail(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    // Order ids are guessable, so throttle enumeration attempts.
    const limited = enforceRateLimit(req, 'orders:info', 30, 60_000);
    if (limited) return limited;

    const url = new URL(req.url);
    const order_id = url.searchParams.get('order_id');
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 });

    const supabase = createServerSupabase();

    const user = await getAuthedUser(req, supabase);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .limit(1);

    if (error) {
      console.error('[orders/info] lookup failed:', error.message);
      return NextResponse.json({ error: 'Could not load order' }, { status: 500 });
    }

    const order = orders?.[0];
    if (!order) {
      return NextResponse.json({ status: 'error', message: 'Order not found' }, { status: 404 });
    }

    const shippingData =
      typeof order.shipping_data === 'string'
        ? JSON.parse(order.shipping_data)
        : order.shipping_data;

    // Authorisation, in order of strength:
    //   1. the order belongs to the signed-in user
    //   2. the signed-in user is an admin
    //   3. the signed-in user's email matches the order's shipping email
    //      (covers orders placed before the account existed)
    //   4. an anonymous caller supplies the matching shipping email for a
    //      guest order — knowledge of the email is the shared secret here
    let isAuthorized = false;

    if (user) {
      if (order.user_id === user.id) isAuthorized = true;
      else if (user.role === 2) isAuthorized = true;
      else if (sameEmail(user.email, shippingData?.email)) isAuthorized = true;
    }

    if (!isAuthorized && !order.user_id) {
      // Guest order: require the caller to present the order's email.
      const claimedEmail = url.searchParams.get('email');
      if (sameEmail(claimedEmail, shippingData?.email)) isAuthorized = true;
    }

    if (!isAuthorized) {
      // Log enough to debug a genuine 403 without writing PII to the log.
      console.warn(
        `[orders/info] denied order ${order_id}: caller=${user?.id || 'anonymous'} owner=${order.user_id || 'guest'}`
      );
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
    }

    let shippingAddressStr = order.shipping_address;
    if (!shippingAddressStr && order.shipping_data) {
      shippingAddressStr =
        typeof order.shipping_data === 'string'
          ? order.shipping_data
          : JSON.stringify(order.shipping_data);
    }

    const mappedOrder = {
      ...order,
      shipping_address: shippingAddressStr,
      products: order.items || order.products || [],
    };

    return NextResponse.json({ status: 'success', data: mappedOrder });
  } catch (err) {
    console.error('[orders/info] handler exception:', err);
    return NextResponse.json({ error: 'Could not load order' }, { status: 500 });
  }
}
