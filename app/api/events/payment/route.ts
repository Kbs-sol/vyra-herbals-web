import { NextResponse } from 'next/server';
import { automationEngine } from '@/services/communications';
import type { PaymentConfirmedEvent } from '@/types/communications';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: Omit<PaymentConfirmedEvent, 'type'>;
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

  await automationEngine.emit({ type: 'PAYMENT_CONFIRMED', ...body }, 'api');
  return NextResponse.json({ accepted: true }, { status: 202 });
}
