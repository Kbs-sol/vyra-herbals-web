import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { formatWhatsAppTitle } from './productBrowser';

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
    const priceChange = product.price !== item.price_at_add ? ` (price updated)` : '';
    cartText += `*${formatWhatsAppTitle(product.title)}*${priceChange}\n${item.quantity} × \u20b9${product.price} = \u20b9${lineTotal}\n\n`;
  }
  cartText += `*Total: \u20b9${total}*\n\nTap Checkout to place your order, or Edit / Clear to manage items.`;

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: cartText.substring(0, 1024) },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CONFIRM_AND_PAY', title: 'Confirm & Pay' } },
          { type: 'reply', reply: { id: 'CHANGE_QTY', title: '🔢 Change Qty' } },
          { type: 'reply', reply: { id: 'SHOP_PRODUCTS', title: '➕ Add More' } },
        ]
      }
    }
  });
}

export async function handleProductSelectedAndShowSummary(from: string, productId: number, session: WhatsAppSession) {
  const db = getSupabaseAdmin();

  // 1. Fetch product (handle status null or 1)
  const { data: product } = await db
    .from('products')
    .select('id, title, price, regular_price, stock_quantity, quantity, status')
    .eq('id', productId)
    .or('status.eq.1,status.is.null')
    .maybeSingle();

  if (!product) {
    await sendText(from, 'This product is no longer available. Type *Menu* to browse other products.');
    return;
  }

  // 2. Add or increment in whatsapp_cart_items
  const { data: existing } = await db
    .from('whatsapp_cart_items')
    .select('id, quantity')
    .eq('phone', from)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const newQty = Math.min(MAX_QTY, existing.quantity + 1);
    await db.from('whatsapp_cart_items').update({ quantity: newQty }).eq('id', existing.id);
  } else {
    await db.from('whatsapp_cart_items').insert({
      phone: from,
      product_id: productId,
      quantity: 1,
      price_at_add: product.price,
    });
  }

  // 3. Fetch all cart items to build order summary
  const items = await getCartItems(db, from);

  let total = 0;
  let itemsSummary = '';
  for (const item of items) {
    const p = item.products;
    if (!p) continue;
    const lineTotal = p.price * item.quantity;
    total += lineTotal;
    itemsSummary += `• ${formatWhatsAppTitle(p.title)} × ${item.quantity} — \u20b9${lineTotal}\n`;
  }

  // If there is an active draft order in progress, keep it synchronized
  if (session.context?.draft_order_id) {
    const draftItemsJson = items.map((ci: any) => ({
      id: ci.product_id,
      title: ci.products?.title ?? 'Product',
      quantity: ci.quantity,
      price: ci.products?.price ?? ci.price_at_add,
    }));
    await db.from('orders').update({
      items: draftItemsJson,
      total_amount: total,
      transaction_price: total,
    }).eq('id', session.context.draft_order_id);
  }

  const summaryText = `📦 *Order summary*\n\n${itemsSummary}\n*Total due: \u20b9${total}*`;

  await updateSession(from, {
    state: 'BUILDING_CART',
    context: { ...session.context, selected_product_id: productId, cart_total: total }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: summaryText.substring(0, 1024) },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CONFIRM_AND_PAY', title: 'Confirm & Pay' } },
          { type: 'reply', reply: { id: 'CHANGE_QTY', title: '🔢 Change Qty' } },
          { type: 'reply', reply: { id: 'SHOP_PRODUCTS', title: '➕ Add More' } },
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

  await handleProductSelectedAndShowSummary(from, productId, session);
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
    await handleRemoveFromCart(from, productId, session);
    return;
  } else {
    newQty = Math.min(MAX_QTY, newQty);
    await db.from('whatsapp_cart_items').update({ quantity: newQty }).eq('id', item.id);
  }

  // Refresh cart view
  await handleCart(from, session);
}

/**
 * Interactive quantity selector list
 */
