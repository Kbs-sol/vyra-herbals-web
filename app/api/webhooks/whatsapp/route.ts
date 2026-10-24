import { NextResponse } from 'next/server';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { verifyWebhookHandshake } from '@/services/communications/providers/whatsapp/webhookHandler';
import { updateDeliveryStatusByMessageId } from '@/services/communications/logging/messageLogger';
import { logInboundMessage } from '@/services/communications/logging/inboundLogger';
import { logger } from '@/services/communications/logging/logger';

// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs'; // crypto signature verification needs the Node runtime, not edge

/**
 * GET /api/webhooks/whatsapp
 * One-time verification handshake Meta performs when you register/update
 * the webhook URL in the App Dashboard (Webhooks > WhatsApp Business Account).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = verifyWebhookHandshake({
    mode: searchParams.get('hub.mode'),
    token: searchParams.get('hub.verify_token'),
    challenge: searchParams.get('hub.challenge'),
  });

  if (challenge === null) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Meta expects the raw challenge string back, not JSON.
  return new NextResponse(challenge, { status: 200 });
}

/**
 * POST /api/webhooks/whatsapp
 * Delivery/read status updates from Meta. Must verify the HMAC signature
 * against the RAW body before parsing — hence reading req.text() first
 * instead of req.json().
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!whatsappClient.verifyWebhook({ payload: rawBody, signatureHeader: signature })) {
    logger.warn('whatsapp_webhook_signature_invalid', {});
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const updates = whatsappClient.parseWebhookEvent(body);
  const incomingMessages = whatsappClient.parseIncomingMessages(body);

  // 1. Process Status Updates
  for (const update of updates) {
    const targetStatus =
      update.status === 'sent' ? null : (update.status as 'delivered' | 'read' | 'failed');

    if (!targetStatus) continue;

    const matched = await updateDeliveryStatusByMessageId(
      update.message_id,
      targetStatus,
      new Date(Number(update.timestamp) * 1000),
      update.error?.message
    );

    if (!matched) {
      logger.warn('whatsapp_webhook_orphaned_status_update', {
        message_id: update.message_id,
        status: update.status,
      });
    }
  }

  // 2. Persist inbound messages so the admin inbox can render them.
  //    Doing this synchronously (but wrapped) is fine — the insert is a
  //    single Supabase call and we still 200 fast.
  //    IMPORTANT: this MUST happen even if the bot fails; the admin inbox is
  //    the only surface that recovers a message the bot didn't understand.
  if (incomingMessages.length > 0) {
    await Promise.allSettled(incomingMessages.map((m: any) => logInboundMessage(m).catch((err) => {
      logger.error('inbound_log_failed', { error: err?.message, from: m?.from, id: m?.id });
    })));
  }

  // 3. Process Incoming Messages (Conversational Bot)
  // Dynamic import to avoid circular dependencies and keep the webhook hot path fast
  if (incomingMessages.length > 0) {
    // Process asynchronously so we don't block the 200 OK response to Meta
    import('@/services/communications/bot/botEngine')
      .then(({ processIncomingMessages }) => {
        processIncomingMessages(incomingMessages).catch((err) => {
          logger.error('whatsapp_bot_processing_error', { error: err.message });
        });
      })
      .catch((err) => {
        logger.error('whatsapp_bot_import_error', { error: err.message });
      });
  }

  // Meta requires a fast 200 regardless of downstream processing outcome,
  // or it will back off and eventually disable the webhook.
  return NextResponse.json({ 
    received_updates: updates.length,
    received_messages: incomingMessages.length 
  });
}
