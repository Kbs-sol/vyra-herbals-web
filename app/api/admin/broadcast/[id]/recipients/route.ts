import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await verifyAdminAuth(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ recipients: data || [] });
}
