import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { OutboundMessage, QueuedMessageRow } from '@/types/communications';
import type { MessageQueue } from './messageQueue';
import type { EnqueueOptions } from './types';
import { logger } from '../logging/logger';

const TABLE = 'message_queue';
const DEFAULT_MAX_ATTEMPTS = Number(process.env.MESSAGE_QUEUE_MAX_RETRIES ?? 7);

/**
 * Supabase-backed implementation of MessageQueue.
 *
 * Idempotency: enqueue() upserts on `dedupe_key` so emitting the same event
 * twice (e.g. a webhook retried by Meta, or a handler called twice) never
 * produces two queue rows for the same logical message.
 */
export class DbMessageQueue implements MessageQueue {
  private get db() {
    return getSupabaseAdmin();
  }

  async enqueue(message: OutboundMessage, opts?: EnqueueOptions): Promise<QueuedMessageRow> {
    const existing = await this.findByDedupeKey(message.dedupe_key);
    if (existing) {
      logger.info('queue_enqueue_deduped', {
        order_id: message.order_id,
        dedupe_key: message.dedupe_key,
      });
      return existing;
    }

    const scheduledFor = (opts?.scheduledFor ?? message.scheduled_for ?? new Date()).toISOString();

    const { data, error } = await this.db
      .from(TABLE)
      .insert({
        order_id: message.order_id,
        customer_phone: message.customer_phone,
        message_type: message.message_type,
        status: 'pending',
        provider: message.provider,
        template_name: message.template_name,
        parameters: message.parameters,
        attempts: 0,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
        scheduled_for: scheduledFor,
        payload: message,
        dedupe_key: message.dedupe_key,
      })
      .select()
      .single();

    if (error) {
      logger.error('queue_enqueue_failed', { order_id: message.order_id, error: error.message });
      throw error;
    }

    logger.info('queue_enqueue_succeeded', { order_id: message.order_id, queue_id: data.id });
    return data as QueuedMessageRow;
  }

  async getDueMessages(limit: number): Promise<QueuedMessageRow[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as QueuedMessageRow[];
  }

  async getDueRetries(limit: number): Promise<QueuedMessageRow[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select('*')
      .eq('status', 'failed_retry')
      .lte('next_retry_at', new Date().toISOString())
      .order('attempts', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as QueuedMessageRow[];
  }

  async markSent(id: number, messageId: string, raw: unknown): Promise<void> {
    const { error } = await this.db
      .from(TABLE)
      .update({
        status: 'sent',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;

    // Audit row lives in whatsapp_messages — written by messageLogger, called
    // from the queue processor right after this, not duplicated here so
    // dbQueue stays focused on queue-table state only.
    void messageId;
    void raw;
  }

  async markFailedRetry(
    id: number,
    errorMsg: string,
    nextRetryAt: Date,
    attempts: number
  ): Promise<void> {
    const { error } = await this.db
      .from(TABLE)
      .update({
        status: 'failed_retry',
        attempts,
        next_retry_at: nextRetryAt.toISOString(),
        last_error: errorMsg.slice(0, 2000),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async markFailedPermanent(id: number, errorMsg: string): Promise<void> {
    const { error } = await this.db
      .from(TABLE)
      .update({
        status: 'failed_permanent',
        last_error: errorMsg.slice(0, 2000),
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    logger.error('queue_message_failed_permanent', { queue_id: id, error: errorMsg });
  }

  async findByDedupeKey(dedupeKey: string): Promise<QueuedMessageRow | null> {
    const { data, error } = await this.db
      .from(TABLE)
      .select('*')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle();
    if (error) throw error;
    return (data as QueuedMessageRow) ?? null;
  }

  async findByMessageId(): Promise<QueuedMessageRow | null> {
    // message_id is only known after a successful send and is stored in
    // whatsapp_messages, not message_queue — see messageLogger.findByMessageId.
    return null;
  }

  async updateStatusByMessageId(): Promise<void> {
    // No-op here by design: delivered/read status updates apply to the
    // whatsapp_messages audit row, handled in messageLogger, not the queue
    // table (which is cleared out once a message reaches 'sent').
  }

  async deleteOldFailedPermanent(olderThanDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.db
      .from(TABLE)
      .delete()
      .eq('status', 'failed_permanent')
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }
}

export const messageQueue = new DbMessageQueue();
