import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const forward = await fetch(origin + '/api/payment/order-session', { method: 'POST', headers: req.headers, body: await req.text() });
  const data = await forward.text();
  return new Response(data, { status: forward.status, headers: { 'Content-Type': forward.headers.get('content-type') || 'application/json' } });
}
