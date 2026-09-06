import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { MessageLogInput } from './types';
import { logger } from './logger';

const TABLE = 'whatsapp_messages';

/**
 * Audit log of every message that reached (or failed at) the provider.
 * Distinct from message_queue: this table is append-mostly and never
 * cleaned up except by the daily retention job.
 */
export async function logMessage(input: MessageLogInput): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from(TABLE).insert({
    order_id: input.order_id,
    customer_phone: input.customer_phone,
    message_type: input.message_type,
    message_id: input.message_id ?? null,
    status: input.status,
    provider: input.provider,
    template_name: input.template_name,
    parameters: input.parameters,
    attempts: input.attempts,
    last_error: input.last_error ?? null,
    last_error_at: input.last_error ? new Date().toISOString() : null,
    metadata: input.metadata ?? null,
    sent_at: input.sent_at ? input.sent_at.toISOString() : null,
  });

  if (error) {
    // Logging must never throw and break the send/queue flow that called it.
    logger.error('message_logger_insert_failed', { error: error.message, order_id: input.order_id });
  }
}

export async function updateDeliveryStatusByMessageId(
  messageId: string,
  status: 'delivered' | 'read' | 'failed',
  timestamp: Date,
  errorMessage?: string
): Promise<boolean> {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = { status };
  if (status === 'delivered') update.delivered_at = timestamp.toISOString();
  if (status === 'read') update.read_at = timestamp.toISOString();
  if (status === 'failed' && errorMessage) {
    update.last_error = errorMessage;
    update.last_error_at = timestamp.toISOString();
  }

  const { data, error } = await db
    .from(TABLE)
    .update(update)
    .eq('message_id', messageId)
    .select('id');

  if (error) {
    logger.error('message_logger_status_update_failed', { error: error.message, messageId });
    return false;
  }

  // No matching row -> likely an orphaned webhook (arrived before our insert,
  // or for a message_id we never logged). Caller decides whether to alert.
  return (data ?? []).length > 0;
}

export async function getMessagesForOrder(orderId: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function deleteOlderThan(days: number): Promise<number> {
  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.from(TABLE).delete().lt('created_at', cutoff).select('id');
  if (error) throw error;
  return (data ?? []).length;
}
