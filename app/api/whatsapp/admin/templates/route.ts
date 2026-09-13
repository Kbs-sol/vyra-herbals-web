import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getTemplate, resolveDeliveryStatusTemplate } from '@/services/communications/config/templates';
import type { EventType } from '@/types/communications';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

const STANDARD_EVENT_TYPES: EventType[] = [
  'ORDER_PLACED',
  'PAYMENT_CONFIRMED',
  'SHIPMENT_CREATED',
  'REFUND_INITIATED',
];

const DELIVERY_STATUSES = ['Picked up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delivery Failed'];

/**
 * GET /api/whatsapp/admin/templates
 * Read-only view of which Meta template name is currently resolved for
 * each event type, sourced live from env vars — useful for verifying a
 * config change actually took effect after a redeploy.
 */
export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const templates = STANDARD_EVENT_TYPES.map((type) => ({
    event_type: type,
    ...getTemplate(type),
  }));

  const deliveryTemplates = DELIVERY_STATUSES.map((status) => ({
    event_type: 'DELIVERY_STATUS_UPDATED',
    status,
    ...resolveDeliveryStatusTemplate(status),
  }));

  return NextResponse.json({ templates: [...templates, ...deliveryTemplates] });
}
