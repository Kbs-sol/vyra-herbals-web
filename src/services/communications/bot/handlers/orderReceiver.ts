import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function handleOrderReceived(from: string, orderData: any, session: WhatsAppSession) {
  const items = orderData.product_items || [];
  
  if (items.length === 0) {
    await sendText(from, 'Your cart is empty. Please add items to checkout.');
    return;
  }

  // Calculate total (assuming item_price is string like "12.99")
  let totalAmount = 0;
  const dbItems: any[] = [];

  for (const item of items) {
    const price = parseFloat(item.item_price || '0');
    const quantity = parseInt(item.quantity || '1', 10);
    totalAmount += price * quantity;
    dbItems.push({
      product_id: item.product_retailer_id,
      quantity,
      price
    });
  }

  const db = createServerSupabase();

  // Create Draft Order in Database
  const { data: orderRow, error } = await db
    .from('orders')
    .insert([{
      total: totalAmount,
      status: 'pending', // Draft
      phone: from,
      order_source: 'whatsapp',
      shipping_address: {}, // Will fill next step
    }])
    .select('id')
    .single();

  if (error || !orderRow) {
    await sendText(from, 'Sorry, we encountered an issue processing your cart. Please try again later.');
    return;
  }

  // Save order items
  const orderItems = dbItems.map(item => ({
    order_id: orderRow.id,
    product_id: parseInt(item.product_id, 10) || null, // Assuming product_retailer_id matches our DB ID
    quantity: item.quantity,
    price: item.price
  }));

  await db.from('order_items').insert(orderItems);

  // Update session to ask for address
  await updateSession(from, {
    state: 'AWAITING_ADDRESS',
    context: {
      draft_order_id: orderRow.id,
      total_amount: totalAmount,
      items: orderItems
    }
  });

  await sendText(from, `Great! Your order total is Rs. ${totalAmount}.\n\nPlease type your full delivery address (including Name, Street, City, State, and Pincode) to proceed.`);
}

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
}
