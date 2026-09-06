import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/whatsapp/conversations
 * Returns the inbox list — one row per customer phone with the last message,
 * unread count and last activity time. Backed by the `whatsapp_conversations`
 * SQL view defined in migrations/20260906_whatsapp_inbox.sql.
 *
 * Query params:
 *   ?q=       optional search string (matches phone OR profile name)
 *   ?limit=   default 50, max 200
 *   ?unread=1 filter to threads with unread inbound messages only
 */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const unread = url.searchParams.get('unread') === '1';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 200);

  const db = getSupabaseAdmin();
  let query = db
    .from('whatsapp_conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (unread) query = query.gt('unread_count', 0);
  if (q) query = query.or(`phone.ilike.%${q}%,profile_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Total unread across every thread — powers the sidebar badge in the admin.
  const { count: totalUnread } = await db
    .from('whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('direction', 'inbound')
    .eq('is_read', false);

  return NextResponse.json({ conversations: data ?? [], total_unread: totalUnread ?? 0 });
}
