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
  //    IMPORTANT: this MUST happen even if the bot fails; the admin inbox is
  //    the only surface that recovers a message the bot didn't understand.
  const inboundLogPromise = incomingMessages.length > 0
    ? Promise.allSettled(
        incomingMessages.map((m: any) =>
          logInboundMessage(m).catch((err) => {
            logger.error('inbound_log_failed', { error: err?.message, from: m?.from, id: m?.id });
          })
        )
      )
    : Promise.resolve();

  // 3. Process Incoming Messages (Conversational Bot)
  // We await the bot execution directly inside the serverless function execution context
  // so Vercel does not freeze or terminate background promises mid-flow.
  if (incomingMessages.length > 0) {
    try {
      const { processIncomingMessages } = await import('@/services/communications/bot/botEngine');
      await processIncomingMessages(incomingMessages);
    } catch (err: any) {
      logger.error('whatsapp_bot_processing_error', { error: err?.message });
    }
  }

  // Ensure inbound message logs complete
  await inboundLogPromise;

  // Return 200 OK to Meta
  return NextResponse.json({ 
    received_updates: updates.length,
    received_messages: incomingMessages.length 
  });
}
