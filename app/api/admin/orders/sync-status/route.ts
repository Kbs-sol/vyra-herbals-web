import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getIcarryToken } from '@/utils/shipping';
import { fetchIcarryStatus, mapIcarryStatus, ORDER_STATUS_RANK } from '@/utils/icarryTracking';
import { notifyDeliveryStatusChanged } from '@/services/communications/integration/orderNotifications';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 60;

/**
 * Pull live shipment status from iCarry and write shipped/delivered back onto
 * orders. Admin-only.
 *
 * POST {}                 -> sync up to 100 non-terminal orders that have a shipment_id
 * POST { order_id }       -> sync just that order
 *
 * Status only ever moves FORWARD (placed < confirmed < shipped < delivered);
 * we never regress or auto-cancel. The raw iCarry string is always saved to
 * delivery_status for visibility.
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerSupabase();
    const body = await request.json().catch(() => ({}));
    const singleId = body?.order_id;

    let query = supabase
      .from('orders')
      .select('id, status, delivery_status, shipment_id, awb_code, tracking_id, shipping_data')
      .not('shipment_id', 'is', null);
    if (singleId) query = query.eq('id', singleId);

    const { data: orders, error } = await query.limit(singleId ? 1 : 100);
    if (error) throw error;

    const apiToken = await getIcarryToken();
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'iCarry token unavailable' },
        { status: 502 }
      );
    }

    const results: any[] = [];

    // Each customer notification costs a Meta round-trip, and a bulk sync can
    // touch 100 orders inside a 60s budget. We stop after this many messages
    // and leave the remaining orders completely untouched, so their status
    // change is still pending and the next run notifies them properly.
    const NOTIFY_BUDGET = 20;
    let notified = 0;

    for (const o of orders || []) {
      // Skip orders already in a terminal state on bulk runs.
      if (!singleId && (o.status === 'delivered' || o.status === 'cancelled')) continue;

      const raw = await fetchIcarryStatus(String(o.shipment_id), apiToken);
      if (!raw) {
        results.push({ id: o.id, updated: false, reason: 'no live status' });
        continue;
      }

      const mapped = mapIcarryStatus(raw);
      const update: Record<string, any> = { delivery_status: mapped.delivery_status };

      // Only advance forward; never regress a status or auto-cancel.
      if (
        mapped.status &&
        (ORDER_STATUS_RANK[mapped.status] || 0) > (ORDER_STATUS_RANK[o.status] || 0)
      ) {
        update.status = mapped.status;
      }

      const { error: upErr } = await supabase.from('orders').update(update).eq('id', o.id);
      results.push({
        id: o.id,
        updated: !upErr,
        status: update.status || o.status,
        delivery_status: mapped.delivery_status,
        error: upErr?.message,
      });

      // Notify the customer when the milestone actually moved. The helper
      // ignores statuses we have no template for (booked, pending, label
      // created), parses `shipping_data` whether it's JSONB or a legacy JSON
      // string, and never throws. Repeat syncs at the same status are
      // swallowed by the queue's dedupe_key.
      if (!upErr && mapped.delivery_status !== o.delivery_status) {
        await notifyDeliveryStatusChanged(o, raw, 'api');
        notified += 1;

        if (notified >= NOTIFY_BUDGET) {
          console.warn(
            `[sync-status] notification budget (${NOTIFY_BUDGET}) reached after ${results.length} orders; ` +
              'remaining orders left unchanged for the next run.'
          );
          break;
        }
      }
    }

    const updated = results.filter((r) => r.updated).length;
    return NextResponse.json({ success: true, checked: results.length, updated, results });
  } catch (err) {
    console.error('sync-status error:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
