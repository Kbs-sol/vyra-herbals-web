import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/admin/logs?order_id=&status=&limit=
 * Paginated-ish read of the whatsapp_messages audit table for the admin
 * dashboard's message log view.
 */
export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  const status = searchParams.get('status');
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);

  const db = getSupabaseAdmin();
  let query = db.from('whatsapp_messages').select('*').order('created_at', { ascending: false }).limit(limit);

  if (orderId) query = query.eq('order_id', Number(orderId));
  if (status) query = query.like('status', `${status}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data });
}
