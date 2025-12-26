import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../src/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, firstname, email, phone, productinfo } = body || {};
    if (!amount) return NextResponse.json({ error: 'amount required' }, { status: 400 });

    // This endpoint should integrate with your payment provider (Easebuzz) to create an order and return the access key.
    // For now, we create a transaction record in Supabase and return a placeholder access key.
    const supabase = createServerSupabase();
    const { data: inserted, error } = await supabase.from('transactions').insert([
      { amount, firstname, email, phone, productinfo, status: 'created' }
    ]).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const txn = inserted?.[0];
    // TODO: replace following placeholder logic with real Easebuzz integration using your keys
    const accessKey = process.env.EASEBUZZ_ACCESS_KEY || 'REPLACE_WITH_EASEBUZZ_ACCESS_KEY';

    return NextResponse.json({ txnid: txn?.id, data: accessKey });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
