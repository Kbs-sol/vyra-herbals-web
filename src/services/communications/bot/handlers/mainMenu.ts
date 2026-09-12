import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleMainMenu(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();

  // Check if returning with cart
  const { data: cartItems } = await db
    .from('whatsapp_cart_items')
    .select('id')
    .eq('phone', from);

  const cartCount = cartItems?.length ?? 0;
  const cartText = cartCount > 0 ? `\n\n🛒 You have ${cartCount} item(s) in your cart. Tap "View Cart" to continue.` : '';

  const { data: categories } = await db
    .from('categories')
    .select('name, slug')
    .eq('status', 1)
    .limit(8);

  const categoryRows = (categories || []).map((cat: any) => ({
    id: `CAT_${cat.slug || cat.name.replace(/\s+/g, '_').toLowerCase()}`,
    title: cat.name.substring(0, 24), // WhatsApp list item title max 24 chars
  }));

  // Build interactive list with categories + fixed options
  const sections: any[] = [];

  if (categoryRows.length > 0) {
    sections.push({
      title: '🌿 Shop by Category',
      rows: categoryRows
    });
  }

  const fixedOptions = [
    { id: 'VIEW_CATALOG', title: '🔍 Browse All Products' },
    ...(cartCount > 0 ? [{ id: 'VIEW_CART', title: `🛒 View My Cart (${cartCount})` }] : []),
    { id: 'TRACK_ORDER', title: '📦 Track My Order' },
    { id: 'CUSTOMER_SUPPORT', title: '💬 Talk to Our Team' },
  ];

  sections.push({
    title: '🔗 Quick Actions',
    rows: fixedOptions
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '🌿 Vyra Herbals' },
      body: { text: `Welcome! What are you looking for today?${cartText}` },
      footer: { text: 'Natural • Ayurvedic • Trusted' },
      action: {
        button: 'Explore ↓',
        sections
      }
    }
  });
}
