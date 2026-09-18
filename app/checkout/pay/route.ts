import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import crypto from 'crypto';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id');
    const source = url.searchParams.get('source');

    let appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
    if (url.origin.includes('localhost') || url.origin.includes('127.0.0.1')) {
        appUrl = url.origin;
    } else if (!appUrl || appUrl.includes('supabase.co')) {
        appUrl = 'https://vyraherbals.com';
    }

    if (!orderId) {
        return NextResponse.redirect(`${appUrl}/cart?error=missing_order_id`, 303);
    }

    const supabase = createServerSupabase();

    // 1. Fetch the pending draft order
    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('source', 'whatsapp') // restrict to whatsapp draft orders
        .single();

    if (!order) {
        return NextResponse.redirect(`${appUrl}/cart?error=order_not_found`, 303);
    }

    if (order.status !== 'pending') {
        // Order already paid/finalized
        return NextResponse.redirect(`${appUrl}/order-placed/${order.id}`, 303);
    }

    // 2. We need a transaction ID.
    // We already generated it? If txn_id exists, use it. Otherwise create a new one.
    let txnId = order.txn_id;
    if (!txnId) {
        const now = Date.now();
        const generatedId = now * 1000 + Math.floor(Math.random() * 1000);
        txnId = String(generatedId);

        // Sanitize fields for Easebuzz
        let phone = String(order.shipping_address || '').match(/\d{10}/)?.[0] || '9999999999';
        // Extract a name if possible, else default
        let firstname = 'WhatsApp User';
        const addressLines = String(order.shipping_address || '').split('\n');
        if (addressLines[0] && !/\d/.test(addressLines[0])) {
             firstname = addressLines[0].trim().slice(0, 60);
        }

        const amount = order.total_amount;

        // Insert into transactions
        const { error: txnErr } = await supabase.from('transactions').insert([{
            id: generatedId,
            user_id: null, // Guest whatsapp order
            amount,
            firstname,
            email: 'whatsapp@vyraherbals.com',
            phone,
            productinfo: 'WhatsApp Order',
            status: 'created',
            payment_method: 'online',
            created_at: new Date().toISOString()
        }]);

        if (txnErr) {
            console.error('Failed to create transaction for WhatsApp payment:', txnErr);
            return NextResponse.redirect(`${appUrl}/cart?error=txn_creation_failed`, 303);
        }

        // Update the order with this txn_id
        await supabase.from('orders').update({ txn_id: txnId }).eq('id', orderId);
    }

    // 3. Initiate Easebuzz
    const key = (process.env.EASEBUZZ_KEY || '').trim();
    const salt = (process.env.EASEBUZZ_SALT || '').trim();
    const env = (process.env.EASEBUZZ_ENV || 'test').trim();

    const baseUrl = env === 'prod'
      ? 'https://pay.easebuzz.in/payment/initiateLink'
      : 'https://testpay.easebuzz.in/payment/initiateLink';

    const formattedAmount = Number(order.total_amount).toFixed(2);
    const productinfo = 'WhatsApp Order';
    const email = 'whatsapp@vyraherbals.com';
    let phone = String(order.shipping_address || '').match(/\d{10}/)?.[0] || '9999999999';
    let firstname = 'WhatsApp User';
    const addressLines = String(order.shipping_address || '').split('\n');
    if (addressLines[0] && !/\d/.test(addressLines[0])) {
         firstname = addressLines[0].trim().slice(0, 60) || 'WhatsApp User';
    }
    
    // Clean string just in case
    firstname = firstname.replace(/[^A-Za-z .]/g, '').replace(/\s+/g, ' ').trim() || 'WhatsApp User';

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
    paymentData.append('surl', `${appUrl}/api/payment/success`);
    paymentData.append('furl', `${appUrl}/api/payment/failure`);

    try {
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
            const payBaseUrl = env === 'prod'
                ? 'https://pay.easebuzz.in/pay/'
                : 'https://testpay.easebuzz.in/pay/';
            return NextResponse.redirect(`${payBaseUrl}${result.data}`, 303);
        } else {
            console.error('Easebuzz Error for WhatsApp:', result);
            return NextResponse.redirect(`${appUrl}/cart?error=gateway_error`, 303);
        }
    } catch (err) {
        console.error('WhatsApp payment initiation failed:', err);
        return NextResponse.redirect(`${appUrl}/cart?error=payment_error`, 303);
    }
}
