import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleProductViewer(from: string, productId: number, session: WhatsAppSession) {
  const db = getSupabaseAdmin();

  const { data: product } = await db
    .from('products')
    .select('id, title, price, regular_price, description, benefits, stock_quantity, quantity, status')
    .eq('id', productId)
    .or('status.eq.1,status.is.null,status.eq.active')
    .maybeSingle();

  if (!product) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'text',
      text: { body: 'This product is no longer available. Type *Menu* to browse other products.' }
    });
    return;
  }

  // Stock is treated as unlimited per store settings
  const stockText = '\n\n✅ *In Stock*';
  
  // Check if already in cart
  const { data: inCart } = await db
    .from('whatsapp_cart_items')
    .select('quantity')
    .eq('phone', from)
    .eq('product_id', productId)
    .maybeSingle();

  // Update session with selected product
  await updateSession(from, { state: 'VIEWING_PRODUCT', context: { ...session.context, selected_product_id: productId } });

  const mrpText = product.regular_price && product.regular_price > product.price
    ? `\n~MRP: \u20b9${product.regular_price}~`
    : '';

  const benefitsText = product.benefits
    ? `\n\n✨ *Key Benefits:*\n${product.benefits.substring(0, 200)}${product.benefits.length > 200 ? '...' : ''}`
    : '';

  const inCartText = inCart ? `\n\n🛒 Already in cart: ${inCart.quantity} unit(s)` : '';

  const bodyText = [
    `*${product.title}*`,
    `\n\u20b9${product.price}${mrpText}`,
    benefitsText,
    stockText,
    inCartText,
  ].join('');

  const buttons: any[] = [
    { type: 'reply', reply: { id: 'ADD_TO_CART', title: inCart ? '➕ Add More' : '🛒 Add to Cart' } },
    { type: 'reply', reply: { id: 'VIEW_CATALOG', title: '← More Products' } },
  ];
  if (inCart) {
    buttons.push({ type: 'reply', reply: { id: 'CHECKOUT', title: '✔️ Checkout' } });
  }

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText.substring(0, 1024) },
      action: { buttons: buttons.slice(0, 3) } // Max 3 buttons
    }
  });
}
