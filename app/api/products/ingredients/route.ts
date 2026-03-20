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
      .eq('status', 1)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching product ingredients:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}
