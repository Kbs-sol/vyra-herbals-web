import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

// GET - Fetch all reviews with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const productId = searchParams.get('productId') || '';
    const rating = searchParams.get('rating') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('reviews')
      .select(`
        *,
        products:product_id (id, title, handle, image_url)
      `, { count: 'exact' });

    // Apply status filter
    if (status !== null && status !== '') {
      query = query.eq('status', parseInt(status));
    }

    // Apply product filter
    if (productId) {
      query = query.eq('product_id', productId);
    }

    // Apply rating filter
    if (rating) {
      query = query.eq('rating', parseInt(rating));
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
    console.error('Reviews fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST - Create new review (admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await request.json();

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        ...body,
        status: body.status ?? 1 // Default to approved for admin-created reviews
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Review created successfully'
    });
  } catch (error: any) {
    console.error('Review create error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create review' },
      { status: 500 }
    );
  }
}

// PUT - Update review (approve/reject/edit)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: 'Review updated successfully'
    });
  } catch (error: any) {
    console.error('Review update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE - Delete review
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error: any) {
    console.error('Review delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}
