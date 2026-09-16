import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function handleMainMenu(from: string, session: WhatsAppSession) {
  const db = getSupabaseAdmin();
  const tenDigit = from.replace(/^91/, '');

  // Look up user name if registered
  const { data: user } = await db
    .from('users')
    .select('name')
    .or(`phone.eq.${tenDigit},phone.eq.${from}`)
    .maybeSingle();

  const customerName = user?.name ? user.name.trim().split(' ')[0] : 'there';

  // 1. Send Welcome Text (Image 1)
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'text',
    text: {
      body: `Hey ${customerName}! Welcome to *Vyra Herbals* 🌿\n\nShop 100% pure ayurvedic & herbal products — all right here in chat.\n\nHave a look around, no sign-up needed.`
    }
  });

  // 2. Send Interactive Menu List (Images 1 & 2)
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Vyra Herbals' },
      body: { text: 'What would you like to do?' },
      action: {
        button: 'Menu',
        sections: [
          {
            title: 'Shop',
            rows: [
              {
                id: 'SHOP_PRODUCTS',
                title: 'Shop Products',
                description: 'Buy products outright',
              },
              {
                id: 'MY_ORDERS',
                title: 'My Orders',
                description: 'Track your orders',
              },
            ],
          },
          {
            title: 'Help',
            rows: [
              {
                id: 'TRACK_ORDER',
                title: 'Track My Order',
                description: 'Live shipment tracking',
              },
              {
                id: 'CUSTOMER_SUPPORT',
                title: 'Support',
                description: 'Get in touch with us',
              },
            ],
          },
        ],
      },
    },
  });
}

export async function handleShopByCategory(from: string, session: WhatsAppSession) {
  await updateSession(from, { state: 'BROWSING', context: { ...session.context } });

  const categories = [
    { id: 'CAT_ALL', title: 'All Products', description: 'View all products in stock' },
    { id: 'CAT_hair-oil', title: 'Hair Oil', description: 'Pure herbal hair oil' },
    { id: 'CAT_shampoo', title: 'Shampoo', description: 'Scalp cleansing & growth' },
    { id: 'CAT_kits', title: 'Kits', description: 'Complete care kits' },
    { id: 'CAT_combo-s', title: 'Combos', description: 'Special value combo packs' },
    { id: 'CAT_scalp-massager', title: 'Scalp Massager', description: 'Scalp stimulation & tools' },
    { id: 'CAT_neem-combs', title: 'Neem Combs', description: 'Handcrafted wooden combs' },
    { id: 'CAT_herbal-hair-mask-powder', title: 'Hair Mask Powder', description: 'Nourishing root mask' },
    { id: 'CAT_rosemary-leaves', title: 'Rosemary Leaves', description: 'Pure dried rosemary' },
  ];

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Shop by category' },
      body: { text: 'Select a category to view products:' },
      action: {
        button: 'Categories',
        sections: [
          {
            title: 'Categories',
            rows: categories,
          },
        ],
      },
    },
  });
}

