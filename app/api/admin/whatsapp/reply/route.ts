import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/adminAuth';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { logAdminOutboundReply } from '@/services/communications/logging/inboundLogger';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/whatsapp/reply
 *   body: { phone: string; text: string }
 *
 * Sends a free-text WhatsApp reply from the admin inbox to the customer.
 *
 * IMPORTANT — Meta's 24-hour customer service window rule:
 *   Free-text messages are only allowed within 24 hours of the customer's
 *   most recent inbound message. Outside that window you MUST use a
 *   pre-approved template. This endpoint enforces that by checking the
 *   last inbound timestamp; if none exists in the last 24h it refuses
 *   the send and points the admin at the template send endpoint
 *   (/api/whatsapp/send).
 *
 * On success:
 *   - Meta returns a `messages[0].id` — we log it as a `direction=outbound`
 *     row in `whatsapp_messages` so the inbox thread instantly reflects it.
 *   - The `whatsapp_conversations` view rolls up on the next read.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { phone?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const phone = (body.phone || '').replace(/^\+/, '').replace(/\s+/g, '');
  const text = (body.text || '').trim();
  if (!phone || !/^\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: 'phone must be digits only (E.164 without +)' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: 'text too long (max 4000 chars)' }, { status: 400 });

  // ---- 24-hour customer-service window check --------------------------
  const db = getSupabaseAdmin();
  const { data: lastInbound } = await db
    .from('whatsapp_messages')
    .select('created_at')
    .eq('customer_phone', phone)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1);

  const lastMs = lastInbound?.[0]?.created_at ? Date.parse(lastInbound[0].created_at) : 0;
  const withinWindow = lastMs > 0 && Date.now() - lastMs < 24 * 60 * 60 * 1000;

  if (!withinWindow) {
    return NextResponse.json(
      {
        error: 'outside_24h_window',
        message: 'Meta only permits free-text replies within 24 hours of the customer\'s last inbound message. Use a pre-approved template via POST /api/whatsapp/send instead.',
      },
      { status: 409 },
    );
  }

  // ---- Send via Meta Cloud API ----------------------------------------
  let result;
  try {
    result = await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text, preview_url: true },
    } as any);
  } catch (err) {
    const message = (err as Error).message || 'send failed';
    await logAdminOutboundReply({ to: phone, message_id: null, body_text: text });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!result.success) {
    await logAdminOutboundReply({ to: phone, message_id: null, body_text: text });
    return NextResponse.json({ error: result.error?.message || 'send failed' }, { status: 502 });
  }

  await logAdminOutboundReply({
    to: phone,
    message_id: result.message_id || null,
    body_text: text,
  });

  return NextResponse.json({ success: true, message_id: result.message_id });
}
