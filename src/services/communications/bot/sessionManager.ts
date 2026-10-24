import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type BotState =
  | 'IDLE'
  | 'BROWSING'           // Viewing product list / category
  | 'VIEWING_PRODUCT'    // Viewing single product detail
  | 'BUILDING_CART'      // Cart review interaction
  | 'AWAITING_ADDRESS'   // Customer typing delivery address
  | 'CONFIRMING_ADDRESS' // Bot showed address, waiting for confirm or edit
  | 'AWAITING_PAYMENT'   // Payment link sent
  | 'ORDER_CONFIRMED'    // Payment confirmed
  | 'HUMAN_HANDOFF';     // Bot silent until admin resets

export interface WhatsAppSession {
  phone_number: string;
  state: BotState;
  context: Record<string, any>;
  // context fields used:
  // selected_product_id: number
  // cart_total: number
  // draft_order_id: number
  // txnid: string
  // payment_link: string
  // payment_link_sent_at: string (ISO timestamp)
  // address_draft: string
  // address_confirmed: object
  // cod_selected: boolean
}

export async function getSession(phoneNumber: string): Promise<WhatsAppSession> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (error || !data) {
    // Create new session if none exists
    const newSession: WhatsAppSession = {
      phone_number: phoneNumber,
      state: 'IDLE',
      context: {}
    };
    await db.from('whatsapp_sessions').insert([newSession]);
    return newSession;
  }

  return data as WhatsAppSession;
}

export async function updateSession(phoneNumber: string, updates: Partial<Omit<WhatsAppSession, 'phone_number'>>) {
  const db = getSupabaseAdmin();
  await db
    .from('whatsapp_sessions')
    .update(updates)
    .eq('phone_number', phoneNumber);
}
