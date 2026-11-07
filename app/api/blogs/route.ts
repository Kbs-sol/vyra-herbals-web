import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { STATIC_BLOGS } from '@/utils/staticBlogs';

// Force dynamic - API routes touch Supabase / cookies; static analysis at build time would try
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
      // Check static blogs first for fast, reliable delivery of high-intent content
      const staticMatch = STATIC_BLOGS.find((b) => b.handle === slug);
      if (staticMatch) {
        return NextResponse.json({
          success: true,
          data: {
            ...staticMatch,
            related_posts_data: STATIC_BLOGS.filter((b) => b.handle !== slug).slice(0, 3),
          },
        });
      }

      const { data, error } = await supabase.from('blogs').select('*').eq('handle', slug).eq('status', 1).single();
      if (error) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch blog' }, { status: 404 });
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
    if (error) {
      console.warn('Supabase blogs query failed, returning static blogs fallback:', error.message);
      return NextResponse.json({
        success: true,
        data: STATIC_BLOGS,
        pagination: { page: 1, limit, total: STATIC_BLOGS.length, totalPages: 1 },
      });
    }

    // Merge static intent blogs into the list if not already in DB
    const existingHandles = new Set((data || []).map((b: any) => b.handle));
    const mergedData = [...(data || [])];
    for (const sb of STATIC_BLOGS) {
      if (!existingHandles.has(sb.handle)) {
        mergedData.unshift(sb);
      }
    }

    const totalCount = (count || 0) + STATIC_BLOGS.filter((sb) => !existingHandles.has(sb.handle)).length;

    return NextResponse.json({
      success: true,
      data: mergedData,
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    });
  } catch (error: any) {
    console.error('Public blogs fetch error, falling back to static blogs:', error);
    return NextResponse.json({
      success: true,
      data: STATIC_BLOGS,
      pagination: { page: 1, limit: 10, total: STATIC_BLOGS.length, totalPages: 1 },
    });
  }
}
