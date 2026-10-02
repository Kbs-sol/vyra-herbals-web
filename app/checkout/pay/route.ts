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

    // 2. Determine payment method and amount to charge
    const method = (url.searchParams.get('method') || order.payment_method || 'online').toLowerCase();
    const isCod = method === 'cod';

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsTotal = items.reduce(
        (sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)),
        0
    ) || (Number(order.total_amount) || 0);

    let chargeAmount = 0;
    let finalTotal = 0;

    if (isCod) {
        chargeAmount = 50; // COD advance
        finalTotal = itemsTotal + 50;
    } else {
        chargeAmount = itemsTotal;
        finalTotal = itemsTotal;
    }

    const now = Date.now();
    const generatedId = now * 1000 + Math.floor(Math.random() * 1000);
    const txnId = String(generatedId);
    const nowIso = new Date().toISOString();

    const shippingData = typeof order.shipping_data === 'string'
        ? JSON.parse(order.shipping_data)
        : (order.shipping_data || {});

    let phone = shippingData.phone || String(order.shipping_address || '').match(/\d{10}/)?.[0] || '9999999999';
    let firstname = (shippingData.fullName || 'WhatsApp Customer')
        .replace(/[^A-Za-z .]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'WhatsApp Customer';
    firstname = firstname.slice(0, 60);

    const productinfo = isCod ? 'Vyra COD Advance' : 'WhatsApp Order';
    const email = 'whatsapp@vyraherbals.com';

    // Insert into transactions
    const { error: txnErr } = await supabase.from('transactions').insert([{
        id: generatedId,
        user_id: null, // Guest whatsapp order
        amount: chargeAmount,
        firstname,
        email,
        phone,
        productinfo,
        status: 'created',
        payment_method: isCod ? 'cod' : 'online',
        created_at: nowIso,
    }]);

    if (txnErr) {
        console.error('Failed to create transaction for WhatsApp payment:', txnErr);
        return NextResponse.redirect(`${appUrl}/cart?error=txn_creation_failed`, 303);
    }

    // Update the order with this txn_id and timestamps
    await supabase.from('orders').update({
        txn_id: txnId,
        payment_method: isCod ? 'cod' : 'online',
        transaction_price: chargeAmount,
        total_amount: finalTotal,
        created_at: order.created_at || nowIso,
        order_date: order.order_date || nowIso,
        delivery_status: 'Pending Sync',
    }).eq('id', orderId);

    // 3. Initiate Easebuzz
    const key = (process.env.EASEBUZZ_KEY || '').trim();
    const salt = (process.env.EASEBUZZ_SALT || '').trim();
    const env = (process.env.EASEBUZZ_ENV || 'test').trim();

    const baseUrl = env === 'prod'
      ? 'https://pay.easebuzz.in/payment/initiateLink'
      : 'https://testpay.easebuzz.in/payment/initiateLink';

    const formattedAmount = chargeAmount.toFixed(2);

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
