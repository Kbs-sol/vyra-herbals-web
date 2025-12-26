import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const forward = await fetch(origin + '/api/order_info' + url.search, { method: 'GET', headers: req.headers });
  const data = await forward.text();
  return new Response(data, { status: forward.status, headers: { 'Content-Type': forward.headers.get('content-type') || 'application/json' } });
}
