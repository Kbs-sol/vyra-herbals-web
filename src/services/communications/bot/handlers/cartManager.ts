import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_QTY = 10;

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
}

async function getCartItems(db: any, phone: string) {
  const { data } = await db
    .from('whatsapp_cart_items')
    .select('id, product_id, quantity, price_at_add, products(id, title, price, stock_quantity, quantity, status)')
    .eq('phone', phone);
  return data || [];
}

export async function handleCart(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const items = await getCartItems(db, from);

  if (items.length === 0) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: '🛒 Your cart is empty.\n\nBrowse our products and add something!' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'VIEW_CATALOG', title: '🌿 Browse Products' } },
            { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
          ]
        }
      }
    });
    return;
  }

  await updateSession(from, { state: 'BUILDING_CART', context: session.context });

  // Build cart summary text
  let total = 0;
  let cartText = '🛒 *Your Cart:*\n\n';
  for (const item of items) {
    const product = item.products;
    if (!product) continue;
    const lineTotal = product.price * item.quantity;
    total += lineTotal;
    const stock = product.stock_quantity ?? product.quantity ?? 0;
    const oosWarning = stock < item.quantity ? ' ⚠️ Low stock' : '';
    const priceChange = product.price !== item.price_at_add ? ` (price updated)` : '';
    cartText += `*${product.title}*${priceChange}\n${item.quantity} × \u20b9${product.price} = \u20b9${lineTotal}${oosWarning}\n\n`;
  }
  cartText += `*Total: \u20b9${total}*\n\nTap Checkout to place your order.`;

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: cartText.substring(0, 1024) },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CHECKOUT', title: '✔️ Checkout' } },
          { type: 'reply', reply: { id: 'VIEW_CATALOG', title: '➕ Add More' } },
          { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Menu' } },
        ]
      }
    }
  });
}

export async function handleAddToCart(from: string, session: WhatsAppSession) {
  const productId = session.context?.selected_product_id;
  if (!productId) {
    await sendText(from, 'Please select a product first. Type *Menu* to browse.');
    return;
  }

  const db = getSupabaseAdmin();

  // Verify stock
  const { data: product } = await db
    .from('products')
    .select('id, title, price, stock_quantity, quantity, status')
    .eq('id', productId)
    .eq('status', 1)
    .maybeSingle();

  if (!product) {
    await sendText(from, 'This product is no longer available.');
    return;
  }

  const stock = product.stock_quantity ?? product.quantity ?? 0;
  if (stock < 1) {
    await sendText(from, `Sorry, *${product.title}* is currently out of stock. Type *Menu* to browse other products.`);
    return;
  }

  // Check existing
  const { data: existing } = await db
    .from('whatsapp_cart_items')
    .select('id, quantity')
    .eq('phone', from)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const newQty = Math.min(MAX_QTY, existing.quantity + 1);
    if (newQty > stock) {
      await sendText(from, `You already have the maximum available quantity of *${product.title}* in your cart.`);
      return;
    }
    await db.from('whatsapp_cart_items').update({ quantity: newQty }).eq('id', existing.id);
  } else {
    await db.from('whatsapp_cart_items').insert({
      phone: from,
      product_id: productId,
      quantity: 1,
      price_at_add: product.price,
    });
  }

  // Count total cart items
  const { data: allItems } = await db.from('whatsapp_cart_items').select('id, quantity').eq('phone', from);
  const totalItems = (allItems || []).length;

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: `✅ *${product.title}* added to cart!\n\n🛒 Cart: ${totalItems} item(s)\n\nContinue shopping or checkout when ready.` },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CHECKOUT', title: '✔️ Checkout' } },
          { type: 'reply', reply: { id: 'VIEW_CATALOG', title: '➕ More Products' } },
          { type: 'reply', reply: { id: 'VIEW_CART', title: '🛒 View Cart' } },
        ]
      }
    }
  });
}

export async function handleCartQuantity(from: string, productId: number, action: 'increment' | 'decrement', session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const { data: item } = await db
    .from('whatsapp_cart_items')
    .select('id, quantity, products(price, stock_quantity, quantity)')
    .eq('phone', from)
    .eq('product_id', productId)
    .maybeSingle();

  if (!item) {
    await sendText(from, 'Item not found in cart.');
    return;
  }

  let newQty = item.quantity + (action === 'increment' ? 1 : -1);
  if (newQty <= 0) {
    // Remove item
    await db.from('whatsapp_cart_items').delete().eq('id', item.id);
  } else {
    newQty = Math.min(MAX_QTY, newQty);
    await db.from('whatsapp_cart_items').update({ quantity: newQty }).eq('id', item.id);
  }

  // Refresh cart view
  await handleCart(from, session);
}

export async function handleRemoveFromCart(from: string, productId: number, session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  await db.from('whatsapp_cart_items').delete().eq('phone', from).eq('product_id', productId);
  await handleCart(from, session);
}
