import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Handles the native `type: "order"` message that Meta sends when a customer
 * checks out from a Meta Catalog (WhatsApp product catalog / shop tab).
 *
 * Meta docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#orders
 *
 * The `orderData` object shape is:
 * {
 *   catalog_id: string,
 *   text: string (customer note),
 *   product_items: [
 *     { product_retailer_id: string, quantity: number, item_price: string, currency: string }
 *   ]
 * }
 *
 * Note: `product_retailer_id` in Meta Catalog is the product's `handle` or SKU.
 * We match it against our `sku` column in the products table.
 */
export async function handleOrderReceived(from: string, orderData: any, session: WhatsAppSession) {
  const items = orderData.product_items || [];

  if (items.length === 0) {
    await sendText(from, 'Your cart is empty. Please add items to checkout.');
    return;
  }

  const db = getSupabaseAdmin();

  // Calculate total and resolve product IDs from SKUs/handles
  let totalAmount = 0;
  const dbItems: any[] = [];

  for (const item of items) {
    const price = parseFloat(item.item_price || '0');
    const quantity = parseInt(item.quantity || '1', 10);
    totalAmount += price * quantity;

    // `product_retailer_id` is the SKU/handle you set in Meta Commerce Manager
    // We try to match it to our products table by sku or handle
    const retailerId = String(item.product_retailer_id || '');
    const { data: product } = await db
      .from('products')
      .select('id, title, price')
      .or(`sku.eq.${retailerId},handle.eq.${retailerId}`)
      .maybeSingle();

    dbItems.push({
      product_id: product?.id ?? null,
      title: product?.title ?? retailerId,
      quantity,
      price: product?.price ?? price, // use our DB price, not catalog price (trust our own DB)
    });

    // Re-calculate total using verified price from our DB to prevent price manipulation
    if (product?.price) {
      totalAmount = dbItems.reduce((s, i) => s + i.price * i.quantity, 0);
    }
  }

  // Build items JSON in same format as web orders
  const itemsJson = dbItems.map(i => ({
    id: i.product_id,
    title: i.title,
    quantity: i.quantity,
    price: i.price,
  }));

  // Create Draft Order in Database — use correct column names matching our schema
  const { data: orderRow, error } = await db
    .from('orders')
    .insert([{
      total_amount: totalAmount,  // FIXED: was 'total'
      status: 'pending',
      source: 'whatsapp',         // FIXED: was 'order_source'
      items: itemsJson,
      payment_method: 'online',
      shipping_address: null,     // FIXED: was {} which broke string parsing downstream
      shipping_data: null,
    }])
    .select('id')
    .single();

  if (error || !orderRow) {
    console.error('[orderReceiver] Failed to create draft order from catalog:', error);
    await sendText(from, 'Sorry, we encountered an issue processing your cart. Please try again or type *Help* to contact us.');
    return;
  }

  // Save order_items rows
  const orderItemsRows = dbItems
    .filter(i => i.product_id !== null)
    .map(i => ({
      order_id: orderRow.id,
      product_id: i.product_id,
      quantity: i.quantity,
      amount: i.price * i.quantity,
    }));

  if (orderItemsRows.length > 0) {
    await db.from('order_items').insert(orderItemsRows);
  }

  // Update session — transition to address collection (same as conversational flow)
  await updateSession(from, {
    state: 'AWAITING_ADDRESS',
    context: {
      draft_order_id: orderRow.id,
      cart_total: totalAmount,
    }
  });

  // Prompt for address
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: '🛒 Order Received!' },
      body: {
        text: `Got your order! Total: *₹${totalAmount.toFixed(2)}*\n\nWhere should we deliver it? Please tap below to add your address.`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'ADD_ADDRESS', title: 'Add Address' } },
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
