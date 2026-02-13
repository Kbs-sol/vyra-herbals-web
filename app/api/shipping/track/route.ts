import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shipment_id } = body;
    if (!shipment_id) {
      return NextResponse.json({ success: 0, message: 'shipment_id is required' }, { status: 400 });
    }

    const { getIcarryToken } = await import('@/utils/shipping');
    const apiToken = await getIcarryToken();

    if (!apiToken) {
      return NextResponse.json({ success: 0, message: 'Shipping authentication failed' }, { status: 501 });
    }

    const apiUrl = `https://www.icarry.in/api_track_shipment&api_token=${apiToken}`;

    // Using x-www-form-urlencoded as per PDF example
    const payload = new URLSearchParams();
    payload.append("shipment_id", String(shipment_id));

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Shipping track error:', err);
    return NextResponse.json({
      success: 0,
      message: (err as Error).message
    }, { status: 500 });
  }
}
