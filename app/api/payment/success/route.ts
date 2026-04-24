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
            let errorMsg = formData.get('error_Message') || formData.get('error') || 'Payment failed or cancelled';
            return NextResponse.redirect(`${appUrl}/payment-failed?order_id=${txnid || ''}&reason=${encodeURIComponent(String(errorMsg))}`, 303);
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

        if (!txnid) {
            return NextResponse.redirect(`${appUrl}/cart?error=missing_transaction`, 303);
        }

        const txnIdStr = String(txnid);

        // Idempotency: if callback is retried by the gateway, reuse the existing order.
        const { data: existingOrders, error: existingOrderError } = await supabase
            .from('orders')
            .select('*')
            .eq('txn_id', txnIdStr)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingOrderError) {
            console.error('[Payment Success] Existing order lookup failed:', existingOrderError);
        }

        let inserted: any = existingOrders?.[0] || null;
        let orderData: any = null;

        if (!inserted) {
            // 1. Get the latest session payload for this transaction.
            const { data: sessions, error: sessionError } = await supabase
                .from('order_sessions')
                .select('payload, created_at')
                .eq('txn_id', txnIdStr)
                .order('created_at', { ascending: false })
                .limit(1);

            if (sessionError || !sessions?.length) {
                console.error('Session lookup failed:', sessionError);
                return NextResponse.redirect(`${appUrl}/cart?error=session_not_found`, 303);
            }

            orderData = sessions[0].payload;

            // --- Welcome Coupon Server-Side Validation ---
            let welcomeCouponApplied = false;
            let welcomeCouponDiscount = 0;

            if (orderData.welcomeCouponApplied && orderData.userId) {
                const { data: settingsRow } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'welcome_coupon')
                    .maybeSingle();

                const couponConfig = settingsRow?.value;

                const { count: orderCount } = await supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', orderData.userId);

                if (couponConfig?.enabled && (orderCount || 0) === 0) {
                    const discountPercent = couponConfig.discount_percent || 10;
                    const itemsTotal = (orderData.orderItems || []).reduce(
                        (sum: number, item: any) => sum + (item.price * item.quantity), 0
                    );
                    welcomeCouponDiscount = Math.round(itemsTotal * discountPercent / 100);
                    welcomeCouponApplied = true;
                    console.log(`[Payment Success] Welcome coupon applied: ${discountPercent}% = ₹${welcomeCouponDiscount} off`);
                } else {
                    console.log('[Payment Success] Welcome coupon validation failed');
                }
            }

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
                txn_id: txnIdStr,
                user_id: orderData.userId,
                created_at: now.toISOString(),
                order_date: now.toISOString(),
                welcome_coupon_applied: welcomeCouponApplied,
                welcome_coupon_discount: welcomeCouponDiscount
            };

            const { data: createdOrder, error: insertError } = await supabase
                .from('orders')
                .insert([orderPayload])
                .select()
                .single();

            if (insertError) {
                console.error('Order creation failed:', insertError);
                return NextResponse.redirect(`${appUrl}/cart?error=order_creation_failed&details=${encodeURIComponent(insertError.message)}`, 303);
            }

            inserted = createdOrder;
        }

        // 3. Clear cart? 
        const userIdForCart = orderData?.userId || inserted?.user_id;
        if (userIdForCart) {
            await supabase.from('cart').delete().eq('user_id', userIdForCart);
        }

        // 4. Create shipment in iCarry without auto-assignment.
        let trackingId = '';
        if (inserted && !inserted.shipment_id) {
            try {
                const { createShipment } = await import('@/utils/shipping');
                const shipmentResult = await createShipment({
                    ...inserted,
                    id: inserted.id,
                    shipping_data: inserted.shipping_data,
                    payment_method: inserted.payment_method,
                    total_amount: inserted.total_amount,
                });
                console.log(`[Payment Success] Shipment creation result for order ${inserted.id}:`, shipmentResult);
                if (shipmentResult.success) {
                    trackingId = shipmentResult.trackingId || '';
                    // Update order with tracking ID and unassigned iCarry shipment details.
                    const { error: updateError } = await supabase.from('orders').update({
                        tracking_id: trackingId,
                        shipment_id: shipmentResult.shipment_id || null,
                        awb_code: shipmentResult.awb_code || null,
                        courier_name: shipmentResult.courier_name || null,
                        label_url: shipmentResult.label_url || null,
                        delivery_status: shipmentResult.delivery_status || 'Unassigned'
                    }).eq('id', inserted.id);

                    if (updateError) {
                        console.error(`[Payment Success] Failed to update order ${inserted.id} with tracking info:`, updateError);
                    }
                } else {
                    console.error(`[Payment Success] Shipment creation failed for order ${inserted.id}:`, shipmentResult.message);
                    await supabase.from('orders').update({
                        delivery_status: `Sync Failed: ${shipmentResult.message || 'unknown error'}`.slice(0, 255)
                    }).eq('id', inserted.id);
                }
            } catch (shipError) {
                console.error('[Payment Success] Shipment creation exception:', shipError);
                await supabase.from('orders').update({
                    delivery_status: `Sync Failed: ${(shipError as Error).message || 'exception'}`.slice(0, 255)
                }).eq('id', inserted.id);
            }
        } else if (inserted?.shipment_id) {
            trackingId = inserted.tracking_id || '';
            console.log(`[Payment Success] Shipment already exists for order ${inserted.id}, skipping re-creation.`);
        }

        // 5. Update transaction status and link to order
        // We match by 'id' because that's what we sent as 'txnid' to Easebuzz
        const paymentMethod = inserted?.payment_method || orderData?.paymentMethod || 'online';
        const orderIdentifier = inserted?.order_id || null;

        await supabase.from('transactions').update({
            status: 'success',
            txn_id: txnIdStr,
            order_id: orderIdentifier,
            payment_method: paymentMethod
        }).eq('id', Number(txnIdStr));

        // 6. Redirect to Order page or Profile
        return NextResponse.redirect(`${appUrl}/profile?toast=order_success#orders`, 303);

    } catch (err) {
        console.error('Payment success exception:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
