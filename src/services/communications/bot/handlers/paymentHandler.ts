import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
}

async function getCartTotal(db: any, phone: string): Promise<number> {
  const { data: items } = await db
    .from('whatsapp_cart_items')
    .select('quantity, products(price)')
    .eq('phone', phone);
  return (items || []).reduce((sum: number, item: any) => {
    return sum + ((item.products?.price ?? 0) * item.quantity);
  }, 0);
}

async function buildOrderFromCart(db: any, phone: string, draftOrderId: number | null): Promise<number | null> {
  // Get cart items
  const { data: cartItems } = await db
    .from('whatsapp_cart_items')
    .select('product_id, quantity, price_at_add, products(id, title, price)')
    .eq('phone', phone);

  if (!cartItems || cartItems.length === 0) return null;

  // Build items JSONB (same format as website orders)
  const itemsJson = cartItems.map((ci: any) => ({
    id: ci.product_id,
    title: ci.products?.title ?? 'Product',
    quantity: ci.quantity,
    price: ci.products?.price ?? ci.price_at_add,
  }));

  const total = itemsJson.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  if (draftOrderId) {
    // Update existing draft
    await db.from('orders').update({ items: itemsJson, total_amount: total }).eq('id', draftOrderId);
    return draftOrderId;
  }

  // Create new draft order
  const { data: order, error } = await db
    .from('orders')
    .insert([{
      status: 'pending',
      source: 'whatsapp',
      items: itemsJson,
      total_amount: total,
      payment_method: 'online',
    }])
    .select('id')
    .single();

  if (error || !order) return null;

  // Insert order_items rows
  await db.from('order_items').insert(
    cartItems.map((ci: any) => ({
      order_id: order.id,
      product_id: ci.product_id,
      quantity: ci.quantity,
      amount: (ci.products?.price ?? ci.price_at_add) * ci.quantity,
    }))
  );

  return order.id;
}

export async function handleCheckout(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const cartItems = await db
    .from('whatsapp_cart_items')
    .select('id')
    .eq('phone', from);

  if (!cartItems.data || cartItems.data.length === 0) {
    await sendText(from, 'Your cart is empty. Type *Menu* to browse products.');
    return;
  }

  // Create/update draft order
  const orderId = await buildOrderFromCart(db, from, session.context?.draft_order_id ?? null);
  if (!orderId) {
    await sendText(from, 'There was an issue creating your order. Please try again or type *Help* to contact us.');
    return;
  }

  const total = await getCartTotal(db, from);

  await updateSession(from, {
    state: 'AWAITING_ADDRESS',
    context: { ...session.context, draft_order_id: orderId, cart_total: total }
  });

  await sendText(from, `📦 *Almost there!*\n\nPlease type your complete delivery address:\n\n_Include: Name, House/Flat No, Street, Area, City, State, Pincode_\n\nExample:\n_Priya Sharma\n45 MG Road, Banjara Hills\nHyderabad, Telangana - 500034_`);
}

