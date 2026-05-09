import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const txnid = formData.get('txnid');
        let errorMsg = formData.get('error_Message') || formData.get('error') || 'Payment failed or cancelled';

        const origin = new URL(req.url).origin;
        let appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        // Dynamic Redirection Logic:
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            appUrl = origin;
        } else if (!appUrl || appUrl.includes('supabase.co')) {
            if (origin.includes('vercel.app')) {
                appUrl = origin;
            } else {
                appUrl = 'https://vyraherbals.com';
            }
        }

        if (!txnid) {
            return NextResponse.redirect(`${appUrl}/cart?error=payment_failed`, 303);
        }

        const supabase = createServerSupabase();

        // 1. Get the session payload
        const { data: sessions, error: sessionError } = await supabase
            .from('order_sessions')
            .select('payload')
            .eq('txn_id', txnid)
            .single();

        let generatedOrderId = '';
        let paymentMethod = 'online';

        if (!sessionError && sessions) {
            const orderData = sessions.payload;
            paymentMethod = orderData.paymentMethod || 'online';

            // Insert into orders with 'failed' status
            const now = new Date();
            const generatedId = now.getTime();
            generatedOrderId = `ORD-${generatedId}`;

            const orderPayload = {
                id: generatedId,
                order_id: generatedOrderId,
                items: orderData.orderItems,
                total_amount: orderData.totalAmount || formData.get('amount') || 0,
                transaction_price: orderData.transactionPrice || 0,
                shipping_data: orderData.shippingData,
                payment_method: paymentMethod,
                status: 'Failed',
                txn_id: String(txnid),
                user_id: orderData.userId,
                created_at: now.toISOString(),
                order_date: now.toISOString(),
                welcome_coupon_applied: false,
                welcome_coupon_discount: 0
            };

            const { error: insertError } = await supabase
                .from('orders')
                .insert([orderPayload]);

            if (insertError) {
                console.error('Failed order creation error:', insertError);
            }
        }

        // 2. Update transaction status
        await supabase.from('transactions').update({
            status: 'failed',
            txn_id: String(txnid),
            order_id: generatedOrderId || null,
            payment_method: paymentMethod
        }).eq('id', Number(txnid));

        // Redirect to payment failed page
        return NextResponse.redirect(`${appUrl}/payment-failed?order_id=${generatedOrderId || txnid}&reason=${encodeURIComponent(String(errorMsg))}`, 303);

    } catch (err) {
        console.error('Payment failure exception:', err);
        const origin = new URL(req.url).origin;
        let appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
        return NextResponse.redirect(`${appUrl}/cart?error=payment_failed`, 303);
    }
}
