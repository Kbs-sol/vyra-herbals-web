import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const status = formData.get('status');
        const txnid = formData.get('txnid');
        // const hash = formData.get('hash'); // Verify hash in production!

        if (status !== 'success') {
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/cart?error=payment_failed`, 303);
        }

        const supabase = createServerSupabase();

        // 1. Get the session payload
        const { data: sessions, error: sessionError } = await supabase
            .from('order_sessions')
            .select('payload')
            .eq('txn_id', txnid)
            .single();

        if (sessionError || !sessions) {
            console.error('Session lookup failed:', sessionError);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const orderData = sessions.payload;

        // 2. Insert into orders
        const orderPayload = {
            items: orderData.orderItems,
            total_amount: orderData.totalAmount || formData.get('amount'),
            transaction_price: orderData.transactionPrice,
            shipping_data: orderData.shippingData,
            payment_method: 'online',
            status: 'placed',
            txn_id: txnid,
            user_id: orderData.userId, // Extracted from payload
            created_at: new Date().toISOString()
        };

        const { data: inserted, error: insertError } = await supabase
            .from('orders')
            .insert([orderPayload])
            .select()
            .single();

        if (insertError) {
            console.error('Order creation failed:', insertError);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/cart?error=order_creation_failed`, 303);
        }

        // 3. Clear cart? 
        // Ideally we clear the cart for this user.
        if (orderData.userId) {
            await supabase.from('cart').delete().eq('user_id', orderData.userId);
        }

        // 4. Update transaction status (optional, if using transactions table)
        await supabase.from('transactions').update({ status: 'success', txn_id: String(txnid) }).eq('txn_id', String(txnid));

        // 5. Redirect to Order page or Profile
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
        return NextResponse.redirect(`${baseUrl}/profile#orders`, 303);

    } catch (err) {
        console.error('Payment success exception:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
