import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const order_id = url.searchParams.get('order_id');
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 });

    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('orders').select('*').eq('id', order_id).limit(1);
    if (error) {
      console.error('Order info error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] || null);
  } catch (err) {
    console.error('Order info exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
