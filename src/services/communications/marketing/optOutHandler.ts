import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';

export async function handleMarketingOptOut(phone: string, action: 'subscribe' | 'unsubscribe') {
  const normalized = tryNormalizePhone(phone);
  if (!normalized) return { ok: false, error: 'Invalid phone' };

  const supabase = getSupabaseAdmin();
  const isOptOut = action === 'unsubscribe';

  // 1. Update users
  await supabase
    .from('users')
    .update({ 
      marketing_opt_out: isOptOut, 
      marketing_opt_in: !isOptOut 
    })
    .eq('phone', normalized);

  // 2. Update historical_leads
  await supabase
    .from('historical_leads')
    .update({ 
      marketing_opt_out: isOptOut 
    })
    .eq('mobile_number', normalized);

  // 3. Send WhatsApp reply
  const message = isOptOut
    ? "You've been unsubscribed from marketing messages. You'll still receive order updates. Reply START to resubscribe."
    : "You're back! You'll now receive exclusive offers from Vyra Herbals. 🌿";

  if (whatsappClient.isEnabled()) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalized,
      type: 'text',
      text: { body: message }
    });
  }

  return { ok: true, unsubscribed: isOptOut };
}
