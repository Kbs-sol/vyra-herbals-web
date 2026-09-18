import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
}

function validateAddress(text: string): { valid: boolean; reason?: string } {
  if (text.length < 15) return { valid: false, reason: 'Address seems too short. Please include your street, city, and pincode.' };
  if (!/\d/.test(text)) return { valid: false, reason: 'Please include your house/flat number or pincode.' };
  return { valid: true };
}

/**
 * Step 6 (Image 6): "Where should we send it?"
 */
export async function handlePromptForAddress(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const tenDigit = from.replace(/^91/, '');

  // Look for any past confirmed order with address
  const { data: pastOrder } = await db
    .from('orders')
    .select('shipping_address')
    .or(`shipping_data->>phone.eq.${tenDigit},shipping_data->>phone.eq.${from}`)
    .not('shipping_address', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const savedAddress = pastOrder?.shipping_address?.trim();

  if (savedAddress && savedAddress.length > 15) {
    await updateSession(from, {
      state: 'CONFIRMING_ADDRESS',
      context: { ...session.context, address_draft: savedAddress }
    });

    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: 'Where should we send it?' },
        body: { text: `📍 *Deliver to saved address?*\n\n${savedAddress.substring(0, 900)}` },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'CONFIRM_ADDRESS', title: 'Deliver Here' } },
            { type: 'reply', reply: { id: 'ADD_ADDRESS', title: 'Add New Address' } },
          ]
        }
      }
    });
  } else {
    // Image 6: New address prompt
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Where should we send it?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'ADD_ADDRESS', title: 'Add Address' } },
          ]
        }
      }
    });
  }
}

/**
 * Step 7 (Image 7): User tapped Add Address
 */
export async function handleStartAddAddress(from: string, session: WhatsAppSession) {
  await updateSession(from, { state: 'AWAITING_ADDRESS', context: { ...session.context } });
  await sendText(
    from,
    `📍 *Please send your delivery address:*\n\nReply in this format:\n• Full Name\n• House / Flat No, Street, Area\n• Landmark (optional)\n• City\n• Pincode`
  );
}

/**
 * Step 8 (Image 8): User typed address text
 */
export async function handleAddressInput(from: string, addressText: string, session: WhatsAppSession) {
  const validation = validateAddress(addressText);
  if (!validation.valid) {
    await sendText(from, `❌ ${validation.reason}\n\nExample format:\n12 MG Road, Banjara Hills\nHyderabad, Telangana - 500034`);
    return;
  }

  const cleanAddress = addressText.trim();

  // Store address draft and show confirmation (Image 8)
  await updateSession(from, {
    state: 'CONFIRMING_ADDRESS',
    context: { ...session.context, address_draft: cleanAddress }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: 'Deliver here?' },
      body: { text: cleanAddress.substring(0, 1024) },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CONFIRM_ADDRESS', title: 'Confirm Address' } },
          { type: 'reply', reply: { id: 'EDIT_ADDRESS', title: 'Edit Address' } },
        ]
      }
    }
  });
}

/**
 * Step 9: User tapped Confirm Address -> Present Payment Options
 */
export async function handleConfirmAddress(from: string, session: WhatsAppSession) {
  const address = session.context?.address_draft;
  let draftOrderId = session.context?.draft_order_id;

  const db = getSupabaseAdmin();

  // If no draft order yet, create one from current cart
  if (!draftOrderId) {
    const { data: cartItems } = await db
      .from('whatsapp_cart_items')
      .select('product_id, quantity, price_at_add, products(id, title, price)')
      .eq('phone', from);

    if (!cartItems || cartItems.length === 0) {
      await updateSession(from, { state: 'IDLE', context: {} });
      await sendText(from, 'Your cart is empty. Type *Menu* to start shopping.');
      return;
    }

    const itemsJson = cartItems.map((ci: any) => ({
      id: ci.product_id,
      title: ci.products?.title ?? 'Product',
      quantity: ci.quantity,
      price: ci.products?.price ?? ci.price_at_add,
    }));

    const total = itemsJson.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

    const phoneExtracted = address?.match(/\d{10}/)?.[0] || from.replace(/^91/, '');
    const addressLines = address?.split('\n') || [];
    let fullName = 'WhatsApp User';
    if (addressLines[0] && !/\d/.test(addressLines[0])) {
         fullName = addressLines[0].trim();
    }
    const shippingData = { phone: phoneExtracted, fullName, address };

    const { data: newOrder } = await db
      .from('orders')
      .insert([{
        status: 'pending',
        source: 'whatsapp',
        items: itemsJson,
        total_amount: total,
        payment_method: 'online',
        shipping_address: address,
        shipping_data: shippingData,
      }])
      .select('id, total_amount')
      .single();

    if (newOrder) {
      draftOrderId = newOrder.id;
    }
  } else if (address) {
    const phoneExtracted = address?.match(/\d{10}/)?.[0] || from.replace(/^91/, '');
    const addressLines = address?.split('\n') || [];
    let fullName = 'WhatsApp User';
    if (addressLines[0] && !/\d/.test(addressLines[0])) {
         fullName = addressLines[0].trim();
    }
    const shippingData = { phone: phoneExtracted, fullName, address };

    await db.from('orders').update({ shipping_address: address, shipping_data: shippingData }).eq('id', draftOrderId);
  }

  // Get order total
  const { data: order } = await db
    .from('orders')
    .select('total_amount')
    .eq('id', draftOrderId)
    .maybeSingle();

  const totalAmount = order?.total_amount ?? session.context?.cart_total ?? 0;

  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pay?order_id=${draftOrderId}&source=whatsapp`;

  await updateSession(from, {
    state: 'AWAITING_PAYMENT',
    context: {
      ...session.context,
      draft_order_id: draftOrderId,
      address_confirmed: address,
      payment_link: paymentLink,
    }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: 'Payment Options' },
      body: {
        text: `✅ *Address confirmed!*\n\n*Order Total: \u20b9${totalAmount}*\n\nHow would you like to pay?`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'PAY_ONLINE', title: 'Pay Online' } },
          { type: 'reply', reply: { id: 'COD_ORDER', title: 'Pay on Delivery' } },
          { type: 'reply', reply: { id: 'MAIN_MENU', title: 'Main Menu' } },
        ]
      }
    }
  });
}

/**
 * Send online payment link
 */
export async function handlePayOnline(from: string, session: WhatsAppSession) {
  const draftOrderId = session.context?.draft_order_id;
  const paymentLink = session.context?.payment_link || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pay?order_id=${draftOrderId}&source=whatsapp`;

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: '💳 Pay Online' },
      body: {
        text: `Click the link below to pay securely via UPI, Card, or Net Banking:\n\n👉 ${paymentLink}\n\nAfter paying, tap *I've Paid* to confirm.`
      },
      footer: { text: 'Secured by Easebuzz' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CHECK_PAYMENT_STATUS', title: "I've Paid" } },
          { type: 'reply', reply: { id: 'COD_ORDER', title: 'Pay on Delivery' } },
        ]
      }
    }
  });
}

