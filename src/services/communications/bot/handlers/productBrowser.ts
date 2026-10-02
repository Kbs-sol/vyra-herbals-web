import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export function formatWhatsAppTitle(rawTitle: string): string {
  let t = rawTitle;
  // 1. Remove brand prefix
  t = t.replace(/^Vyra\s+(Herbal\s+)?/i, '');

  // 2. Specific combo / duo patterns to preserve volumes & packs
  // 'Hair Care Duo - 100ml Oil + 200ml Shampoo' -> 'Oil 100ml + Shmp 200ml' (22 chars)
  t = t.replace(/^Hair Care Duo\s*-\s*(\d+ml)\s*Oil\s*\+\s*(\d+ml)\s*Shampoo/i, 'Oil $1 + Shmp $2');

  // 'Vyra Hair Oil 100ml - Pack of 3' -> 'Hair Oil 100ml (3 Pk)' (21 chars)
  t = t.replace(/(\d+ml)\s*-\s*Pack of (\d+)/i, '$1 ($2 Pk)');

  // 'Neem Wood Combs Combo - Half & Full' -> 'Neem Combs (Half+Full)' (22 chars)
  t = t.replace(/Neem Wood Combs Combo\s*-\s*Half & Full/i, 'Neem Combs (Half+Full)');

  // 'Shampoo & Scalp Massager Combo' -> 'Shampoo + Massager' (18 chars)
  t = t.replace(/Shampoo & Scalp Massager Combo/i, 'Shampoo + Massager');

  // 'Advanced Hair Growth Kit' -> 'Adv Hair Growth Kit' (19 chars)
  t = t.replace(/^Advanced Hair Growth Kit/i, 'Adv Hair Growth Kit');

  // 'Complete Scalp Care Kit' -> 'Complete Scalp Kit' (18 chars)
  t = t.replace(/Complete Scalp Care Kit/i, 'Complete Scalp Kit');

  // Clean extra whitespace
  t = t.replace(/\s+/g, ' ').trim();

  // Meta list title strict limit is 24 characters
  if (t.length > 24) {
    t = t.substring(0, 24).trim();
  }
  return t;
}

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


// WhatsApp list rows: max 10 items, title max 24 chars, description max 72 chars
const rows = products.map((p: any) => {
  const wasPrice = p.regular_price && p.regular_price > p.price ? ` (was \u20b9${p.regular_price})` : '';
  const cleanTitle = p.title.replace(/^Vyra\s+(Herbal\s+)?/i, '');
  return {
    id: `PRODUCT_${p.id}`,
    title: formatWhatsAppTitle(p.title),
    description: `\u20b9${p.price}${wasPrice} · ${cleanTitle}`.substring(0, 72),
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
