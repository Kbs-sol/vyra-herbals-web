import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const maxDuration = 30;

function parseShippingData(shippingData: unknown): Record<string, any> {
  if (!shippingData) return {};
  if (typeof shippingData === 'string') {
    try { return JSON.parse(shippingData); } catch { return {}; }
  }
  if (typeof shippingData === 'object') return shippingData as Record<string, any>;
  return {};
}

function normalizeIcarryTracking(data: any) {
  if (!data || typeof data !== 'object') return null;

  // iCarry returns `success` either as 1/true OR as a human-readable string
  // (e.g. "Success: Shipment found ..."). Treat string starting with "success" as truthy.
  const errorMessage = typeof data?.error === 'string' ? data.error.trim() : (data?.error || '');
  const successField = data?.success;
  const successString = typeof successField === 'string' &&
    successField.trim().toLowerCase().startsWith('success');
  const successFlag = !errorMessage && (
    successField === 1 || successField === '1' || successField === true || successString
  );

  const source = data?.data && typeof data.data === 'object' ? data.data : data;

  const status =
    source?.status || source?.current_status || source?.delivery_status ||
    source?.shipment_status || source?.awb_status ||
    source?.tracking_status || source?.last_status;
  if (!successFlag || !status) return null;

  const location =
    source?.location || source?.current_location || source?.last_location ||
    source?.city || source?.current_city || 'Will update soon';

  const edd =
    source?.edd || source?.expected_delivery_date || source?.expected_date ||
    source?.estimated_delivery || source?.EDD || '';

  const detailsRaw =
    source?.details || source?.tracking_details || source?.events ||
    source?.activity || source?.scans || source?.checkpoints ||
    source?.scan_details || source?.shipment_track_activities ||
    source?.tracking_events || source?.Activities || [];

  const details = Array.isArray(detailsRaw)
    ? detailsRaw
        .map((entry: any) => ({
          location: String(
            entry?.location || entry?.city || entry?.hub || entry?.sr_city_name ||
            entry?.Location || entry?.City || location
          ),
          status: String(
            entry?.status || entry?.event || entry?.remark || entry?.activity ||
            entry?.sr_status || entry?.Status || entry?.Activity || entry?.Description || status
          ),
          time: String(
            entry?.time || entry?.date || entry?.created_at || entry?.updated_at ||
            entry?.timestamp || entry?.sr_date || entry?.Date || entry?.DateTime || ''
          ),
        }))
        .filter((e: { status: string }) => e.status)
    : [];

  const awb =
    source?.awb || source?.awb_code || source?.tracking_number ||
    source?.consignment_no || source?.AWB || '';
  const courierName =
    source?.courier || source?.courier_name || source?.carrier ||
    source?.courier_company || '';

  return {
    success: 1,
    status: String(status),
    location: String(location),
    edd: edd ? String(edd) : undefined,
    details,
    awb_code: awb ? String(awb) : undefined,
    courier_name: courierName ? String(courierName) : undefined,
  };
}

async function callIcarryTracking(apiUrl: string, params: Record<string, string>) {
  try {
    const payload = new URLSearchParams(params);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.icarry.in/',
        'Origin': 'https://www.icarry.in',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'max-age=0'
      },
      body: payload,
    });
    const rawText = await res.text();

    // Check for Cloudflare HTML block
    if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      console.error('iCarry tracking returned HTML (Cloudflare block) for params:', params);
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error('iCarry tracking returned non-JSON for params', params, '— body:', rawText.slice(0, 300));
      return null;
    }

    const normalized = normalizeIcarryTracking(parsed);
    if (!normalized) {
      console.warn('iCarry tracking response did not normalize for params', params, '— body:', rawText.slice(0, 300));
    }
    return normalized;
  } catch (err) {
    console.error('iCarry tracking API error:', err);
    return null;
  }
}

// iCarry's `api_track_shipment` only accepts their internal numeric `shipment_id`
// (it rejects raw AWBs with "Error : Shipment id is required."). To track by AWB
// we instead scrape iCarry's public tracking page, which is server-side rendered
// with the same data behind no auth.
const PUBLIC_TRACKING_STEPS = [
  'Ready To Ship',
  'Scheduled for Pickup',
  'In-transit',
  'Out for delivery',
  'Delivered',
];

function extractSummaryRows(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<span class="summary-label">([^<]+)<\/span>\s*<span class="summary-value">([^<]+)<\/span>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const key = match[1].replace(/\s*:\s*$/, '').trim().toLowerCase();
    out[key] = match[2].trim();
  }
  return out;
}

