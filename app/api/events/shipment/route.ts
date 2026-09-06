import { NextResponse } from 'next/server';
import { automationEngine } from '@/services/communications';
import type { ShipmentCreatedEvent, DeliveryStatusUpdatedEvent } from '@/types/communications';

export const runtime = 'nodejs';

type ShipmentEventBody =
  | (Omit<ShipmentCreatedEvent, 'type'> & { type: 'SHIPMENT_CREATED' })
  | (Omit<DeliveryStatusUpdatedEvent, 'type'> & { type: 'DELIVERY_STATUS_UPDATED' });

/**
 * Handles both shipment creation and delivery status transitions since
 * both originate from the same shipment-sync code path (orderShipment.ts
 * and the delivery-status cron). `type` in the body disambiguates.
 */
export async function POST(req: Request) {
  let body: ShipmentEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.order_id || !body.customer_phone || !body.type) {
    return NextResponse.json(
      { error: 'order_id, customer_phone, and type are required' },
      { status: 400 }
    );
  }

  if (body.type !== 'SHIPMENT_CREATED' && body.type !== 'DELIVERY_STATUS_UPDATED') {
    // Read the value out before the guard narrows `body` to `never`.
    const received = (body as { type?: unknown }).type;
    return NextResponse.json({ error: `Unsupported type: ${String(received)}` }, { status: 400 });
  }

  await automationEngine.emit(body, 'api');
  return NextResponse.json({ accepted: true }, { status: 202 });
}
