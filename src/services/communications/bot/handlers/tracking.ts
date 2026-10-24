import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function handleTracking(from: string, session: WhatsAppSession) {
  // Reset state to avoid getting stuck
  if (session.state !== 'IDLE') {
    await updateSession(from, { state: 'IDLE', context: {} });
  }

  const db = createServerSupabase();

  // Find most recent order for this phone
  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, created_at')
    .eq('phone', from)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !orders || orders.length === 0) {
    await sendText(from, "We couldn't find any recent orders associated with your phone number.\n\nIf you ordered with a different number, please contact Support.");
    return;
  }

  let text = "Here are your recent orders:\n\n";
  for (const o of orders) {
    text += `*Order #ORD-${o.id}*\nStatus: ${formatStatus(o.status)}\nDate: ${new Date(o.created_at).toLocaleDateString()}\n\n`;
  }

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'MAIN_MENU',
              title: '🏠 Main Menu'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'CUSTOMER_SUPPORT',
              title: '💬 Talk to Agent'
            }
          }
        ]
      }
    }
  });
}

function formatStatus(status: string) {
  switch (status) {
    case 'pending': return '🟡 Pending Payment';
    case 'processing': return '⚙️ Processing';
    case 'shipped': return '🚚 Shipped';
    case 'delivered': return '✅ Delivered';
    case 'failed': return '❌ Failed / Cancelled';
    default: return status;
  }
}

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
}
