import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { verifyAdminAuth } from '@/utils/adminAuth';

export async function PATCH(req: Request, { params }: { params: Promise<{ phone: string }> }) {
  const isAdmin = await verifyAdminAuth(req);
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phone } = await params;
  const supabase = getSupabaseAdmin();
  await supabase
    .from('whatsapp_sessions')
    .update({ state: 'IDLE', context: {} })
    .eq('phone_number', phone);
    
  if (whatsappClient.isEnabled()) {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { body: "Our team has finished helping you. Type Menu to continue shopping. 🌿" }
    });
  }
  
  return NextResponse.json({ ok: true });
}
