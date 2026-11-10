import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PLATFORMS = ['whatsapp', 'instagram'];

const clean = (body: any) => {
  const out: Record<string, any> = {};
  if ('image_url' in body) out.image_url = body.image_url || null;
  if ('platform' in body) out.platform = PLATFORMS.includes(body.platform) ? body.platform : 'whatsapp';
  if ('caption' in body) out.caption = body.caption ? String(body.caption).slice(0, 300) : null;
  if ('customer_label' in body) out.customer_label = body.customer_label ? String(body.customer_label).slice(0, 80) : null;
  if ('sort_order' in body) out.sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;
  if ('status' in body) out.status = Number(body.status) === 1 ? 1 : 0;
  return out;
};

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const supabase = createServerSupabase();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('chat_reviews')
      .select('*', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: any) {
    console.error('Chat reviews fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat reviews. Has the chat_reviews migration been run?' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const row = clean(body);
    if (!row.image_url) {
      return NextResponse.json({ success: false, error: 'image_url is required' }, { status: 400 });
    }
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('chat_reviews')
      .insert([{ platform: 'whatsapp', status: 1, sort_order: 0, ...row }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Chat review create error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('chat_reviews')
      .update({ ...clean(body), updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Chat review update error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const supabase = createServerSupabase();
    const { error } = await supabase.from('chat_reviews').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Chat review delete error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
