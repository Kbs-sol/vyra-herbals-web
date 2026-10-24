import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleProductViewer(from: string, productId: number, session: WhatsAppSession) {
  const db = getSupabaseAdmin();

  const { data: product } = await db
    .from('products')
    .select('id, title, price, regular_price, description, benefits, stock_quantity, quantity, status')
    .eq('id', productId)
    .eq('status', 1)
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

  const stock = product.stock_quantity ?? product.quantity ?? 0;
  const isOos = stock < 1;
  
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

  const stockText = isOos
    ? '\n\n\u274c *Currently Out of Stock*'
    : stock <= 5
      ? `\n\n\u26a0\ufe0f Only ${stock} left in stock!`
      : '';

  const inCartText = inCart ? `\n\n🛒 Already in cart: ${inCart.quantity} unit(s)` : '';

  const bodyText = [
    `*${product.title}*`,
    `\n\u20b9${product.price}${mrpText}`,
    benefitsText,
    stockText,
    inCartText,
  ].join('');

  if (isOos) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'VIEW_CATALOG', title: '← Back to Products' } },
            { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Main Menu' } },
          ]
        }
      }
    });
    return;
  }

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
