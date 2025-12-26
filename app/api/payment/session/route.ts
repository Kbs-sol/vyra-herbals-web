import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { txnId, orderData } = body || {};
    if (!orderData) return NextResponse.json({ error: 'orderData required' }, { status: 400 });

    const supabase = createServerSupabase();
    // Save order session
    const { data: inserted, error } = await supabase.from('order_sessions').insert([{ txn_id: txnId, payload: orderData }]).select();
    if (error) {
      console.error('Payment session error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', data: inserted?.[0] });
  } catch (err) {
    console.error('Payment session exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