export async function handleSelectQuantityPrompt(from: string, targetProductId?: number, session?: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const items = await getCartItems(db, from);

  if (items.length === 0) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: '🛒 Your cart is currently empty.\n\nBrowse our products and add something!' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'SHOP_PRODUCTS', title: '🛍️ Shop Products' } },
            { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
          ]
        }
      }
    });
    return;
  }

  // Determine which product to change quantity for
  let selectedItem = targetProductId ? items.find((i: any) => i.product_id === targetProductId) : null;
  
  // If exactly 1 item in cart, select it directly
  if (!selectedItem && items.length === 1) {
    selectedItem = items[0];
  }

  // If multiple items and target unknown, prompt user to pick which item to edit
  if (!selectedItem) {
    const itemRows = items.slice(0, 8).map((item: any) => {
      const p = item.products;
      const shortTitle = p?.title ? formatWhatsAppTitle(p.title) : 'Product';
      const lineTotal = (p?.price ?? 0) * item.quantity;
      return {
        id: `CHOOSE_QTY_${item.product_id}`,
        title: `${shortTitle}`.substring(0, 24),
        description: `Current Qty: ${item.quantity} · Total: \u20b9${lineTotal}`,
      };
    });

    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: '🔢 Select Item' },
        body: { text: 'Which item would you like to change quantity for?' },
        footer: { text: 'Type Menu to return to menu' },
        action: {
          button: 'Select Item',
          sections: [
            {
              title: 'Items in Cart',
              rows: itemRows,
            },
            {
              title: 'Cart Actions',
              rows: [
                {
                  id: 'CLEAR_CART',
                  title: '🗑️ Clear Entire Cart',
                  description: 'Remove all items and start over',
                }
              ]
            }
          ]
        }
      }
    });
    return;
  }

  // Show quantity options for the selected product
  const p = selectedItem.products;
  const pId = selectedItem.product_id;
  const price = p?.price ?? selectedItem.price_at_add ?? 0;
  const shortTitle = p?.title ? formatWhatsAppTitle(p.title) : 'Product';
  const currentQty = selectedItem.quantity;

  const quantities = [1, 2, 3, 4, 5, 6, 8, 10];
  const qtyRows = quantities.map((qty) => {
    const isCurrent = qty === currentQty;
    const title = `${qty} ${qty === 1 ? 'Unit' : 'Units'} ${isCurrent ? '✓' : ''}`.trim();
    return {
      id: `SET_QTY_${pId}_${qty}`,
      title: title.substring(0, 24),
      description: `\u20b9${price * qty} (\u20b9${price} each)${isCurrent ? ' · Selected' : ''}`.substring(0, 72),
    };
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '🔢 Select Quantity' },
      body: {
        text: `Choose quantity for *${shortTitle}*:\n\n_Tip: You can also just type a number (e.g. 2, 3) in chat!_`
      },
      footer: { text: 'Type Menu to return to menu' },
      action: {
        button: 'Choose Quantity',
        sections: [
          {
            title: `Quantity (${shortTitle})`.substring(0, 24),
            rows: qtyRows,
          },
          {
            title: 'Remove',
            rows: [
              {
                id: `REMOVE_${pId}`,
                title: '❌ Remove Item',
                description: `Remove ${shortTitle} from your cart`,
              }
            ]
          }
        ]
      }
    }
  });
}

/**
 * Sets explicit quantity for a product in cart
 */
