import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { EventLogInput } from './types';
import { logger } from './logger';

const TABLE = 'message_events';

export async function logEvent(input: EventLogInput): Promise<number | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      order_id: input.order_id,
      event_type: input.event_type,
      event_source: input.event_source,
      payload: input.payload,
      status: input.status,
      error: input.error ?? null,
      processed_at: ['completed', 'failed'].includes(input.status)
        ? new Date().toISOString()
        : null,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('event_logger_insert_failed', { error: error.message, order_id: input.order_id });
    return null;
  }
  return data?.id ?? null;
}

export async function markEventProcessed(
  eventLogId: number,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from(TABLE)
    .update({
      status,
      error: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', eventLogId);

  if (error) {
    logger.error('event_logger_update_failed', { error: error.message, eventLogId });
  }
}

export async function getEventHistoryForOrder(orderId: number) {
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
