import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { EventLogInput } from './types';
import { logger } from './logger';

const TABLE = 'message_events';

/**
 * Records an inbound domain event. Returns null — never throws — on any
 * failure, including the client itself being unconstructable.
 *
 * getSupabaseAdmin() THROWS when SUPABASE_SERVICE_ROLE_KEY is unset, and this
 * function is the first thing emit() calls on the checkout path. An unhandled
 * throw here would surface as a failed order rather than a missed WhatsApp
 * message, so every exit from this function is a value, not an exception.
 * A null return means "not logged"; callers already treat it that way.
 */
export async function logEvent(input: EventLogInput): Promise<number | null> {
  try {
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
      logger.error('event_logger_insert_failed', {
        error: error.message,
        order_id: input.order_id,
      });
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    // Missing env var, missing `message_events` table, network failure — all
    // non-fatal to the order that triggered this.
    logger.error('event_logger_unavailable', {
      error: (err as Error).message,
      order_id: input.order_id,
    });
    return null;
  }
}

export async function markEventProcessed(
  eventLogId: number,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
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
  } catch (err) {
    // Same reasoning as logEvent: this is bookkeeping, and it runs inside
    // emit()'s own error handler. Throwing here would mask the original fault.
    logger.error('event_logger_unavailable', { error: (err as Error).message, eventLogId });
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
