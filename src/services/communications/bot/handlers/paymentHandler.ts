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
    .select('id, status, payment_method')
    .eq('id', draftOrderId)
    .maybeSingle();

  // NEVER mark as paid blindly — check actual order status set by Easebuzz webhook
  const paidStatuses = ['placed', 'confirmed', 'shipped', 'delivered'];
  if (order && paidStatuses.includes(order.status)) {
    await updateSession(from, {
      state: 'ORDER_CONFIRMED',
      context: { ...session.context }
    });
    await sendText(from, `✅ *Payment confirmed! Thank you!*\n\nYour order #${draftOrderId} has been placed. We'll send you tracking details once shipped.\n\nType *Track Order* anytime to check your status.`);
    // Clear WhatsApp cart
    await db.from('whatsapp_cart_items').delete().eq('phone', from);
  } else {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: "We haven't received your payment yet. \u23f3\n\nIf you've already paid, please wait 2-3 minutes and tap the button again. Payments usually reflect within a few minutes.\n\nIf you're having trouble, type *Help* to contact our team." },
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

  const { data: updatedOrder } = await db.from('orders').update({
    payment_method: 'cod',
    status: 'placed',
    source: 'whatsapp',
  }).eq('id', draftOrderId).select('*').single();

  // Clear WhatsApp cart
  await db.from('whatsapp_cart_items').delete().eq('phone', from);

  await updateSession(from, {
    state: 'ORDER_CONFIRMED',
    context: { ...session.context, cod_selected: true }
  });

  await sendText(from, `✅ *Cash on Delivery Order Placed!*\n\nOrder #${draftOrderId} confirmed.\n\nPay \u20b9${session.context?.cart_total ?? ''} when your package arrives.\n\nWe'll send you tracking details once shipped. Type *Track Order* anytime.`);

  if (updatedOrder) {
    const { notifyOrderPlaced } = await import('@/services/communications/integration/orderNotifications');
    await notifyOrderPlaced(updatedOrder);
  }
}
