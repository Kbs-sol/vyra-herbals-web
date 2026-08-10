import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

// GET - Fetch all products with pagination and filters
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,handle.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category);
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
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const images = Array.isArray(body.images) ? body.images.filter((img: string) => !!img) : [];

    // Generate handle from title if not provided
    if (!body.handle && body.title) {
      body.handle = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Generate sku from title if not provided
    if (!body.sku && body.title) {
      body.sku = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (!body.image_url && images.length) {
      body.image_url = images[0];
    }

    body.images = images;

    const { data, error } = await supabase
      .from('products')
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Product created successfully'
    });
  } catch (error: any) {
    console.error('Product create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, ...updateData } = body;
    const images = Array.isArray(updateData.images)
      ? updateData.images.filter((img: string) => !!img)
      : [];

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!updateData.handle && updateData.title) {
      updateData.handle = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (!updateData.sku && updateData.title) {
      updateData.sku = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (!updateData.image_url && images.length) {
      updateData.image_url = images[0];
    }

    updateData.images = images;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Product updated successfully'
    });
  } catch (error: any) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error: any) {
    console.error('Product delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
