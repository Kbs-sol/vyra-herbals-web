import type { CommunicationEvent, EventSource } from '@/types/communications';
import { getHandler, isFeatureEnabled } from './workflow';
import { messageQueue } from '../queue/dbQueue';
import { sendQueuedMessage } from '../queue/messageSender';
import { whatsappClient } from '../providers/whatsapp/client';
import { logEvent, markEventProcessed } from '../logging/eventLogger';
import { logger } from '../logging/logger';

/**
 * Single entry point the rest of the app calls to react to a domain event.
 * Deliberately swallows all errors — a WhatsApp notification failing must
 * never fail the order/payment/shipment API route that triggered it.
 */
export async function emit(event: CommunicationEvent, source: EventSource = 'api'): Promise<void> {
  const dedupeKey = event.dedupe_key ?? `${event.type}:${event.order_id}`;
  const enrichedEvent = { ...event, dedupe_key: dedupeKey, source };

  // Declared outside the try so the catch can still close out the log row.
  // The logEvent() call itself is INSIDE the try: it used to sit above it,
  // which made this whole function able to reject on its first line (a missing
  // service-role key or a missing message_events table) — on the checkout path.
  let eventLogId: number | null = null;

  try {
    eventLogId = await logEvent({
      order_id: event.order_id,
      event_type: event.type,
      event_source: source,
      payload: enrichedEvent as Record<string, unknown>,
      status: 'received',
    });

    // Master kill-switch, checked BEFORE enqueueing rather than only inside
    // the provider. While WhatsApp is off — e.g. before Meta has approved the
    // templates — this keeps message_queue empty. Otherwise every order would
    // leave a failed_retry row behind, and the retry cron would fire a burst
    // of stale notifications about weeks-old orders the moment it's switched on.
    if (!whatsappClient.isEnabled()) {
      logger.info('event_skipped_provider_disabled', { type: event.type, order_id: event.order_id });
      if (eventLogId) {
        await markEventProcessed(eventLogId, 'completed', 'Skipped: WhatsApp provider disabled');
      }
      return;
    }

    if (!isFeatureEnabled(event.type)) {
      logger.info('event_skipped_feature_disabled', { type: event.type, order_id: event.order_id });
      if (eventLogId) await markEventProcessed(eventLogId, 'completed');
      return;
    }

    const handler = getHandler(event.type);
    const message = handler.buildMessage(enrichedEvent as any);

    if (!message) {
      logger.warn('event_skipped_no_message', { type: event.type, order_id: event.order_id });
      if (eventLogId) {
        await markEventProcessed(
          eventLogId,
          'completed',
          'Skipped: handler returned no message (invalid phone or unmapped status)'
        );
      }
      return;
    }

    const queued = await messageQueue.enqueue(message);

    // Best-effort immediate send. If this throws for an unexpected reason
    // (sendQueuedMessage itself shouldn't throw, but be defensive), the
    // message stays 'pending' and the queue-processor cron will pick it up
    // within MESSAGE_QUEUE_PROCESSOR_INTERVAL_MS.
    try {
      await sendQueuedMessage(queued, whatsappClient);
    } catch (sendErr) {
      logger.warn('event_immediate_send_deferred_to_cron', {
        order_id: event.order_id,
        queue_id: queued.id,
        error: (sendErr as Error).message,
      });
    }

    if (eventLogId) await markEventProcessed(eventLogId, 'completed');
  } catch (err) {
    const message_ = (err as Error).message;
    logger.error('event_dispatch_failed', { type: event.type, order_id: event.order_id, error: message_ });
    if (eventLogId) await markEventProcessed(eventLogId, 'failed', message_);
  }
}

export const automationEngine = { emit };
