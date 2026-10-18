import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { logChatMessage } from '@/services/communications/bot/chatLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const db = getSupabaseAdmin();

  // If a specific phone is requested, return full message history
  if (phone) {
    const rawPhone = phone.trim().replace(/^\+/, '');
    const tenDigit = rawPhone.replace(/^91/, '');
    const withCountry = `91${tenDigit}`;

    const { data: messages, error } = await db
      .from('whatsapp_chat_messages')
      .select('*')
      .or(`phone_number.eq.${withCountry},phone_number.eq.${tenDigit}`)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error && error.code !== '42P01') { // 42P01 = table does not exist
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get session info
    const { data: session } = await db
      .from('whatsapp_sessions')
      .select('*')
      .or(`phone_number.eq.${withCountry},phone_number.eq.${tenDigit}`)
      .maybeSingle();

    // Get customer name / email safely
    let user: any = null;
    try {
      const { data: userData } = await db
        .from('users')
        .select('name, email')
        .or(`phone.eq.${withCountry},phone.eq.${tenDigit}`)
        .maybeSingle();
      user = userData;
    } catch {}

    return NextResponse.json({
      success: true,
      phone: withCountry,
      customer: user || { name: 'Customer' },
      session: session || { state: 'IDLE' },
      messages: messages || []
    });
  }

  // Otherwise, return all conversation threads
  try {
    // 1. Get active sessions
    const { data: sessions, error: sessionsError } = await db
      .from('whatsapp_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (sessionsError && sessionsError.code !== '42P01') {
      console.warn('[ChatsAPI] Error loading sessions:', sessionsError.message);
    }

    // 2. Get latest messages if chat table exists
    const { data: recentMessages, error: messagesError } = await db
      .from('whatsapp_chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (messagesError && messagesError.code !== '42P01') {
      console.warn('[ChatsAPI] Error loading messages:', messagesError.message);
    }

    // Group messages by phone
    const threadMap = new Map<string, any>();

    // Seed threads from sessions
    (sessions || []).forEach(sess => {
      threadMap.set(sess.phone_number, {
        phone_number: sess.phone_number,
        state: sess.state,
        last_updated: sess.updated_at,
        last_message: sess.context?.draft_order_id
          ? `Draft Order #${sess.context.draft_order_id}`
          : 'Session Active',
        messages_count: 0
      });
    });

    // Merge recent messages
    (recentMessages || []).forEach(msg => {
      const p = msg.phone_number;
      if (!threadMap.has(p)) {
        threadMap.set(p, {
          phone_number: p,
          state: 'IDLE',
          last_updated: msg.created_at,
          last_message: msg.body,
          messages_count: 1
        });
      } else {
        const item = threadMap.get(p);
        item.messages_count = (item.messages_count || 0) + 1;
        if (!item.has_latest_msg) {
          item.last_message = msg.body;
          item.has_latest_msg = true;
          item.last_updated = msg.created_at;
        }
      }
    });

    // Look up customer names safely
    const phoneList = Array.from(threadMap.keys());
    if (phoneList.length > 0) {
      try {
        const tenDigits = phoneList.map(p => p.replace(/^91/, ''));
        const allPhones = Array.from(new Set([...phoneList, ...tenDigits]));
        const { data: users } = await db
          .from('users')
          .select('name, phone')
          .in('phone', allPhones);

        const userMap = new Map<string, string>();
        (users || []).forEach(u => {
          if (u.phone) {
            userMap.set(u.phone, u.name);
            userMap.set(`91${u.phone.replace(/^91/, '')}`, u.name);
          }
        });

        threadMap.forEach((val, key) => {
          val.customer_name = userMap.get(key) || userMap.get(key.replace(/^91/, '')) || 'Customer';
        });
      } catch (err: any) {
        console.warn('[ChatsAPI] User name lookup skipped:', err?.message);
      }
    }

    const threads = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );

    return NextResponse.json({ success: true, threads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { phone, message, action } = body;

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const db = getSupabaseAdmin();

    // Action: Switch to human agent
    if (action === 'takeover') {
      await db
        .from('whatsapp_sessions')
        .update({ state: 'HUMAN_HANDOFF' })
        .eq('phone_number', cleanPhone);
      await logChatMessage({
        phone_number: cleanPhone,
        direction: 'outbound',
        sender_name: 'System',
        body: '👨‍💼 Human agent took over the chat. Bot is paused.'
      });
      return NextResponse.json({ success: true, state: 'HUMAN_HANDOFF' });
    }

    // Action: Release back to bot
    if (action === 'release') {
      await db
        .from('whatsapp_sessions')
        .update({ state: 'IDLE' })
        .eq('phone_number', cleanPhone);
      await logChatMessage({
        phone_number: cleanPhone,
        direction: 'outbound',
        sender_name: 'System',
        body: '🤖 Bot control resumed.'
      });
      return NextResponse.json({ success: true, state: 'IDLE' });
    }

    // Action: Send admin free-text message
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'message body is required' }, { status: 400 });
    }

    const result = await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: { body: message.trim() }
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to send WhatsApp message' },
        { status: 500 }
      );
    }

    // Log the outbound admin message
    await logChatMessage({
      phone_number: cleanPhone,
      direction: 'outbound',
      sender_name: 'Admin',
      message_type: 'text',
      body: message.trim()
    });

    return NextResponse.json({ success: true, message_id: result.message_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
