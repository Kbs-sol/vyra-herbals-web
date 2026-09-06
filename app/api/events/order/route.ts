import { NextResponse } from 'next/server';
import { automationEngine } from '@/services/communications';
import type { OrderPlacedEvent } from '@/types/communications';

export const runtime = 'nodejs';

/**
 * Internal endpoint other services/processes can POST to instead of
 * importing automationEngine directly (useful for calling from a separate
 * worker, a Supabase function, or a script). Body shape matches
 * OrderPlacedEvent minus `type`.
 */
export async function POST(req: Request) {
  let body: Omit<OrderPlacedEvent, 'type'>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.order_id || !body.customer_phone) {
    return NextResponse.json(
      { error: 'order_id and customer_phone are required' },
      { status: 400 }
    );
  }

  await automationEngine.emit({ type: 'ORDER_PLACED', ...body }, 'api');

  // Always 202 — emit() never throws and the send itself is async/best-effort.
  return NextResponse.json({ accepted: true }, { status: 202 });
}
