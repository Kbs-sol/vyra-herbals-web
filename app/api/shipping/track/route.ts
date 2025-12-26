import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // This originally proxied to a third-party shipping provider.
    // If you have a shipping provider URL set in `process.env.SHIPPING_PROXY_URL`, we'll forward the request.
    const proxyUrl = process.env.SHIPPING_PROXY_URL;
    if (!proxyUrl) {
      return NextResponse.json({ success: 0, message: 'Shipping provider not configured. Set SHIPPING_PROXY_URL env.' }, { status: 501 });
    }

    const res = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Shipping track error:', err);
    return NextResponse.json({ success: 0, message: (err as Error).message }, { status: 500 });
  }
}
