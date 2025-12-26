import { NextResponse } from 'next/server';

// Simple forwarder to our non-.php handler (if implemented), otherwise returns 501.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  try {
    const forward = await fetch(origin + '/api/get', { method: 'POST', headers: req.headers, body: await req.text() });
    const data = await forward.text();
    return new Response(data, { status: forward.status, headers: { 'Content-Type': forward.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  }
}