// Match a balanced { ... } block following an `=` after the given variable name,
// avoiding the commented-out demo block that appears earlier on the page.
function extractObjectAssignment(source: string, varName: string): string | null {
  const declRe = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\{`);
  const m = declRe.exec(source);
  if (!m) return null;
  const start = m.index + m[0].length - 1; // position of '{'
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function parsePublicEvents(eventsText: string): Array<{ date: string; location: string; detail: string }> {
  const re = /\{\s*date:\s*"([^"]+)"\s*,\s*location:\s*"([^"]+)"\s*,\s*detail:\s*"([^"]+)"\s*,?\s*\}/g;
  const out: Array<{ date: string; location: string; detail: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(eventsText)) !== null) {
    out.push({ date: m[1], location: m[2], detail: m[3] });
  }
  return out;
}

async function trackByPublicAwbPage(awb: string) {
  try {
    const res = await fetch(`https://www.icarry.in/track-shipment?awb=${encodeURIComponent(awb)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      console.warn('iCarry public track page returned', res.status, 'for AWB', awb);
      return null;
    }
    const html = await res.text();
    const summary = extractSummaryRows(html);

    if (!summary['awb']) {
      console.warn('iCarry public track page has no AWB row for', awb, '— likely invalid AWB');
      return null;
    }

    const status = summary['status'] || 'Pending';
    const courier = summary['courier name'] || '';
    const location = summary['destination'] || '';

    // The page contains a commented-out demo `exampleShipmentDetails` block
    // before the real one — strip /* ... */ comments first.
    const stripped = html.replace(/\/\*[\s\S]*?\*\//g, '');
    const detailsObj = extractObjectAssignment(stripped, 'exampleShipmentDetails');
    const events = detailsObj ? parsePublicEvents(detailsObj) : [];

    const stepMatch = stripped.match(/exampleCurrentStep\s*=\s*(\d+)/);
    const currentStep = stepMatch ? Math.max(0, Math.min(PUBLIC_TRACKING_STEPS.length - 1, Number(stepMatch[1]))) : 0;
    const stepLabel = PUBLIC_TRACKING_STEPS[currentStep];

    // Prefer iCarry's text status, fall back to milestone label
    const finalStatus = status || stepLabel;

    return {
      success: 1,
      status: String(finalStatus),
      location: String(location || 'Will update soon'),
      edd: summary['delivery tat'] || undefined,
      details: events.map(e => ({ status: e.detail, location: e.location, time: e.date })),
      awb_code: String(summary['awb']),
      courier_name: String(courier),
    };
  } catch (err) {
    console.error('iCarry public track scrape error:', err);
    return null;
  }
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
    .filter((e: { status: string }) => e.status);

  return {
    success: 1,
    status: String(status),
    location: String(location),
    edd: '',
    details,
    awb_code: order?.awb_code || undefined,
    courier_name: order?.courier_name || undefined,
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

    // Look up by numeric DB id
    if (/^\d+$/.test(identifier) && identifier.length <= 10) {
      const { data: byId } = await supabase
        .from('orders')
        .select(orderFields)
        .eq('id', Number(identifier))
        .limit(1);
      order = byId?.[0] || null;
    }

    // Look up by order_id / tracking_id / shipment_id / awb_code
    if (!order) {
      const keys: Array<'order_id' | 'tracking_id' | 'shipment_id' | 'awb_code'> = [
        'order_id', 'tracking_id', 'shipment_id', 'awb_code',
      ];
      for (const key of keys) {
        const { data } = await supabase
          .from('orders')
          .select(orderFields)
          .eq(key, identifier)
          .limit(1);
        if (data?.[0]) { order = data[0]; break; }
      }
    }

    const { getIcarryToken } = await import('@/utils/shipping');
    const apiToken = await getIcarryToken();

    // 1. iCarry internal shipment_id (stored at order creation) → authenticated track API
    if (apiToken && order?.shipment_id) {
      const apiUrl = `https://www.icarry.in/api_track_shipment?api_token=${apiToken}`;
      const r = await callIcarryTracking(apiUrl, { shipment_id: String(order.shipment_id) });
      if (r) return NextResponse.json({
        ...r,
        awb_code: r.awb_code || order.awb_code,
        courier_name: r.courier_name || order.courier_name,
      });
    }

    // 2. AWB stored in DB → public AWB tracking page
    if (order?.awb_code && order.awb_code !== order.shipment_id) {
      const r = await trackByPublicAwbPage(String(order.awb_code));
      if (r) return NextResponse.json({
        ...r,
        awb_code: r.awb_code || order.awb_code,
        courier_name: r.courier_name || order.courier_name,
      });
    }

    // 3. Identifier looks like iCarry's short internal shipment_id (≤10 digits)
    if (apiToken && /^\d{1,10}$/.test(identifier)) {
      const apiUrl = `https://www.icarry.in/api_track_shipment?api_token=${apiToken}`;
      const r3 = await callIcarryTracking(apiUrl, { shipment_id: identifier });
      if (r3) return NextResponse.json({
        ...r3,
        courier_name: r3.courier_name || order?.courier_name,
      });
    }

    // 4. Identifier looks like an AWB (longer numeric) → public AWB tracking page
    if (/^\d{11,}$/.test(identifier)) {
      const r4 = await trackByPublicAwbPage(identifier);
      if (r4) return NextResponse.json({
        ...r4,
        awb_code: r4.awb_code || identifier,
        courier_name: r4.courier_name || order?.courier_name,
      });
    }

    if (!apiToken) {
      console.error('Shipping track: iCarry token unavailable, falling back to local data');
    }

    if (order) return NextResponse.json(buildLocalTracking(order));

    return NextResponse.json(
      { success: 0, message: 'Invalid Order ID. Please check and try again.' },
      { status: 404 }
    );
  } catch (err) {
    console.error('Shipping track error:', err);
    return NextResponse.json({ success: 0, message: (err as Error).message }, { status: 500 });
  }
}
