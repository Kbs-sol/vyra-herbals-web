import { NextResponse } from 'next/server';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';
import { messageQueue } from '@/services/communications';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { sendQueuedMessage } from '@/services/communications/queue/messageSender';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.warn('[user-registered webhook] WEBHOOK_SECRET not set');
    } else if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const { user_id, name, phone } = body;

    const normalizedPhone = tryNormalizePhone(phone);
    if (!normalizedPhone) {
      console.info('[user-registered webhook] No valid phone for user ' + String(user_id));
      return NextResponse.json({ ok: true, skipped: 'no_phone' });
    }

    const dedupeKey = 'PROMO_3HR:' + String(user_id);
    const existing = await messageQueue.findByDedupeKey(dedupeKey);
    if (existing) {
      console.info('[user-registered webhook] Promo already queued for user ' + String(user_id));
      return NextResponse.json({ ok: true, skipped: 'already_queued' });
    }

    const scheduledFor = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const customerName = name && name.trim() ? name.trim() : 'there';
    const templateName = process.env.WHATSAPP_TEMPLATE_WELCOME_PROMO ?? 'welcome_promo_3hr';

    const queued = await messageQueue.enqueue({
      order_id: null,
      customer_phone: normalizedPhone,
      message_type: 'MANUAL',
      provider: 'whatsapp',
      template_name: templateName,
      parameters: [customerName],
      dedupe_key: dedupeKey,
      scheduled_for: scheduledFor,
    });

    console.info('[user-registered webhook] Promo scheduled for user ' + String(user_id) + ' at ' + scheduledFor.toISOString());

    return NextResponse.json({ ok: true, scheduled_for: scheduledFor.toISOString(), queue_id: queued.id });
  } catch (err: any) {
    console.error('[user-registered webhook] Error:', (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 200 });
  }
}
