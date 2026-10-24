import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
}

function validateAddress(text: string): { valid: boolean; reason?: string } {
  if (text.length < 20) return { valid: false, reason: 'Address seems too short. Please include your full address with pincode.' };
  if (!/\d/.test(text)) return { valid: false, reason: 'Please include your house/flat number in the address.' };
  if (text.split(' ').filter(w => w.length > 2).length < 4) return { valid: false, reason: 'Please provide a complete address with street, city, and pincode.' };
  return { valid: true };
}

export async function handleAddressInput(from: string, addressText: string, session: WhatsAppSession) {
  const validation = validateAddress(addressText);
  if (!validation.valid) {
    await sendText(from, `❌ ${validation.reason}\n\nExample format:\n12 MG Road, Banjara Hills\nHyderabad, Telangana - 500034`);
    return;
  }

  // Store address draft and show confirmation
  await updateSession(from, {
    state: 'CONFIRMING_ADDRESS',
    context: { ...session.context, address_draft: addressText }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: `📍 *Delivery address:*\n\n${addressText}\n\nIs this correct?` },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CONFIRM_ADDRESS', title: '✅ Yes, Confirm' } },
          { type: 'reply', reply: { id: 'EDIT_ADDRESS', title: '\u270f\ufe0f Edit Address' } },
        ]
      }
    }
  });
}

export async function handleConfirmAddress(from: string, session: WhatsAppSession) {
  const address = session.context?.address_draft;
  const draftOrderId = session.context?.draft_order_id;

  if (!address || !draftOrderId) {
    await updateSession(from, { state: 'IDLE', context: {} });
    await sendText(from, 'Session expired. Please type *Menu* to start again.');
    return;
  }

  const db = getSupabaseAdmin();

  // Update order with confirmed address
  await db.from('orders').update({ shipping_address: address }).eq('id', draftOrderId);

  // Get order total for payment
  const { data: order } = await db
    .from('orders')
    .select('total_amount')
    .eq('id', draftOrderId)
    .maybeSingle();

  const totalAmount = order?.total_amount ?? session.context?.cart_total ?? 0;

  // Generate Easebuzz payment link
  const txnid = `WA-ORD-${draftOrderId}`;
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pay?order_id=${draftOrderId}&source=whatsapp`;

  await updateSession(from, {
    state: 'AWAITING_PAYMENT',
    context: {
      ...session.context,
      address_confirmed: address,
      txnid,
      payment_link: paymentLink,
      payment_link_sent_at: new Date().toISOString(),
    }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: '💳 Complete Payment' },
      body: {
        text: `✅ Address confirmed!\n\n*Order Total: \u20b9${totalAmount}*\n\nClick the button below to pay securely:\n\n${paymentLink}\n\nAfter paying, tap *I've Paid* to confirm.`
      },
      footer: { text: 'Secured by Easebuzz' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CHECK_PAYMENT_STATUS', title: '\u2705 I\'ve Paid' } },
          { type: 'reply', reply: { id: 'COD_ORDER', title: '💵 Pay on Delivery' } },
        ]
      }
    }
  });
}
