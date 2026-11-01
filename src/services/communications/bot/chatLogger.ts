import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '../logging/logger';

export interface ChatMessageRecord {
  phone_number: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  message_type?: string;
  body: string;
  raw_payload?: any;
  message_id?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export async function logChatMessage(entry: ChatMessageRecord): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from('whatsapp_chat_messages').insert({
      phone_number: entry.phone_number,
      direction: entry.direction,
      sender_name: entry.sender_name ?? (entry.direction === 'inbound' ? 'Customer' : 'Vyra Bot'),
      message_type: entry.message_type ?? 'text',
      body: entry.body,
      raw_payload: {
        ...(entry.raw_payload || {}),
        ...(entry.message_id ? { message_id: entry.message_id } : {}),
        ...(entry.status ? { status: entry.status } : {})
      },
      created_at: new Date().toISOString()
    });

    if (error) {
      // Table might not be migrated yet; fail gracefully without crashing the bot flow
      logger.warn('whatsapp_chat_message_log_skipped', { error: error.message, phone: entry.phone_number });
    }
  } catch (err: any) {
    logger.warn('whatsapp_chat_message_log_exception', { error: err.message });
  }
}

/**
 * Updates the delivery/read status of an outbound message in whatsapp_chat_messages.
 * Matches on raw_payload->>'message_id'.
 */
export async function updateChatMessageStatus(messageId: string, status: 'delivered' | 'read' | 'failed'): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    // Fetch recent outbound messages matching this message_id in raw_payload
    const { data } = await db
      .from('whatsapp_chat_messages')
      .select('id, raw_payload')
      .eq('direction', 'outbound')
      .filter('raw_payload->>message_id', 'eq', messageId)
      .limit(1)
      .maybeSingle();

    if (data) {
      const updatedPayload = { ...(data.raw_payload || {}), status };
      await db
        .from('whatsapp_chat_messages')
        .update({ raw_payload: updatedPayload })
        .eq('id', data.id);
    }
  } catch (err: any) {
    logger.warn('update_chat_message_status_error', { messageId, error: err.message });
  }
}
