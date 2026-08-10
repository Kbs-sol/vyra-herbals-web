import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

// Admin: Manage blogs (GET list, POST create, PUT update, DELETE delete)
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // optional filter: 0 or 1
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    let query: any = supabase
      .from('blogs')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,handle.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    if (status !== '') {
      query = query.eq('status', parseInt(status));
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Admin blogs fetch error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch blogs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const body = await request.json();

    // Generate handle from title if not provided
    if (!body.handle && body.title) {
      body.handle = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Only insert allowed fields to avoid schema mismatch errors
    const allowed = ['title','handle','excerpt','content','author','image_url','images','status','tags','related_posts'];
    const insertPayload: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) insertPayload[k] = body[k];
    }

    insertPayload.images = Array.isArray(insertPayload.images) ? insertPayload.images.filter((i: string) => !!i) : [];
    // ensure related_posts is an array of numbers
    if (Array.isArray(insertPayload.related_posts)) {
      insertPayload.related_posts = insertPayload.related_posts.map((v: any) => (typeof v === 'string' ? parseInt(v, 10) : v)).filter(Boolean);
    }
    if (typeof insertPayload.tags === 'string') {
      insertPayload.tags = insertPayload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    const { data, error } = await supabase
      .from('blogs')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data, message: 'Blog created successfully' });
  } catch (error: any) {
    console.error('Blog create error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create blog' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Blog ID is required' }, { status: 400 });
    }

    if (!updateData.handle && updateData.title) {
      updateData.handle = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Whitelist fields to update to avoid schema mismatch
    const allowed = ['title','handle','excerpt','content','author','image_url','images','status','tags','related_posts'];
    const updatePayload: any = {};
    for (const k of allowed) {
      if (updateData[k] !== undefined) updatePayload[k] = updateData[k];
    }

    updatePayload.images = Array.isArray(updatePayload.images) ? updatePayload.images.filter((i: string) => !!i) : [];
    if (Array.isArray(updatePayload.related_posts)) {
      updatePayload.related_posts = updatePayload.related_posts.map((v: any) => (typeof v === 'string' ? parseInt(v, 10) : v)).filter(Boolean);
    }
    if (typeof updatePayload.tags === 'string') {
      updatePayload.tags = updatePayload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    const { data, error } = await supabase
      .from('blogs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data, message: 'Blog updated successfully' });
  } catch (error: any) {
    console.error('Blog update error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update blog' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Blog ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error: any) {
    console.error('Blog delete error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete blog' }, { status: 500 });
  }
}
