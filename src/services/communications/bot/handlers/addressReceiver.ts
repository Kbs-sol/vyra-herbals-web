import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function handleAddressInput(from: string, addressText: string, session: WhatsAppSession) {
  const orderId = session.context?.draft_order_id;
  const totalAmount = session.context?.total_amount;

  if (!orderId) {
    await updateSession(from, { state: 'IDLE', context: {} });
    await sendText(from, 'Session expired. Please start over from the catalog.');
    return;
  }

  const db = createServerSupabase();

  // Update order with the text address
  await db
    .from('orders')
    .update({ 
      shipping_address: { raw: addressText }, // Store raw text for now
    })
    .eq('id', orderId);

  // Generate Payment Link
  // NOTE: Easebuzz requires specific fields. We will pass generic ones if missing.
  const txnid = `ORD-${Date.now()}-${orderId}`;
  
  // In a real scenario, you might want to call your internal API route or construct the Easebuzz form directly.
  // For WhatsApp, we should generate a checkout page link on our own domain that auto-forwards to Easebuzz.
  // E.g., https://vyraherbals.com/checkout/pay?order_id=XXX
  const paymentLink = `https://vyraherbals.com/checkout/pay?order_id=${orderId}`;

  await updateSession(from, {
    state: 'AWAITING_PAYMENT',
    context: { ...session.context, txnid }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `Address saved! \n\nYour total is Rs. ${totalAmount}.\n\nPlease complete your payment securely below:\n\n${paymentLink}`
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'CHECK_PAYMENT_STATUS',
              title: '🔄 I have paid'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'MAIN_MENU',
              title: '🏠 Cancel & Menu'
            }
          }
        ]
      }
    }
  });
}

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
}
