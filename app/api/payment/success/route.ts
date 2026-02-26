import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const status = formData.get('status');
        const txnid = formData.get('txnid');
        // const hash = formData.get('hash'); // Verify hash in production!

        if (status !== 'success') {
            const origin = new URL(req.url).origin;
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
            return NextResponse.redirect(`${appUrl}/cart?error=payment_failed`, 303);
        }

        const supabase = createServerSupabase();

        // Robust Base URL detection
        const origin = new URL(req.url).origin;
        let appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        console.log(`[Payment Success] Origin: ${origin}, Initial AppUrl: ${appUrl}`);

        // Dynamic Redirection Logic:
        // 1. If running locally, ALWAYS trust the origin.
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            appUrl = origin;
            console.log('[Payment Success] Localhost detected. Using origin as AppUrl.');
        }
        // 2. If APP_URL is invalid (Supabase or empty), fallback.
        else if (!appUrl || appUrl.includes('supabase.co')) {
            if (origin.includes('vercel.app')) {
                appUrl = origin;
            } else {
                appUrl = 'https://vyra-herbals.vercel.app';
            }
            console.log(`[Payment Success] AppUrl corrected to: ${appUrl}`);
        } else {
            console.log(`[Payment Success] Using provided NEXT_PUBLIC_APP_URL: ${appUrl}`);
        }

        // 1. Get the session payload
        const { data: sessions, error: sessionError } = await supabase
            .from('order_sessions')
            .select('payload')
            .eq('txn_id', txnid)
            .single();

        if (sessionError || !sessions) {
            console.error('Session lookup failed:', sessionError);
            return NextResponse.redirect(`${appUrl}/cart?error=session_not_found`, 303);
        }

        const orderData = sessions.payload;

        // 2. Insert into orders
        const now = new Date();
        const generatedId = now.getTime(); // Match COD logic
        const generatedOrderId = `ORD-${generatedId}`;

        // NOTE: Ensure user_id and txn_id columns exist in the orders table!
        const orderPayload = {
            id: generatedId,
            order_id: generatedOrderId,
            items: orderData.orderItems,
            total_amount: orderData.totalAmount || formData.get('amount') || 0,
            transaction_price: orderData.transactionPrice || 0,
            shipping_data: orderData.shippingData,
            payment_method: orderData.paymentMethod || 'online',
            status: 'placed',
            txn_id: String(txnid),
            user_id: orderData.userId,
            created_at: now.toISOString(),
            order_date: now.toISOString()
        };

        const { data: inserted, error: insertError } = await supabase
            .from('orders')
            .insert([orderPayload])
            .select()
            .single();

        if (insertError) {
            console.error('Order creation failed:', insertError);
            return NextResponse.redirect(`${appUrl}/cart?error=order_creation_failed&details=${encodeURIComponent(insertError.message)}`, 303);
        }

        // 3. Clear cart? 
        if (orderData.userId) {
            await supabase.from('cart').delete().eq('user_id', orderData.userId);
        }

        // 4. Create Shipment automatically
        let trackingId = '';
        try {
            const { createShipment } = await import('@/utils/shipping');
            const shipmentResult = await createShipment({ ...orderPayload, id: inserted.id });
            if (shipmentResult.success) {
                trackingId = shipmentResult.trackingId || '';
                // Update order with tracking ID and other details
                await supabase.from('orders').update({
                    tracking_id: trackingId,
                    shipment_id: shipmentResult.shipment_id,
                    awb_code: shipmentResult.awb_code,
                    courier_name: shipmentResult.courier_name,
                    label_url: shipmentResult.label_url,
                    delivery_status: 'Booked'
                }).eq('id', inserted.id);
            }
        } catch (shipError) {
            console.error('Shipment creation failed:', shipError);
        }

        // 5. Update transaction status
        // 5. Update transaction status and link to order
        await supabase.from('transactions').update({
            status: 'success',
            txn_id: String(txnid),
            order_id: generatedOrderId, // Link the order ID we just created
            payment_method: orderData.paymentMethod || 'online'
        }).eq('txn_id', String(txnid));

        // 6. Redirect to Order page or Profile
        return NextResponse.redirect(`${appUrl}/profile#orders`, 303);

    } catch (err) {
        console.error('Payment success exception:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