export async function handlePaymentCheck(from: string, session: WhatsAppSession) {
  const draftOrderId = session.context?.draft_order_id;
  if (!draftOrderId) {
    await sendText(from, 'No pending order found. Type *Menu* to start a new order.');
    return;
  }

  const db = getSupabaseAdmin();
  const { data: order } = await db
    .from('orders')
    .select('id, status, payment_method, total_amount, transaction_price, txn_id, awb_code, tracking_id')
    .eq('id', draftOrderId)
    .maybeSingle();

  if (!order) {
    await sendText(from, 'Order not found. Type *Menu* to start a new order.');
    return;
  }

  // Check if order has been finalized or transaction is successful
  const isFinalized = ['placed', 'confirmed', 'shipped', 'delivered'].includes(order.status);
  
  let txnSuccess = false;
  if (order.txn_id) {
    const { data: txn } = await db
      .from('transactions')
      .select('status')
      .eq('id', Number(order.txn_id))
      .maybeSingle();
    txnSuccess = txn?.status === 'success';
  }

  if (isFinalized || txnSuccess) {
    await updateSession(from, {
      state: 'ORDER_CONFIRMED',
      context: { ...session.context, confirmed_order_id: draftOrderId }
    });

    // Clear WhatsApp cart
    await db.from('whatsapp_cart_items').delete().eq('phone', from);

    const rawAwb = String(order.awb_code || order.tracking_id || '').trim();
    const awb = (!rawAwb.startsWith('ORD-') && rawAwb !== String(draftOrderId)) ? rawAwb : '';
    const trackingInfo = awb
      ? `\n\n• *AWB / Tracking ID:* \`${awb}\`\n👉 Track on iCarry: https://www.icarry.in/track-shipment?awb=${encodeURIComponent(awb)}`
      : `\n\nWe'll send you tracking details as soon as it ships! Type *Track Order* anytime to check status.`;

    if (order.payment_method === 'cod') {
      const advancePaid = order.transaction_price || 50;
      const balance = Math.max(0, (order.total_amount || 0) - advancePaid);
      await sendText(
        from,
        `✅ *Advance Payment Confirmed!*\n\nYour Cash on Delivery order #${draftOrderId} has been placed. 📦\n\n• Advance Paid: ₹${advancePaid}\n• Balance to pay courier on delivery: *₹${balance}*${trackingInfo}`
      );
    } else {
      await sendText(
        from,
        `✅ *Payment Confirmed! Thank you!*\n\nYour order #${draftOrderId} has been placed. 📦${trackingInfo}`
      );
    }
  } else {
    // Payment not yet verified
    const isCod = order.payment_method === 'cod';
    const amountText = isCod ? '₹50 advance payment' : 'payment';
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `We haven't received your ${amountText} yet. ⏳\n\nIf you just completed payment, please wait 1-2 minutes for the bank to confirm and tap *Check Again*.\n\nNeed help? Tap *Get Help* to chat with us.`
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'CHECK_PAYMENT_STATUS', title: '🔄 Check Again' } },
            { type: 'reply', reply: { id: 'CUSTOMER_SUPPORT', title: '💬 Get Help' } },
          ]
        }
      }
    });
  }
}

export async function handleCodCheckout(from: string, session: WhatsAppSession) {
  const draftOrderId = session.context?.draft_order_id;
  if (!draftOrderId) {
    await sendText(from, 'Session expired. Please type *Cart* to view your cart and proceed again.');
    return;
  }

  const db = getSupabaseAdmin();
  const { data: order } = await db
    .from('orders')
    .select('id, total_amount, items')
    .eq('id', draftOrderId)
    .maybeSingle();

  if (!order) {
    await sendText(from, 'Order not found. Type *Menu* to start again.');
    return;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsTotal = items.reduce(
    (sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)),
    0
  ) || (order.total_amount || 0);

  const codAdvance = 50;
  const finalTotal = itemsTotal + codAdvance;
  const balanceOnDelivery = itemsTotal;

  // Update order with COD method, advance transaction price, and final total
  await db.from('orders').update({
    payment_method: 'cod',
    transaction_price: codAdvance,
    total_amount: finalTotal,
  }).eq('id', draftOrderId);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://vyraherbals.com').replace(/\/+$/, '');
  const codPayLink = `${appUrl}/checkout/pay?order_id=${draftOrderId}&method=cod&source=whatsapp`;

  await updateSession(from, {
    state: 'AWAITING_PAYMENT',
    context: {
      ...session.context,
      cod_selected: true,
      payment_method: 'cod',
      payment_link: codPayLink,
      payment_link_sent_at: new Date().toISOString(),
    }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: '💵 COD Advance Payment' },
      body: {
        text: `*Cash on Delivery Confirmation*\n\nOrder Total: ₹${finalTotal}\nAdvance to Pay Now: *₹${codAdvance}*\nBalance on Delivery: *₹${balanceOnDelivery}*\n\nTo confirm your COD order, please pay the ₹${codAdvance} booking advance online:\n\n👉 ${codPayLink}\n\nOnce paid, your order will be confirmed and booked on iCarry courier automatically!`
      },
      footer: { text: 'Secured by Easebuzz' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CHECK_PAYMENT_STATUS', title: "I've Paid ₹50" } },
          { type: 'reply', reply: { id: 'PAY_ONLINE', title: 'Pay Full Online' } },
        ]
      }
    }
  });
}
