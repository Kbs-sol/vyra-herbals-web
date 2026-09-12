import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const isAdmin = await verifyAdminAuth(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const [campaignsRes, sessionsRes, messagesRes] = await Promise.all([
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('whatsapp_sessions').select('*').order('updated_at', { ascending: false }).limit(50),
    supabase.from('marketing_messages').select('*').order('created_at', { ascending: false }).limit(100) // For simple logging if needed
  ]);

  // also fetch campaign recipients for the campaigns? That could be large. We can just return campaigns.
  
  return NextResponse.json({
    campaigns: campaignsRes.data || [],
    sessions: sessionsRes.data || []
  });
}
