import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleProductBrowser(from: string, session: WhatsAppSession, categorySlug: string | null) {
  const db = getSupabaseAdmin();

  let query = db
    .from('products')
    .select('id, title, price, regular_price, description, stock_quantity, quantity, category')
    .or('status.eq.1,status.is.null')
    .order('featured_order', { ascending: true })
    .limit(10);

  if (categorySlug && categorySlug !== 'ALL') {
    query = query.ilike('category', `%${categorySlug.replace(/_/g, '-').toLowerCase()}%`);
  }

  const { data: products } = await query;

  if (!products || products.length === 0) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'text',
      text: { body: `No products found${categorySlug && categorySlug !== 'ALL' ? ' in this category' : ''}. Type *Menu* to go back.` }
    });
    return;
  }

  await updateSession(from, { state: 'BROWSING', context: { ...session.context } });

  // WhatsApp list rows: max 10 items, title max 24 chars, description max 72 chars (Image 4)
  const rows = products.map((p: any) => {
    const wasPrice = p.regular_price && p.regular_price > p.price ? ` (was \u20b9${p.regular_price})` : '';
    const catLabel = p.category ? ` · ${p.category.replace(/-/g, ' ')}` : '';
    return {
      id: `PRODUCT_${p.id}`,
      title: p.title.substring(0, 24),
      description: `\u20b9${p.price}${wasPrice}${catLabel}`.substring(0, 72),
    };
  });

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Select products to buy' },
      body: { text: 'Available products:' },
      footer: { text: 'Type Menu to go back' },
      action: {
        button: 'Select Product',
        sections: [{ title: 'Products', rows }]
      }
    }
  });
}
