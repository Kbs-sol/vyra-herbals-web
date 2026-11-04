import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleProductBrowser(from: string, session: WhatsAppSession, categorySlug: string | null) {
  const db = getSupabaseAdmin();

  let query = db
    .from('products')
    .select('id, title, price, description, stock_quantity, quantity, category')
    .eq('status', 1)
    .order('featured_order', { ascending: true })
    .limit(10);

  if (categorySlug) {
    query = query.ilike('category', `%${categorySlug.replace(/_/g, ' ')}%`);
  }

  const { data: products } = await query;

  if (!products || products.length === 0) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'text',
      text: { body: `No products found${categorySlug ? ' in this category' : ''}. Type *Menu* to go back.` }
    });
    return;
  }

  await updateSession(from, { state: 'BROWSING', context: { ...session.context } });

  // WhatsApp list rows: max 10 items, title max 24 chars, description max 72 chars
  const rows = products.map((p: any) => {
    const stock = p.stock_quantity ?? p.quantity ?? 0;
    const stockLabel = stock < 1 ? ' [Out of Stock]' : stock <= 5 ? ` [Only ${stock} left]` : '';
    return {
      id: `PRODUCT_${p.id}`,
      title: p.title.substring(0, 24),
      description: `\u20b9${p.price}${stockLabel}`,
    };
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: categorySlug ? '🌿 Products' : '🌿 All Products' },
      body: { text: 'Tap a product to view details, price, and add to cart.' },
      footer: { text: 'Type Menu to go back' },
      action: {
        button: 'View Products',
        sections: [{ title: 'Products', rows }]
      }
    }
  });
}
