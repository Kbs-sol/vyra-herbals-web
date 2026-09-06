import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from './logger';

const TABLE = 'whatsapp_messages';

/**
 * Meta's parsed incoming message shape (subset of what
 * `whatsappClient.parseIncomingMessages` returns).
 */
export interface IncomingWhatsAppMessage {
  id: string;
  from: string;
  timestamp?: string | number;
  type: 'text' | 'interactive' | 'button' | 'image' | 'audio' | 'video' | 'document' | 'order' | string;
  profileName?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  button?: { text?: string; payload?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; caption?: string };
  document?: { id?: string; filename?: string };
  order?: unknown;
}

/**
 * Persist an inbound WhatsApp message so the admin inbox can render it.
 *
 * Idempotent by (message_id) so a Meta retry (same webhook payload twice)
 * doesn't create a duplicate row. Errors are swallowed — the caller must
 * still 200 the webhook back to Meta or Meta will disable it.
 */
export async function logInboundMessage(msg: IncomingWhatsAppMessage): Promise<void> {
  const db = getSupabaseAdmin();

  // Idempotency: check if we've already got this message_id.
  if (msg.id) {
    const { data: existing } = await db
      .from(TABLE)
      .select('id')
      .eq('message_id', msg.id)
      .eq('direction', 'inbound')
      .limit(1);
    if (existing && existing.length > 0) return;
  }

  const body_text = extractBody(msg);
  const interactive_reply = extractInteractive(msg);
  const timestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

  const { error } = await db.from(TABLE).insert({
    direction: 'inbound',
    customer_phone: msg.from,
    profile_name: msg.profileName || null,
    message_id: msg.id ?? null,
    message_type: msg.type || 'text',
    status: 'received',
    provider: 'meta_whatsapp',
    body_text,
    interactive_reply,
    is_read: false,
    // Cache the raw payload in metadata for debugging / attachments.
    metadata: msg as unknown as Record<string, unknown>,
    sent_at: timestamp.toISOString(),
    parameters: null,
    template_name: null,
    attempts: 0,
  });

  if (error) {
    logger.error('inbound_logger_insert_failed', {
      error: error.message,
      from: msg.from,
      message_id: msg.id,
    });
  }
}

function extractBody(msg: IncomingWhatsAppMessage): string | null {
  if (msg.type === 'text' && msg.text?.body) return msg.text.body;
  if (msg.type === 'image' && msg.image?.caption) return `[image] ${msg.image.caption}`;
  if (msg.type === 'video' && msg.video?.caption) return `[video] ${msg.video.caption}`;
  if (msg.type === 'image') return '[image]';
  if (msg.type === 'audio') return '[audio]';
  if (msg.type === 'video') return '[video]';
  if (msg.type === 'document') return `[document] ${msg.document?.filename || ''}`;
  if (msg.type === 'order') return '[cart submitted]';
  return null;
}

function extractInteractive(msg: IncomingWhatsAppMessage): string | null {
  if (msg.type !== 'interactive' && msg.type !== 'button') return null;
  const btn = msg.interactive?.button_reply;
  const list = msg.interactive?.list_reply;
  if (btn?.title) return `Button: ${btn.title} (${btn.id || ''})`;
  if (list?.title) return `List: ${list.title} (${list.id || ''})`;
  if (msg.button?.text) return `Quick reply: ${msg.button.text}`;
  return null;
}

/**
 * Log an outbound admin reply so the same thread view shows it.
 * Used by /api/admin/whatsapp/reply.
 */
export async function logAdminOutboundReply(params: {
  to: string;
  message_id: string | null;
  body_text: string;
  admin_email?: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from(TABLE).insert({
    direction: 'outbound',
    customer_phone: params.to,
    message_id: params.message_id,
    message_type: 'text',
    status: params.message_id ? 'sent' : 'failed',
    provider: 'meta_whatsapp',
    body_text: params.body_text,
    is_read: true, // outbound messages are trivially "read" from the admin side
    metadata: { admin_reply: true, sent_by: params.admin_email || 'admin' },
    sent_at: new Date().toISOString(),
    template_name: null,
    parameters: null,
    attempts: 1,
  });
  if (error) logger.error('inbound_logger_outbound_reply_failed', { error: error.message });
}

/**
 * Mark every inbound message from a phone as read. Called when the admin
 * opens a thread.
 */
export async function markThreadRead(phone: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db
    .from(TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('customer_phone', phone)
    .eq('direction', 'inbound')
    .eq('is_read', false);
}
