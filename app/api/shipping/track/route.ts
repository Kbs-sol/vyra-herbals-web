import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

function parseShippingData(shippingData: unknown): Record<string, any> {
  if (!shippingData) return {};
  if (typeof shippingData === 'string') {
    try {
      return JSON.parse(shippingData);
    } catch {
      return {};
    }
  }
  if (typeof shippingData === 'object') {
    return shippingData as Record<string, any>;
  }
  return {};
}

function normalizeIcarryTracking(data: any) {
  if (!data || typeof data !== 'object') return null;

  const successFlag = data.success === 1 || data.success === '1' || data.success === true;
  const source = data?.data && typeof data.data === 'object' ? data.data : data;

  const status = source?.status || source?.current_status || source?.delivery_status || source?.shipment_status;
  if (!successFlag || !status) return null;

  const location =
    source?.location ||
    source?.current_location ||
    source?.last_location ||
    source?.city ||
    'Will update soon';

  const edd =
    source?.edd ||
    source?.expected_delivery_date ||
    source?.expected_date ||
    source?.estimated_delivery ||
    '';

  const detailsRaw = source?.details || source?.tracking_details || source?.events || [];
  const details = Array.isArray(detailsRaw)
    ? detailsRaw
        .map((entry: any) => ({
          location: String(entry?.location || entry?.city || entry?.hub || location),
          status: String(entry?.status || entry?.event || entry?.remark || status),
          time: String(entry?.time || entry?.date || entry?.created_at || entry?.updated_at || ''),
        }))
        .filter((entry: { location: string; status: string; time: string }) => entry.status)
    : [];

  return {
    ...data,
    success: 1,
    status: String(status),
    location: String(location),
    edd: edd ? String(edd) : undefined,
    details,
  };
}

function buildLocalTracking(order: any) {
  const shipping = parseShippingData(order?.shipping_data);
  const status = order?.delivery_status || order?.status || 'Placed';
  const location = shipping?.city || shipping?.state || order?.courier_name || 'Will update soon';

  const timeline = Array.isArray(order?.status_timeline) ? order.status_timeline : [];
  const details = timeline
    .map((entry: any) => ({
      location: String(entry?.location || location),
      status: String(entry?.status || status),
      time: String(entry?.time || entry?.date || entry?.created_at || ''),
    }))
    .filter((entry: { location: string; status: string; time: string }) => entry.status);

  return {
    success: 1,
    status: String(status),
    location: String(location),
    edd: '',
    details,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawIdentifier = body?.shipment_id ?? body?.order_id ?? body?.tracking_id;

    if (!rawIdentifier) {
      return NextResponse.json({ success: 0, message: 'shipment_id is required' }, { status: 400 });
    }

    const identifier = String(rawIdentifier).trim();
    const supabase = createServerSupabase();

    let order: any = null;
    const orderFields = 'id, order_id, status, delivery_status, tracking_id, shipment_id, awb_code, courier_name, shipping_data, status_timeline';

    if (/^\d+$/.test(identifier)) {
      const { data: byId } = await supabase
        .from('orders')
        .select(orderFields)
        .eq('id', Number(identifier))
        .limit(1);
      order = byId?.[0] || null;
    }

    if (!order) {
      const keys: Array<'order_id' | 'tracking_id' | 'shipment_id' | 'awb_code'> = ['order_id', 'tracking_id', 'shipment_id', 'awb_code'];
      for (const key of keys) {
        const { data } = await supabase
          .from('orders')
          .select(orderFields)
          .eq(key, identifier)
          .limit(1);
        if (data?.[0]) {
          order = data[0];
          break;
        }
      }
    }

    const { getIcarryToken } = await import('@/utils/shipping');
    const apiToken = await getIcarryToken();

    const shipmentIdForTracking = order?.shipment_id || identifier;

    if (apiToken && shipmentIdForTracking) {
      const apiUrl = `https://www.icarry.in/api_track_shipment?api_token=${apiToken}`;

      const payload = new URLSearchParams();
      payload.append('shipment_id', String(shipmentIdForTracking));

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });

      const rawText = await res.text();
      let carrierData: any = null;
      try {
        carrierData = JSON.parse(rawText);
      } catch {
        carrierData = null;
      }

      const normalizedCarrier = normalizeIcarryTracking(carrierData);
      if (normalizedCarrier) {
        return NextResponse.json(normalizedCarrier);
      }
    }

    if (order) {
      return NextResponse.json(buildLocalTracking(order));
    }

    return NextResponse.json({ success: 0, message: 'Invalid Order ID. Please check and try again.' }, { status: 404 });
  } catch (err) {
    console.error('Shipping track error:', err);
    return NextResponse.json({
      success: 0,
      message: (err as Error).message
    }, { status: 500 });
  }
}
