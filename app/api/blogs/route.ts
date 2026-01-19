import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

// Public API: list and fetch published blogs
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const slug = searchParams.get('slug') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    if (slug) {
      const { data, error } = await supabase.from('blogs').select('*').eq('handle', slug).eq('status', 1).single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch blog' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data });
    }

    let query: any = supabase.from('blogs').select('*', { count: 'exact' }).eq('status', 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,handle.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
  } catch (error: any) {
    console.error('Public blogs fetch error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch blogs' }, { status: 500 });
  }
}
