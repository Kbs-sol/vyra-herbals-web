import type { QueuedMessageRow, OutboundMessage } from '@/types/communications';
import type { CommunicationProvider } from '../providers/base';
import { messageQueue } from './dbQueue';
import { decideRetry } from './retry/strategy';
import { logMessage } from '../logging/messageLogger';
import { logger } from '../logging/logger';

export type SendOutcome = 'sent' | 'failed_retry' | 'failed_permanent';

function rowToOutboundMessage(row: QueuedMessageRow): OutboundMessage {
  return {
    order_id: row.order_id ?? 0,
    customer_phone: row.customer_phone,
    message_type: row.message_type,
    provider: row.provider,
    template_name: row.template_name,
    parameters: row.parameters as Record<string, string | number>,
    dedupe_key: row.dedupe_key,
  };
}

/**
 * Attempts to send one queued row through the given provider, then updates
 * both the queue table and the audit log accordingly. Used by:
 *   - eventDispatcher (best-effort immediate send right after enqueueing)
 *   - the queue-processor cron (pending messages)
 *   - the retry-failed-messages cron (failed_retry messages due for another try)
 *
 * Never throws — all outcomes are represented in the return value so cron
 * handlers can tally results without try/catch per message.
 */
export async function sendQueuedMessage(
  row: QueuedMessageRow,
  provider: CommunicationProvider
): Promise<SendOutcome> {
  const outbound = rowToOutboundMessage(row);

  try {
    const result = await provider.send(outbound);

    if (!result.success || !result.message_id) {
      throw new Error(result.error?.message ?? 'Provider returned unsuccessful result');
    }

    await messageQueue.markSent(row.id, result.message_id, result.raw);
    await logMessage({
      order_id: row.order_id,
      customer_phone: row.customer_phone,
      message_type: row.message_type,
      message_id: result.message_id,
      status: 'sent',
      provider: row.provider,
      template_name: row.template_name,
      parameters: row.parameters,
      attempts: row.attempts + 1,
      metadata: result.raw,
      sent_at: new Date(),
    });

    return 'sent';
  } catch (err) {
    const error = err as Error;
    const attemptsSoFar = row.attempts + 1;
    const { shouldRetry, nextRetryAt } = decideRetry(err, attemptsSoFar);

    if (shouldRetry && nextRetryAt) {
      await messageQueue.markFailedRetry(row.id, error.message, nextRetryAt, attemptsSoFar);
      await logMessage({
        order_id: row.order_id,
        customer_phone: row.customer_phone,
        message_type: row.message_type,
        status: 'failed_retry',
        provider: row.provider,
        template_name: row.template_name,
        parameters: row.parameters,
        attempts: attemptsSoFar,
        last_error: error.message,
      });
      logger.warn('message_send_failed_will_retry', {
        queue_id: row.id,
        order_id: row.order_id,
        attempts: attemptsSoFar,
        next_retry_at: nextRetryAt.toISOString(),
        error: error.message,
      });
      return 'failed_retry';
    }

    await messageQueue.markFailedPermanent(row.id, error.message);
    await logMessage({
      order_id: row.order_id,
      customer_phone: row.customer_phone,
      message_type: row.message_type,
      status: 'failed_permanent',
      provider: row.provider,
      template_name: row.template_name,
      parameters: row.parameters,
      attempts: attemptsSoFar,
      last_error: error.message,
    });
    // TODO: wire this into your alerting channel of choice (Slack/email/PagerDuty).
    // Left as a structured log line so it's easy to pipe into an alert rule
    // without guessing the integration the team prefers.
    logger.error('message_send_failed_permanently', {
      queue_id: row.id,
      order_id: row.order_id,
      attempts: attemptsSoFar,
      error: error.message,
    });
    return 'failed_permanent';
  }
}
