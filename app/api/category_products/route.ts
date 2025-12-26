import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../src/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, extra_condition } = body || {};
    if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 });

    const supabase = createServerSupabase();
    let query = supabase.from('products').select('*').eq('category', category);
    if (typeof extra_condition === 'string') {
      const limitMatch = extra_condition.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) query = query.limit(parseInt(limitMatch[1], 10));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
