import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public API: list and fetch published blogs
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const slug = searchParams.get('slug') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    if (slug) {
      const { data, error } = await supabase.from('blogs').select('*').eq('handle', slug).eq('status', 1).single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch blog' }, { status: 500 });
      }

      // if related_posts set, fetch those published blogs
      let related: any[] = [];
      try {
        if (data?.related_posts && Array.isArray(data.related_posts) && data.related_posts.length > 0) {
          const { data: relData, error: relErr } = await supabase
            .from('blogs')
            .select('id,title,handle,excerpt,image_url,created_at')
            .in('id', data.related_posts)
            .eq('status', 1)
            .limit(10);
          if (!relErr && relData) related = relData;
        }
      } catch (e) {
        console.warn('Failed to fetch related posts', e);
      }

      return NextResponse.json({ success: true, data: { ...data, related_posts_data: related } });
    }

    let query: any = supabase.from('blogs').select('*', { count: 'exact' }).eq('status', 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,handle.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    if (category) {
      // filtering by tags array: category should be present in tags
      query = query.contains('tags', [category]);
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
