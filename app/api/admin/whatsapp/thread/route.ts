import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { markThreadRead } from '@/services/communications/logging/inboundLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/whatsapp/thread?phone=<E.164>
 *
 * Returns every message (both directions) exchanged with the given phone,
 * ordered oldest → newest so the client can render a chat view without
 * further sorting. Also marks inbound messages read as a side-effect —
 * opening a thread is the "I've seen this" moment.
 *
 * Query params:
 *   ?phone=       REQUIRED  E.164 without '+' (matches how Meta sends `from`)
 *   ?since=       optional  ISO date; return only messages after this
 *   ?limit=       default 200, max 500
 */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const phone = (url.searchParams.get('phone') || '').replace(/^\+/, '').trim();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const since = url.searchParams.get('since');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 500);

  const db = getSupabaseAdmin();
  let q = db
    .from('whatsapp_messages')
    .select('id, direction, customer_phone, message_id, message_type, status, template_name, parameters, body_text, interactive_reply, is_read, read_at, profile_name, metadata, sent_at, created_at')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (since) q = q.gt('created_at', since);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Side-effect: mark inbound-unread as read. Only when we're returning the
  // full thread (not a since-poll), to avoid marking read on background polls.
  if (!since) {
    // Fire-and-forget — a failure here should not block the response.
    markThreadRead(phone).catch(() => undefined);
  }

  return NextResponse.json({ messages: data ?? [] });
}
