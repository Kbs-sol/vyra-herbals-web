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
    let txnId = String(txn?.id || `TXN${Date.now()}`);

    // Easebuzz txnid has a 40 character limit. If it's a UUID, it's 36.
    // If we have a prefix, ensure it doesn't exceed 40.
    if (txnId.length > 40) txnId = txnId.slice(-40);

    // Easebuzz Integration
    const key = (process.env.EASEBUZZ_KEY || '').trim();
    const salt = (process.env.EASEBUZZ_SALT || '').trim();
    const env = (process.env.EASEBUZZ_ENV || 'test').trim();

    if (!key || !salt || key.includes('REPLACE') || salt.includes('REPLACE')) {
      console.warn('Easebuzz keys are missing or invalid.');
      return NextResponse.json({
        error: 'Payment gateway configuration missing. Please check server logs.'
      }, { status: 500 });
    }

    const baseUrl = env === 'prod'
      ? 'https://pay.easebuzz.in/payment/initiateLink'
      : 'https://testpay.easebuzz.in/payment/initiateLink';

    // Easebuzz expects amount as a float with two decimal places (e.g. 10.00)
    const formattedAmount = Number(amount).toFixed(2);

    // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${key}|${txnId}|${formattedAmount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const paymentData = new URLSearchParams();
    paymentData.append('key', key);
    paymentData.append('txnid', txnId);
    paymentData.append('amount', formattedAmount);
    paymentData.append('productinfo', productinfo);
    paymentData.append('firstname', firstname);
    paymentData.append('email', email);
    paymentData.append('phone', phone);
    paymentData.append('hash', hash);
    // Determine Base URL for callbacks (surl/furl)
    const origin = new URL(req.url).origin;
    let appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();

    // 1. Prefer localhost if request is from localhost (Local Development)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      appUrl = origin;
    }
    // 2. Fallback if App URL is missing or incorrect (Supabase)
    else if (!appUrl || appUrl.includes('supabase.co')) {
      if (origin.includes('vercel.app')) {
        appUrl = origin;
      } else {
        appUrl = 'https://vyra-herbals.vercel.app';
      }
    }
    paymentData.append('surl', `${appUrl}/api/payment/success`);
    paymentData.append('furl', `${appUrl}/api/payment/failure`);

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
      const payBaseUrl = (process.env.EASEBUZZ_ENV || 'test') === 'prod'
        ? 'https://pay.easebuzz.in/pay/'
        : 'https://testpay.easebuzz.in/pay/';
      return NextResponse.json({
        txnid: txnId,
        data: result.data,
        paymentUrl: `${payBaseUrl}${result.data}`
      });
    } else {
      console.error('Easebuzz Error:', result);
      return NextResponse.json({ error: result.data || 'Payment initiation failed' }, { status: 400 });
    }

  } catch (err) {
    console.error('Payment access exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
