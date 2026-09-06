import type { OutboundMessage, QueuedMessageRow, MessageStatus } from '@/types/communications';

export interface EnqueueOptions {
  scheduledFor?: Date;
}

export interface DueMessagesFilter {
  limit: number;
}

/** Result returned to /api/whatsapp/admin/queue and the cron processors. */
export interface QueueProcessSummary {
  processed: number;
  sent: number;
  failed_retry: number;
  failed_permanent: number;
}
