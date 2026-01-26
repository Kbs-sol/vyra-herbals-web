import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, firstname, email, phone, productinfo } = body || {};

    // Validate required fields
    if (!amount || !firstname || !email || !phone || !productinfo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Create transaction record
    const { data: inserted, error } = await supabase.from('transactions').insert([
      { amount, firstname, email, phone, productinfo, status: 'created' }
    ]).select();

    if (error) {
      console.error('Payment access error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const txn = inserted?.[0];
    const txnId = txn?.id || `TXN_${Date.now()}`; // Fallback if no ID

    // Easebuzz Integration
    const key = process.env.EASEBUZZ_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    const env = process.env.EASEBUZZ_ENV || 'test';

    if (!key || !salt || key.includes('REPLACE') || salt.includes('REPLACE')) {
      // Allow testing if keys are not set, but log warning
      console.warn('Easebuzz keys are missing or invalid.');
      return NextResponse.json({
        error: 'Payment gateway configuration missing. Please check server logs.'
      }, { status: 500 });
    }

    const baseUrl = env === 'prod'
      ? 'https://pay.easebuzz.in/payment/initiateLink'
      : 'https://testpay.easebuzz.in/payment/initiateLink';

    // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${key}|${txnId}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const paymentData = new URLSearchParams();
    paymentData.append('key', key);
    paymentData.append('txnid', String(txnId));
    paymentData.append('amount', String(amount));
    paymentData.append('productinfo', productinfo);
    paymentData.append('firstname', firstname);
    paymentData.append('email', email);
    paymentData.append('phone', phone);
    paymentData.append('hash', hash);
    paymentData.append('surl', `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/api/payment/success`); // Update with actual success URL
    paymentData.append('furl', `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/api/payment/failure`); // Update with actual failure URL

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: paymentData
    });

    const result = await response.json();

    if (result.status === 1) {
      return NextResponse.json({ txnid: txnId, data: result.data });
    } else {
      console.error('Easebuzz Error:', result);
      return NextResponse.json({ error: result.data || 'Payment initiation failed' }, { status: 400 });
    }

  } catch (err) {
    console.error('Payment access exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
