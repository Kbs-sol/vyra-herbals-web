import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

// GET - Fetch all before/after images with pagination
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('before_after_images')
      .select('*', { count: 'exact' });

    // Apply status filter
    if (status !== null && status !== '') {
      query = query.eq('status', parseInt(status));
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
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
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Before/After images fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch before/after images' },
      { status: 500 }
    );
  }
}

// POST - Create new before/after image
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const body = await request.json();

    const { data, error } = await supabase
      .from('before_after_images')
      .insert([{
        image_url: body.image_url || null,
        status: body.status ?? 1
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Before & After image created successfully'
    });
  } catch (error: any) {
    console.error('Before & After image create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create Before & After image' },
      { status: 500 }
    );
  }
}

// PUT - Update before/after image
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('before_after_images')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Image updated successfully'
    });
  } catch (error: any) {
    console.error('Image update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update image' },
      { status: 500 }
    );
  }
}

// DELETE - Delete before/after image
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('before_after_images')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error: any) {
    console.error('Image delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}
