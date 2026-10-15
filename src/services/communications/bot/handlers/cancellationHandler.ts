import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleCancellation(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const draftOrderId = session.context?.draft_order_id;

  if (draftOrderId) {
    // Check current order status — only cancel if still pending/draft
    const { data: order } = await db
      .from('orders')
      .select('status')
      .eq('id', draftOrderId)
      .maybeSingle();

    if (order && ['pending'].includes(order.status)) {
      await db.from('orders').update({ status: 'cancelled' }).eq('id', draftOrderId);
    } else if (order && ['placed', 'confirmed', 'shipped'].includes(order.status)) {
      // Order is real — can't cancel via bot
      await whatsappClient.sendRaw({
        messaging_product: 'whatsapp',
        to: from,
        type: 'text',
        text: { body: `⚠️ Your order #${draftOrderId} is already being processed and cannot be cancelled automatically.\n\nType *Help* to speak with our team about a cancellation.` }
      });
      return;
    }
  }

  // Reset session but keep conversation history
  await updateSession(from, { state: 'IDLE', context: {} });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: draftOrderId
        ? `✅ Your draft order has been cancelled.\n\nIs there anything else we can help you with?`
        : `✅ Order cancelled.\n\nIs there anything else we can help you with?`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'VIEW_CATALOG', title: '🌿 Shop Again' } },
          { type: 'reply', reply: { id: 'CUSTOMER_SUPPORT', title: '💬 Contact Us' } },
        ]
      }
    }
  });
}
