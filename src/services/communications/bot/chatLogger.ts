import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '../logging/logger';

export interface ChatMessageRecord {
  phone_number: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  message_type?: string;
  body: string;
  raw_payload?: any;
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
      raw_payload: entry.raw_payload ?? null,
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
