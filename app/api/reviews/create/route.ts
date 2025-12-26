import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tbl_name, data } = body || {};
    if (!tbl_name || !data) return NextResponse.json({ error: 'tbl_name and data required' }, { status: 400 });

    const allowed = ['reviews', 'cart', 'orders', 'users', 'testimonials'];
    if (!allowed.includes(tbl_name)) return NextResponse.json({ error: 'table not allowed' }, { status: 400 });

    const supabase = createServerSupabase();
    const { data: inserted, error } = await supabase.from(tbl_name).insert(Array.isArray(data) ? data : [data]).select();
    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: '1', data: inserted });
  } catch (err) {
    console.error('Insert exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
