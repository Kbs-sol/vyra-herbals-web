import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

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
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { product_id, productIds, name, description, image_url, status } = body;

    if ((!product_id && !productIds) || !name || !description || !image_url) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const ingredientStatus = status !== undefined ? status : 1;
    let data;
    let error;

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      // Bulk insert
      const bulkData = productIds.map(pid => ({
        product_id: pid,
        name,
        description,
        image_url,
        status: ingredientStatus
      }));

      const { data: insertedData, error: bulkError } = await supabase
        .from('product_ingredients')
        .insert(bulkData)
        .select();
      
      data = insertedData;
      error = bulkError;
    } else {
      // Single insert
      const { data: singleData, error: singleError } = await supabase
        .from('product_ingredients')
        .insert([
          { 
            product_id, 
            name, 
            description, 
            image_url, 
            status: ingredientStatus 
          }
        ])
        .select()
        .single();
      
      data = singleData;
      error = singleError;
    }

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
  const denied = await requireAdmin(request);
  if (denied) return denied;

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
  const denied = await requireAdmin(request);
  if (denied) return denied;

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
