import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { syncOrderShipment } from '@/utils/orderShipment';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 30;

/**
 * Retries iCarry shipment creation for orders that didn't sync the first time.
 *
 * POST { order_id: number }       -> sync that single order (must be the caller's, or admin)
 * POST { all: true }              -> admin only; sync every order whose delivery_status is null,
 *                                    'Pending Sync', or starts with 'Sync Failed'.
 */
export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase();
    const body = await req.json().catch(() => ({}));

    // Identify caller
    const authHeader = req.headers.get('Authorization');
    let user: any = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
    }
    let isAdmin = false;
    if (user) {
      const { data: u } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      isAdmin = u?.role === 2;
    }

    // Bulk admin retry
    if (body.all === true) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .is('shipment_id', null)
        .neq('status', 'Failed')
        .limit(20);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const results: any[] = [];
      for (const o of orders || []) {
        const r = await syncOrderShipment(supabase, o);
        results.push({ order_id: o.id, ...r });
      }
      return NextResponse.json({ status: 'ok', results });
    }

    // Single-order retry
    const orderId = body.order_id;
    if (!orderId) {
      return NextResponse.json({ error: 'order_id required' }, { status: 400 });
    }
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!isAdmin && (!user || order.user_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (order.status === 'Failed') {
      return NextResponse.json({ error: 'Order is in Failed state; cannot sync.' }, { status: 400 });
    }

    const result = await syncOrderShipment(supabase, order);
    if (result.success) {
      return NextResponse.json({
        status: 'ok',
        already_synced: !!(result as any).alreadySynced,
        tracking_id: result.trackingId,
        shipment_id: result.shipmentId,
      });
    }
    return NextResponse.json({ status: 'failed', message: result.message }, { status: 502 });
  } catch (err) {
    console.error('sync-shipment exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
