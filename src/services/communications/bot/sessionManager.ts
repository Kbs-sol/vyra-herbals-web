import { supabaseAdmin } from '@/utils/supabaseAdmin';

export interface WhatsAppSession {
  phone_number: string;
  state: 'IDLE' | 'AWAITING_ADDRESS' | 'AWAITING_PAYMENT';
  context: Record<string, any>;
}

export async function getSession(phoneNumber: string): Promise<WhatsAppSession> {
  const { data, error } = await supabaseAdmin
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
    await supabaseAdmin.from('whatsapp_sessions').insert([newSession]);
    return newSession;
  }

  return data as WhatsAppSession;
}

export async function updateSession(phoneNumber: string, updates: Partial<Omit<WhatsAppSession, 'phone_number'>>) {
  await supabaseAdmin
    .from('whatsapp_sessions')
    .update(updates)
    .eq('phone_number', phoneNumber);
}
