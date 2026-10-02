import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
}

export interface ParsedAddress {
  fullName: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  houseNumber: string;
  area: string;
  landmark: string;
  address: string;
}

export function parseAddress(text: string, defaultPhone: string): ParsedAddress {
  const clean = text.trim();
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Pincode: 6 digits starting with 1-9
  const pincodeMatch = clean.match(/\b([1-9][0-9]{5})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : '';

  // 2. Phone: 10 digits starting with 6-9, or fallback to defaultPhone
  const phoneMatch = clean.match(/\b([6-9]\d{9})\b/);
  let phone = phoneMatch ? phoneMatch[1] : defaultPhone.replace(/^91/, '').replace(/\D/g, '').slice(-10);
  if (!phone || phone.length !== 10) {
    phone = '9999999999';
  }

  // 3. Indian State matching
  const knownStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
    'Puducherry', 'Chandigarh'
  ];
  let state = '';
  for (const st of knownStates) {
    if (new RegExp(`\\b${st}\\b`, 'i').test(clean)) {
      state = st;
      break;
    }
  }

  // 4. Name extraction
  let fullName = 'WhatsApp Customer';
  if (lines.length > 1 && !/\d/.test(lines[0]) && lines[0].length <= 50) {
    fullName = lines[0].replace(/^(name|to|attn)[:\s-]*/i, '').trim();
  }

  // 5. City extraction
  let city = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (pincode && line.includes(pincode)) {
      let candidate = line.replace(pincode, '').replace(/[-,\.]/g, ' ');
      if (state) candidate = candidate.replace(new RegExp(state, 'i'), ' ');
      candidate = candidate.replace(/\b(pin|pincode|code|india)\b/gi, ' ').trim();
      const parts = candidate.split(/\s+/).filter(w => w.length > 2);
      if (parts.length > 0) {
        city = parts[parts.length - 1];
      } else if (i > 0) {
        const prevParts = lines[i - 1].split(/[,-]/).map(p => p.trim()).filter(Boolean);
        city = prevParts[prevParts.length - 1];
      }
    }
  }

  if (!city && lines.length >= 3) {
    const candLine = lines[lines.length - 2];
    const parts = candLine.split(/[,-]/).map(p => p.trim()).filter(Boolean);
    city = parts[0] || '';
  }

  if (!city) {
    const commaParts = clean.split(',').map(p => p.trim());
    if (commaParts.length >= 3) {
      city = commaParts[commaParts.length - 2].replace(/\b\d+\b/g, '').trim();
    }
  }

  city = (city || state || 'City').replace(/\d+/g, '').trim();
  if (city.length < 2) city = 'City';

  // 6. House number and Area
  let houseNumber = '';
  const houseMatch = clean.match(/(?:(?:flat|plot|h\.?no|house|door|shop|no|#)\.?\s*[\w\d\/-]+|\b\d+[\w\/-]*)/i);
  if (houseMatch) {
    houseNumber = houseMatch[0];
  }

  const remainingLines = lines.filter((l, idx) => {
    if (idx === 0 && l === fullName) return false;
    if (pincode && l.includes(pincode)) return false;
    return true;
  });
  const area = remainingLines.join(', ').slice(0, 100);

  return {
    fullName,
    phone,
    pincode,
    city,
    state: state || 'Telangana',
    houseNumber: houseNumber || 'H.No',
    area: area || clean.slice(0, 80),
    landmark: '',
    address: clean,
  };
}

function validateAddress(text: string): { valid: boolean; reason?: string } {
  if (text.length < 20) {
    return {
      valid: false,
      reason: 'Address seems too short. Please include your full name, street, city, and 6-digit pincode.'
    };
  }
  if (!/\d/.test(text)) {
    return {
      valid: false,
      reason: 'Please include your house/flat number and pincode.'
    };
  }
  if (!/\b[1-9][0-9]{5}\b/.test(text)) {
    return {
      valid: false,
      reason: 'Please include a valid 6-digit postal pincode (e.g. 500034).'
    };
  }
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
    .select('shipping_address, shipping_data')
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
    `📍 *Please send your delivery address:*\n\nReply in this format:\n• Full Name\n• House / Flat No, Street, Area\n• Landmark (optional)\n• City, State\n• 6-Digit Pincode`
  );
}

/**
 * Step 8 (Image 8): User typed address text
 */
export async function handleAddressInput(from: string, addressText: string, session: WhatsAppSession) {
  const validation = validateAddress(addressText);
  if (!validation.valid) {
    await sendText(from, `❌ ${validation.reason}\n\nExample format:\nPriya Sharma\nFlat 201, Road No 10, Banjara Hills\nHyderabad, Telangana - 500034`);
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
  const now = new Date();
  const nowIso = now.toISOString();

  const parsedShipping = address ? parseAddress(address, from) : null;

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
    const generatedId = now.getTime();
    const generatedOrderId = `ORD-${generatedId}`;

    const { data: newOrder } = await db
      .from('orders')
      .insert([{
        id: generatedId,
        order_id: generatedOrderId,
        status: 'pending',
        source: 'whatsapp',
        items: itemsJson,
        total_amount: total,
        transaction_price: total,
        payment_method: 'online',
        shipping_address: address,
        shipping_data: parsedShipping,
        created_at: nowIso,
        order_date: nowIso,
        delivery_status: 'Pending Sync',
      }])
      .select('id, total_amount')
      .single();

    if (newOrder) {
      draftOrderId = newOrder.id;
    }
  } else if (address) {
    await db.from('orders').update({
      shipping_address: address,
      shipping_data: parsedShipping,
      created_at: nowIso,
      order_date: nowIso,
    }).eq('id', draftOrderId);
  }

  // Get order total
  const { data: order } = await db
    .from('orders')
    .select('total_amount')
    .eq('id', draftOrderId)
    .maybeSingle();

  const totalAmount = order?.total_amount ?? session.context?.cart_total ?? 0;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://vyraherbals.com').replace(/\/+$/, '');
  const paymentLink = `${appUrl}/checkout/pay?order_id=${draftOrderId}&method=online&source=whatsapp`;

  await updateSession(from, {
    state: 'AWAITING_PAYMENT',
    context: {
      ...session.context,
      draft_order_id: draftOrderId,
      address_confirmed: address,
      shipping_data: parsedShipping,
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
        text: `✅ *Address confirmed!*\n\n*Order Total: \u20b9${totalAmount}*\n\nHow would you like to pay?\n\n• *Pay Online*: Instant UPI, Cards, NetBanking\n• *Pay on Delivery*: \u20b950 advance online, balance on delivery`
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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://vyraherbals.com').replace(/\/+$/, '');
  const paymentLink = `${appUrl}/checkout/pay?order_id=${draftOrderId}&method=online&source=whatsapp`;

  await updateSession(from, {
    state: 'AWAITING_PAYMENT',
    context: {
      ...session.context,
      payment_method: 'online',
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

