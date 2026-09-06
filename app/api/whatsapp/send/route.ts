import { NextResponse } from 'next/server';
import { messageQueue } from '@/services/communications';
import { sendQueuedMessage } from '@/services/communications/queue/messageSender';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

interface ManualSendBody {
  order_id: number;
  customer_phone: string;
  template_name: string;
  parameters: Record<string, string | number>;
}

/**
 * Admin-only endpoint to manually trigger a WhatsApp send outside the
 * normal event flow — e.g. re-sending a notification a customer says they
 * never received, or sending an ad-hoc template.
 */
export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  let body: ManualSendBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.order_id || !body.customer_phone || !body.template_name) {
    return NextResponse.json(
      { error: 'order_id, customer_phone, and template_name are required' },
      { status: 400 }
    );
  }

  const phone = tryNormalizePhone(body.customer_phone);
  if (!phone) {
    return NextResponse.json({ error: 'customer_phone is not a valid phone number' }, { status: 400 });
  }

  const queued = await messageQueue.enqueue({
    order_id: body.order_id,
    customer_phone: phone,
    message_type: 'MANUAL', // ad-hoc admin sends aren't tied to a domain event; see template_name for actual content
    provider: 'whatsapp',
    template_name: body.template_name,
    parameters: body.parameters ?? {},
    dedupe_key: `MANUAL:${body.order_id}:${body.template_name}:${Date.now()}`,
  });

  const outcome = await sendQueuedMessage(queued, whatsappClient);

  return NextResponse.json(
    { queue_id: queued.id, outcome },
    { status: outcome === 'sent' ? 200 : 502 }
  );
}
