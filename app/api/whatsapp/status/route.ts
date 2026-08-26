import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/status?order_id=123
 * Returns delivery status for all WhatsApp messages tied to an order —
 * handy for a "did the customer get notified?" check from support tooling.
 */
export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  const messageId = searchParams.get('message_id');

  if (!orderId && !messageId) {
    return NextResponse.json({ error: 'order_id or message_id query param is required' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let query = db.from('whatsapp_messages').select('*').order('created_at', { ascending: false });
  query = orderId ? query.eq('order_id', Number(orderId)) : query.eq('message_id', messageId!);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}
