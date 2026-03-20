import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_ingredients')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin product ingredients:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, name, description, image_url, status } = body;

    if (!product_id || !name || !description || !image_url) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_ingredients')
      .insert([
        { 
          product_id, 
          name, 
          description, 
          image_url, 
          status: status !== undefined ? status : 1 
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating product ingredient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ingredient' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, image_url, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ingredient ID is required' }, { status: 400 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (image_url) updateData.image_url = image_url;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('product_ingredients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating product ingredient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ingredient ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('product_ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product ingredient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete ingredient' },
      { status: 500 }
    );
  }
}
