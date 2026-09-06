import { messageQueue } from '../../queue/dbQueue';
import { sendQueuedMessage } from '../../queue/messageSender';
import { whatsappClient } from '../../providers/whatsapp/client';
import { logger } from '../../logging/logger';
import { deleteOlderThan as deleteOldMessages } from '../../logging/messageLogger';
import { deleteOlderThan as deleteOldEvents } from '../../logging/eventLogger';
import type { QueueProcessSummary } from './types';

const DEFAULT_BATCH_SIZE = Number(process.env.MESSAGE_QUEUE_BATCH_SIZE ?? 10);

async function processBatch(rows: Awaited<ReturnType<typeof messageQueue.getDueMessages>>): Promise<QueueProcessSummary> {
  const summary: QueueProcessSummary = { processed: 0, sent: 0, failed_retry: 0, failed_permanent: 0 };

  for (const row of rows) {
    summary.processed += 1;
    const outcome = await sendQueuedMessage(row, whatsappClient);
    summary[outcome] += 1;
  }

  return summary;
}

/**
 * Runs from app/api/cron/process-message-queue — picks up rows still in
 * 'pending' (i.e. the dispatcher's best-effort immediate send never got to
 * them, or the process restarted mid-send).
 */
export async function processPendingQueue(batchSize: number = DEFAULT_BATCH_SIZE): Promise<QueueProcessSummary> {
  const due = await messageQueue.getDueMessages(batchSize);
  logger.info('scheduler_processing_pending_batch', { count: due.length });
  return processBatch(due);
}

/**
 * Runs from app/api/cron/retry-failed-messages — picks up rows in
 * 'failed_retry' whose next_retry_at has elapsed.
 */
export async function processRetryQueue(batchSize: number = DEFAULT_BATCH_SIZE): Promise<QueueProcessSummary> {
  const due = await messageQueue.getDueRetries(batchSize);
  logger.info('scheduler_processing_retry_batch', { count: due.length });
  return processBatch(due);
}

/**
 * Runs from app/api/cron/clean-old-logs — daily retention sweep.
 */
export async function runCleanup(): Promise<{
  whatsapp_messages_deleted: number;
  message_events_deleted: number;
  message_queue_deleted: number;
}> {
  const [messagesDeleted, eventsDeleted, queueDeleted] = await Promise.all([
    deleteOldMessages(90),
    deleteOldEvents(30),
    messageQueue.deleteOldFailedPermanent(30),
  ]);

  logger.info('scheduler_cleanup_completed', {
    whatsapp_messages_deleted: messagesDeleted,
    message_events_deleted: eventsDeleted,
    message_queue_deleted: queueDeleted,
  });

  return {
    whatsapp_messages_deleted: messagesDeleted,
    message_events_deleted: eventsDeleted,
    message_queue_deleted: queueDeleted,
  };
}