export async function handleSetQuantity(
  from: string,
  productId: number | undefined,
  quantity: number,
  session: WhatsAppSession
) {
  const db = getSupabaseAdmin();
  const items = await getCartItems(db, from);

  if (items.length === 0) {
    await sendText(from, '🛒 Your cart is currently empty. Type *Menu* to browse products.');
    return;
  }

  // Resolve target product ID
  let targetId = productId;
  if (!targetId) {
    if (items.length === 1) {
      targetId = items[0].product_id;
    } else if (session.context?.selected_product_id) {
      targetId = session.context.selected_product_id;
    }
  }

  if (!targetId) {
    await handleSelectQuantityPrompt(from, undefined, session);
    return;
  }

  if (quantity <= 0) {
    await handleRemoveFromCart(from, targetId, session);
    return;
  }

  const validQty = Math.max(1, Math.min(MAX_QTY, quantity));
  const existingItem = items.find((i: any) => i.product_id === targetId);

  if (existingItem) {
    await db.from('whatsapp_cart_items').update({ quantity: validQty }).eq('id', existingItem.id);
  } else {
    const { data: prod } = await db
      .from('products')
      .select('id, price')
      .eq('id', targetId)
      .maybeSingle();

    await db.from('whatsapp_cart_items').insert({
      phone: from,
      product_id: targetId,
      quantity: validQty,
      price_at_add: prod?.price ?? 0,
    });
  }

  // Refresh cart items to build updated summary
  const updatedItems = await getCartItems(db, from);

  let total = 0;
  let itemsSummary = '';
  for (const item of updatedItems) {
    const p = item.products;
    if (!p) continue;
    const lineTotal = p.price * item.quantity;
    total += lineTotal;
    itemsSummary += `• ${formatWhatsAppTitle(p.title)} × ${item.quantity} — \u20b9${lineTotal}\n`;
  }

  // Sync active draft order if exists
  if (session.context?.draft_order_id) {
    const draftItemsJson = updatedItems.map((ci: any) => ({
      id: ci.product_id,
      title: ci.products?.title ?? 'Product',
      quantity: ci.quantity,
      price: ci.products?.price ?? ci.price_at_add,
    }));
    await db.from('orders').update({
      items: draftItemsJson,
      total_amount: total,
      transaction_price: total,
    }).eq('id', session.context.draft_order_id);
  }

  const summaryText = `✅ *Quantity updated to ${validQty}!*\n\n📦 *Order summary*\n\n${itemsSummary}\n*Total due: \u20b9${total}*`;

  await updateSession(from, {
    state: 'BUILDING_CART',
    context: { ...session.context, selected_product_id: targetId, cart_total: total }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: summaryText.substring(0, 1024) },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CONFIRM_AND_PAY', title: 'Confirm & Pay' } },
          { type: 'reply', reply: { id: 'CHANGE_QTY', title: '🔢 Change Qty' } },
          { type: 'reply', reply: { id: 'SHOP_PRODUCTS', title: '➕ Add More' } },
        ]
      }
    }
  });
}

export async function handleManageCart(from: string, session: WhatsAppSession) {
  // Delegate to interactive quantity and item manager
  await handleSelectQuantityPrompt(from, undefined, session);
}

export async function handleClearCart(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();

  // Delete all items for this phone
  await db.from('whatsapp_cart_items').delete().eq('phone', from);

  // If there's a draft order in progress, reset it
  if (session.context?.draft_order_id) {
    await db.from('orders').update({ items: [], total_amount: 0 }).eq('id', session.context.draft_order_id);
  }

  await updateSession(from, {
    state: 'IDLE',
    context: { ...session.context, cart_total: 0, draft_order_id: null }
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '🗑️ *Your cart has been cleared.*\n\nFeel free to browse our products whenever you are ready! 🌿' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'SHOP_PRODUCTS', title: '🛍️ Shop Products' } },
          { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
        ]
      }
    }
  });
}

export async function handleRemoveFromCart(from: string, productId: number, session: WhatsAppSession) {
  const db = getSupabaseAdmin();

  const { data: item } = await db
    .from('whatsapp_cart_items')
    .select('products(title)')
    .eq('phone', from)
    .eq('product_id', productId)
    .maybeSingle();

  const title = (item as any)?.products?.title ? formatWhatsAppTitle((item as any).products.title) : 'Item';

  await db.from('whatsapp_cart_items').delete().eq('phone', from).eq('product_id', productId);

  const remaining = await getCartItems(db, from);

  if (remaining.length === 0) {
    if (session.context?.draft_order_id) {
      await db.from('orders').update({ items: [], total_amount: 0 }).eq('id', session.context.draft_order_id);
    }

    await updateSession(from, {
      state: 'IDLE',
      context: { ...session.context, cart_total: 0, draft_order_id: null }
    });

    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: `❌ *${title}* removed from your cart.\n\nYour cart is now empty. 🛒` },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'SHOP_PRODUCTS', title: '🛍️ Shop Products' } },
            { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
          ]
        }
      }
    });
    return;
  }

  // Recalculate draft order if exists
  if (session.context?.draft_order_id) {
    const updatedItems = remaining.map((ci: any) => ({
      id: ci.product_id,
      title: ci.products?.title ?? 'Product',
      quantity: ci.quantity,
      price: ci.products?.price ?? ci.price_at_add,
    }));
    const newTotal = updatedItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    await db.from('orders').update({ items: updatedItems, total_amount: newTotal }).eq('id', session.context.draft_order_id);
  }

  await sendText(from, `❌ *${title}* removed from your cart.`);
  await handleCart(from, session);
}
